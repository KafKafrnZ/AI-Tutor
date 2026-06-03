import json
import logging
import numpy as np
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
from modules.faiss_index import (
    create_index,
    search_index
)

logger = logging.getLogger(__name__)

# Lazy model load (FIX: avoid blocking import + duplicate loads across modules)
_model = None

def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

INDEX_CACHE = None
PYQS_CACHE = None

# Anchor data path to this file's directory so it works no matter the CWD
_PYQS_PATH = Path(__file__).parent.parent / "data" / "pyqs.json"


def load_pyqs():
    try:
        with open(_PYQS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        return data if isinstance(data, list) else []

    except Exception as e:
        logger.error("Error loading pyqs from %s: %s", _PYQS_PATH, e, exc_info=True)
        return []


def initialize_rag(pyqs):
    global INDEX_CACHE, PYQS_CACHE

    try:
        if INDEX_CACHE is not None:
            return INDEX_CACHE, PYQS_CACHE

        questions = [
            item["question"]
            for item in pyqs
            if "question" in item
        ]

        if not questions:
            return None, []

        model = get_embedding_model()
        embeddings = model.encode(
            questions,
            convert_to_numpy=True
        ).astype("float32")

        index = create_index(embeddings)

        INDEX_CACHE = index
        PYQS_CACHE = pyqs

        return index, pyqs

    except Exception as e:
        logger.error("RAG init error: %s", e, exc_info=True)
        return None, []


def search_pyqs(query, pyqs, index, top_k=3):
    try:
        if index is None:
            return []

        model = get_embedding_model()
        query_embedding = model.encode(
            [query],
            convert_to_numpy=True
        ).astype("float32")

        distances, indices = search_index(
            index,
            query_embedding,
            top_k
        )

        results = []

        for rank, idx in enumerate(indices[0]):
            if idx < len(pyqs):
                results.append({
                    "distance": float(distances[0][rank]),
                    "data": pyqs[idx]
                })

        return results

    except Exception as e:
        logger.error("Search error: %s", e, exc_info=True)
        return []