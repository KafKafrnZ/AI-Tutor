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
VECTOR_WEIGHT = float(os.getenv("RAG_VECTOR_WEIGHT", "0.7"))
KEYWORD_WEIGHT = float(os.getenv("RAG_KEYWORD_WEIGHT", "0.3"))
# Chunks whose cosine similarity to the query is below this are not evidence and are dropped, so an off-corpus
# question gets no context instead of the nearest unrelated rows. Measured 2026-11-27 with bge-small-en-v1.5 on the
# 32-query smoke set (scripts/eval_retrieval.py): best-match similarity of answerable queries 0.672-0.878, of
# unanswerable ones 0.520-0.744. The ranges OVERLAP (near misses such as "SSH port" vs the corpus's "HTTP port"
# score 0.744), so no threshold is right for both. 0.75 keeps every unanswerable query out and drops 6 of 20
# answerable ones: wrong evidence is worse than none here. A cross-encoder reranker is the fix for the overlap.
# Re-calibrate whenever the embedding model or the corpus changes.
MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.75"))
# Keyword-only fallback (vector store down): share of query tokens that must appear in a document.
MIN_KEYWORD_OVERLAP = float(os.getenv("RAG_MIN_KEYWORD_OVERLAP", "0.5"))
# Two returned chunks whose token sets overlap at least this much count as the same item; only the best is kept.
DEDUP_JACCARD = float(os.getenv("RAG_DEDUP_JACCARD", "0.85"))

_client = None
_collection = None
_embedding_function = None
_embedding_model_name = "unset"
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


class FastEmbedFunction:
    """Chroma embedding function backed by FastEmbed.

    chromadb 0.5.x ships no FastEmbed adapter (the old import of ``FastEmbedEmbeddingFunction`` always raised
    ImportError, so every deploy silently ran Chroma's default all-MiniLM-L6-v2). This wraps FastEmbed directly.
    """

    def __init__(self, model_name: str):
        from fastembed import TextEmbedding

        self.model_name = model_name
        self._model = TextEmbedding(model_name=model_name)

    def __call__(self, input: list[str]) -> list[list[float]]:  # Chroma calls this with a keyword named `input`
        return [vector.tolist() for vector in self._model.embed(list(input))]


def _get_embedding_function():
    global _embedding_function, _embedding_model_name
    if _embedding_function is not None:
        return _embedding_function

    try:
        _embedding_function = FastEmbedFunction(settings.RAG_EMBEDDING_MODEL)
        _embedding_model_name = settings.RAG_EMBEDDING_MODEL
    except Exception as exc:
        # Loud on purpose: a different model changes every retrieval score and the MIN_SIMILARITY calibration.
        logger.warning(
            "FastEmbed model %s unavailable (%s); falling back to Chroma default all-MiniLM-L6-v2. "
            "Retrieval quality and RAG_MIN_SIMILARITY calibration do not hold for this model.",
            settings.RAG_EMBEDDING_MODEL,
            exc,
        )
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        _embedding_function = DefaultEmbeddingFunction()
        _embedding_model_name = "all-MiniLM-L6-v2 (chroma default)"
    return _embedding_function


def active_embedding_model() -> str:
    """Name of the embedding model retrieval is actually using (after any fallback)."""
    _get_embedding_function()
    return _embedding_model_name


def _collection_name() -> str:
    # One collection per embedding model. bge-small and MiniLM both produce 384-dim vectors, so Chroma would
    # happily mix them in one collection and return garbage similarities; a per-model name makes that impossible.
    slug = re.sub(r"[^a-z0-9]+", "-", active_embedding_model().casefold()).strip("-")[:40]
    return f"{settings.RAG_COLLECTION_NAME}__{slug}"[:63]


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
        name=_collection_name(),
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
    # Only a real citation becomes "Source:". The placeholder corpus has exam/year labels with no source behind them;
    # showing those to the model as a source invites answers like "asked in UPSC 2020" that nobody can verify.
    if item.get("source"):
        parts.append(f"Source: {item['source']}")
    return "\n".join(part for part in parts if part.strip())


def add_document(text: str, metadata: dict[str, Any] | None = None) -> int:
    """Chunk and index a document. Duplicate chunks are skipped by SHA256."""
    collection = _get_collection()
    added = 0

    for index, chunk in enumerate(_chunk(text)):
        doc_id = _sha(chunk)
        if collection.get(ids=[doc_id]).get("ids"):
            continue

        chunk_metadata = _clean_metadata({**(metadata or {}), "chunk_index": index})
        collection.add(documents=[chunk], ids=[doc_id], metadatas=[chunk_metadata])
        added += 1

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


def _distance_to_similarity(distance: float | None) -> float:
    if distance is None:
        return 0.0
    return max(0.0, 1.0 - float(distance))


def _keyword_overlap(query: str, document: str) -> float:
    query_tokens = _tokens(query)
    if not query_tokens:
        return 0.0
    return len(query_tokens & _tokens(document)) / len(query_tokens)


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b)


def _dedupe(ranked: list[str], k: int) -> list[str]:
    """Keep the best-ranked copy of near-identical chunks, so k slots hold k different items."""
    kept: list[str] = []
    kept_tokens: list[set[str]] = []
    for document in ranked:
        tokens = _tokens(document)
        if any(_jaccard(tokens, other) >= DEDUP_JACCARD for other in kept_tokens):
            continue
        kept.append(document)
        kept_tokens.append(tokens)
        if len(kept) == k:
            break
    return kept


def _rank_keyword(query: str, documents: list[str], k: int) -> list[str]:
    scored = [
        (_keyword_overlap(query, document), document)
        for document in documents
        if document
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    # No "return everything" fallback: a document that shares too few query words is not evidence.
    relevant = [document for score, document in scored if score >= MIN_KEYWORD_OVERLAP]
    return _dedupe(relevant, k)


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


def retrieve(query: str, k: int = 8) -> list[str]:
    """Hybrid search: vector similarity plus keyword overlap.

    Returns at most k distinct chunks with vector similarity >= MIN_SIMILARITY, best first. An empty list means
    the corpus has nothing relevant, and callers must treat it that way (not as "use whatever is closest").
    """
    return [document for _, document in retrieve_scored(query, k)]


def retrieve_scored(query: str, k: int = 8) -> list[tuple[float, str]]:
    """Like retrieve, but returns (vector_similarity, chunk) pairs. Keyword-fallback results have similarity 0.0."""
    query = (query or "").strip()
    if not query:
        return []

    try:
        collection = _get_collection()
        count = collection.count()
        if count == 0:
            logger.info("RAG collection is empty; using PYQ JSON keyword fallback")
            return [(0.0, document) for document in _json_keyword_fallback(query, k)]

        # Over-fetch so that, after duplicates are collapsed, k distinct items can still remain.
        n_results = min(k * 5, count)
        results = collection.query(query_texts=[query], n_results=n_results)
        documents = (results.get("documents") or [[]])[0] or []
        distances = (results.get("distances") or [[]])[0] or []

        if not documents:
            return [(0.0, document) for document in _keyword_fallback(query, k)]

        scored: list[tuple[float, float, str]] = []
        for document, distance in zip(documents, distances):
            vector_score = _distance_to_similarity(distance)
            if vector_score < MIN_SIMILARITY:
                continue
            keyword_score = _keyword_overlap(query, document)
            hybrid_score = (VECTOR_WEIGHT * vector_score) + (KEYWORD_WEIGHT * keyword_score)
            scored.append((hybrid_score, vector_score, document))

        # The vector store answered: an empty list now means "nothing relevant", not "store broken", so do NOT
        # fall back to keyword search (that would bring the unrelated rows back).
        scored.sort(key=lambda item: item[0], reverse=True)
        similarity = {document: vector_score for _, vector_score, document in scored}
        kept = _dedupe([document for _, _, document in scored], k)
        return [(similarity[document], document) for document in kept]
    except Exception as exc:
        logger.warning("Vector search failed (%s); falling back to keyword", exc)
        return [(0.0, document) for document in _keyword_fallback(query, k)]
