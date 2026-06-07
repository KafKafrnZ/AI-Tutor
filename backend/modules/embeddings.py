from sentence_transformers import SentenceTransformer
import numpy as np

# DEPRECATED: Legacy embeddings (SentenceTransformer).
# Active implementation: app/core/rag.py (Chroma + FastEmbedEmbeddingFunction or default).

# Lazy load to avoid duplicate model in memory + startup cost (was conflicting with rag.py)
_embedding_model = None

def get_embeddings(texts):
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model.encode(texts)