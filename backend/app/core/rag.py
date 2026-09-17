import hashlib
import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_ROOT / "data"
PYQS_PATH = DATA_DIR / "pyqs.json"

CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
RERANK_MODEL = os.getenv("RAG_RERANK_MODEL", "Xenova/ms-marco-MiniLM-L-6-v2")

_client = None
_collection = None
_embedding_function = None
_fusion_retriever = None
_fusion_retriever_fetch_k = None
_reranker = None
_WORD_RE = re.compile(r"[a-z0-9]+(?:['-][a-z0-9]+)?")


def _tokens(text: str) -> set[str]:
    return set(_WORD_RE.findall((text or "").casefold()))


def _chunk(text: str) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+|\n{2,}", text)
        if sentence.strip()
    ]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        if len(sentence) > CHUNK_SIZE:
            if current:
                chunks.append(" ".join(current))
                current, current_len = [], 0

            step = max(CHUNK_SIZE - CHUNK_OVERLAP, 1)
            for start in range(0, len(sentence), step):
                piece = sentence[start : start + CHUNK_SIZE].strip()
                if piece:
                    chunks.append(piece)
            continue

        if current_len + len(sentence) > CHUNK_SIZE and current:
            chunks.append(" ".join(current))
            overlap: list[str] = []
            overlap_len = 0
            for item in reversed(current):
                if overlap_len + len(item) > CHUNK_OVERLAP:
                    break
                overlap.insert(0, item)
                overlap_len += len(item)
            current, current_len = overlap, overlap_len

        current.append(sentence)
        current_len += len(sentence)

    if current:
        chunks.append(" ".join(current))

    return chunks


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _clean_metadata(metadata: dict[str, Any] | None) -> dict[str, str | int | float | bool]:
    clean: dict[str, str | int | float | bool] = {}
    for key, value in (metadata or {}).items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            clean[str(key)] = value
        else:
            clean[str(key)] = json.dumps(value, ensure_ascii=True)
    return clean or {"source": "unknown"}


def _path_is_relative_to(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def _resolve_chroma_path() -> Path:
    raw_path = settings.RAG_CHROMA_PATH
    chroma_path = Path(raw_path)
    if not chroma_path.is_absolute() and not raw_path.startswith("/"):
        chroma_path = BACKEND_ROOT / chroma_path
    return chroma_path


def validate_chroma_persistence_config() -> Path:
    chroma_path = _resolve_chroma_path()
    volume_mount = getattr(settings, "RAILWAY_VOLUME_MOUNT_PATH", "")

    if not settings.RAG_REQUIRE_PERSISTENT_CHROMA:
        return chroma_path

    if volume_mount and not _path_is_relative_to(chroma_path, Path(volume_mount)):
        raise RuntimeError(
            "RAG_CHROMA_PATH must live under the Railway volume mount when "
            "RAG_REQUIRE_PERSISTENT_CHROMA is enabled. "
            f"Current path: {chroma_path}. "
            f"Railway volume mount: {volume_mount}. "
            "Set RAG_CHROMA_PATH=$RAILWAY_VOLUME_MOUNT_PATH/chroma."
        )

    if _path_is_relative_to(chroma_path, BACKEND_ROOT):
        raise RuntimeError(
            "RAG_CHROMA_PATH points inside the application directory, which is "
            "ephemeral on Railway/container deploys. Attach a Railway volume and "
            "set RAG_CHROMA_PATH to $RAILWAY_VOLUME_MOUNT_PATH/chroma, or disable "
            "RAG_REQUIRE_PERSISTENT_CHROMA only for local development."
        )

    return chroma_path


def _get_embedding_function():
    global _embedding_function
    if _embedding_function is not None:
        return _embedding_function

    try:
        from chromadb.utils.embedding_functions import FastEmbedEmbeddingFunction

        _embedding_function = FastEmbedEmbeddingFunction(model_name=settings.RAG_EMBEDDING_MODEL)
    except Exception as exc:
        logger.info("FastEmbed unavailable for Chroma (%s); using Chroma default embedding", exc)
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        _embedding_function = DefaultEmbeddingFunction()
    return _embedding_function


def _make_chroma_embedding_adapter(chroma_embed_fn: Any):
    """Wraps whichever Chroma embedding function is already configured, so
    LlamaIndex's query-time embeddings stay compatible with what's stored
    (FastEmbed if available, otherwise Chroma's ONNX default)."""
    from llama_index.core.bridge.pydantic import PrivateAttr
    from llama_index.core.embeddings import BaseEmbedding

    class ChromaEmbeddingAdapter(BaseEmbedding):
        _chroma_embed_fn: Any = PrivateAttr()

        def __init__(self, fn: Any, **kwargs: Any) -> None:
            super().__init__(**kwargs)
            self._chroma_embed_fn = fn

        def _get_query_embedding(self, query: str) -> list[float]:
            return list(self._chroma_embed_fn([query])[0])

        def _get_text_embedding(self, text: str) -> list[float]:
            return list(self._chroma_embed_fn([text])[0])

        def _get_text_embeddings(self, texts: list[str]) -> list[list[float]]:
            return [list(vec) for vec in self._chroma_embed_fn(texts)]

        async def _aget_query_embedding(self, query: str) -> list[float]:
            return self._get_query_embedding(query)

        async def _aget_text_embedding(self, text: str) -> list[float]:
            return self._get_text_embedding(text)

    return ChromaEmbeddingAdapter(chroma_embed_fn)


def _make_fastembed_reranker(model_name: str, top_n: int):
    """Cross-encoder reranking via FastEmbed (ONNX). Reuses the ONNX-first
    embedding stack already in this project instead of adding
    sentence-transformers/torch just for reranking."""
    from fastembed.rerank.cross_encoder import TextCrossEncoder
    from llama_index.core.bridge.pydantic import PrivateAttr
    from llama_index.core.postprocessor.types import BaseNodePostprocessor
    from llama_index.core.schema import NodeWithScore, QueryBundle

    class FastEmbedRerank(BaseNodePostprocessor):
        top_n: int
        _encoder: Any = PrivateAttr()

        def __init__(self, **kwargs: Any) -> None:
            super().__init__(**kwargs)
            self._encoder = TextCrossEncoder(model_name=model_name)

        @classmethod
        def class_name(cls) -> str:
            return "FastEmbedRerank"

        def _postprocess_nodes(
            self,
            nodes: list[NodeWithScore],
            query_bundle: QueryBundle | None = None,
        ) -> list[NodeWithScore]:
            if not nodes or query_bundle is None:
                return nodes[: self.top_n]

            documents = [node.node.get_content() for node in nodes]
            scores = list(self._encoder.rerank(query_bundle.query_str, documents))
            for node, score in zip(nodes, scores):
                node.score = float(score)

            nodes.sort(key=lambda node: node.score or 0.0, reverse=True)
            return nodes[: self.top_n]

    return FastEmbedRerank(top_n=top_n)


def get_chroma_client():
    """Return the shared Chroma persistent client (creates on first use)."""
    global _client
    if _client is None:
        from chromadb import PersistentClient

        chroma_path = validate_chroma_persistence_config()
        chroma_path.mkdir(parents=True, exist_ok=True)
        _client = PersistentClient(path=str(chroma_path))
    return _client


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    _client = get_chroma_client()
    _collection = _client.get_or_create_collection(
        name=settings.RAG_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
        embedding_function=_get_embedding_function(),
    )
    return _collection


def format_pyq_record(item: dict[str, Any]) -> str:
    parts = [
        f"Question: {item.get('question', '')}",
        f"Correct Answer: {item.get('correct_answer') or item.get('answer', '')}",
    ]
    if item.get("explanation"):
        parts.append(f"Explanation: {item['explanation']}")
    if item.get("subject") or item.get("topic"):
        parts.append(f"Topic: {item.get('topic') or item.get('subject')}")
    if item.get("exam") or item.get("year"):
        parts.append(f"Source: {item.get('exam', 'Government Exam')} {item.get('year', '')}".strip())
    return "\n".join(part for part in parts if part.strip())


def add_document(text: str, metadata: dict[str, Any] | None = None) -> int:
    """Chunk and index a document. Duplicate chunks are skipped by SHA256."""
    global _fusion_retriever
    collection = _get_collection()
    added = 0

    for index, chunk in enumerate(_chunk(text)):
        doc_id = _sha(chunk)
        if collection.get(ids=[doc_id]).get("ids"):
            continue

        chunk_metadata = _clean_metadata({**(metadata or {}), "chunk_index": index})
        collection.add(documents=[chunk], ids=[doc_id], metadatas=[chunk_metadata])
        added += 1

    if added:
        _fusion_retriever = None  # rebuild against the updated corpus on next retrieve()

    return added


def ingest_pyqs(path: str | Path | None = None) -> int:
    pyq_path = Path(path) if path else PYQS_PATH
    with pyq_path.open("r", encoding="utf-8") as handle:
        questions = json.load(handle)

    total = 0
    for item in questions if isinstance(questions, list) else []:
        metadata = {
            "source": "pyqs",
            "exam": item.get("exam", "Government Exam"),
            "subject": item.get("subject", ""),
            "topic": item.get("topic", item.get("subject", "")),
            "year": item.get("year", ""),
        }
        total += add_document(format_pyq_record(item), metadata)
    return total


def _keyword_overlap(query: str, document: str) -> float:
    query_tokens = _tokens(query)
    if not query_tokens:
        return 0.0
    return len(query_tokens & _tokens(document)) / len(query_tokens)


def _rank_keyword(query: str, documents: list[str], k: int) -> list[str]:
    scored = [
        (_keyword_overlap(query, document), document)
        for document in documents
        if document
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    positive = [document for score, document in scored if score > 0]
    return (positive or [document for _, document in scored])[:k]


def _json_keyword_fallback(query: str, k: int) -> list[str]:
    try:
        with PYQS_PATH.open("r", encoding="utf-8") as handle:
            questions = json.load(handle)
    except Exception as exc:
        logger.warning("PYQ JSON fallback unavailable: %s", exc)
        return []

    documents = [
        format_pyq_record(item)
        for item in questions
        if isinstance(item, dict) and item.get("question")
    ]
    return _rank_keyword(query, documents, k)


def _keyword_fallback(query: str, k: int) -> list[str]:
    try:
        documents = _get_collection().get().get("documents") or []
        if documents:
            return _rank_keyword(query, documents, k)
    except Exception as exc:
        logger.warning("Chroma keyword fallback unavailable: %s", exc)
    return _json_keyword_fallback(query, k)


def _build_nodes_from_collection(collection) -> list:
    from llama_index.core.schema import TextNode

    raw = collection.get()
    ids = raw.get("ids") or []
    documents = raw.get("documents") or []
    metadatas = raw.get("metadatas") or []

    return [
        TextNode(id_=doc_id, text=document, metadata=metadata or {})
        for doc_id, document, metadata in zip(ids, documents, metadatas)
        if document
    ]


def _get_fusion_retriever(fetch_k: int):
    """Vector search (Chroma, via the existing collection) + real BM25,
    fused with reciprocal rank fusion instead of a fixed linear blend.
    Cached at module level; add_document() invalidates it on new data."""
    global _fusion_retriever, _fusion_retriever_fetch_k
    if _fusion_retriever is not None and _fusion_retriever_fetch_k == fetch_k:
        return _fusion_retriever

    from llama_index.core import VectorStoreIndex
    from llama_index.core.llms import MockLLM
    from llama_index.core.retrievers import QueryFusionRetriever
    from llama_index.retrievers.bm25 import BM25Retriever
    from llama_index.vector_stores.chroma import ChromaVectorStore

    collection = _get_collection()
    nodes = _build_nodes_from_collection(collection)
    if not nodes:
        return None

    embed_model = _make_chroma_embedding_adapter(_get_embedding_function())
    vector_store = ChromaVectorStore(chroma_collection=collection)
    index = VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)

    vector_retriever = index.as_retriever(similarity_top_k=fetch_k)
    bm25_retriever = BM25Retriever.from_defaults(nodes=nodes, similarity_top_k=fetch_k)

    _fusion_retriever = QueryFusionRetriever(
        [vector_retriever, bm25_retriever],
        similarity_top_k=fetch_k,
        num_queries=1,  # straight fusion of the two retrievers, no LLM-based query expansion
        mode="reciprocal_rerank",
        use_async=False,
        # QueryFusionRetriever resolves an LLM unconditionally at construction time even
        # when num_queries=1 means it's never actually called - MockLLM avoids pulling in
        # a real provider integration package for something that never runs.
        llm=MockLLM(),
    )
    _fusion_retriever_fetch_k = fetch_k
    return _fusion_retriever


def _get_reranker(top_n: int):
    global _reranker
    if _reranker is None or _reranker.top_n != top_n:
        _reranker = _make_fastembed_reranker(RERANK_MODEL, top_n)
    return _reranker


def retrieve(query: str, k: int = 8) -> list[str]:
    """Hybrid search: vector similarity + BM25 (reciprocal rank fusion),
    then cross-encoder reranked."""
    query = (query or "").strip()
    if not query:
        return []

    try:
        from llama_index.core.schema import QueryBundle

        collection = _get_collection()
        count = collection.count()
        if count == 0:
            logger.info("RAG collection is empty; using PYQ JSON keyword fallback")
            return _json_keyword_fallback(query, k)

        fetch_k = min(max(k * 3, k), count)
        fusion_retriever = _get_fusion_retriever(fetch_k)
        if fusion_retriever is None:
            return _keyword_fallback(query, k)

        retrieved = fusion_retriever.retrieve(query)
        reranked = _get_reranker(k).postprocess_nodes(
            retrieved, query_bundle=QueryBundle(query_str=query)
        )
        documents = [node.node.get_content() for node in reranked]
        return documents or _keyword_fallback(query, k)
    except Exception as exc:
        logger.warning("Vector search failed (%s); falling back to keyword", exc)
        return _keyword_fallback(query, k)
