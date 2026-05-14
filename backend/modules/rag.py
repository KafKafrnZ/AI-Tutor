import json
import numpy as np
import os
from sentence_transformers import SentenceTransformer
from modules.faiss_index import (
    create_index,
    search_index
)

model = SentenceTransformer("all-MiniLM-L6-v2")

INDEX_CACHE = None
PYQS_CACHE = None


def load_pyqs():
    try:
        with open("data/pyqs.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        return data if isinstance(data, list) else []

    except Exception as e:
        print("Error loading pyqs:", e)
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

        embeddings = model.encode(
            questions,
            convert_to_numpy=True
        ).astype("float32")

        index = create_index(embeddings)

        INDEX_CACHE = index
        PYQS_CACHE = pyqs

        return index, pyqs

    except Exception as e:
        print("RAG init error:", e)
        return None, []


def search_pyqs(query, pyqs, index, top_k=3):
    try:
        if index is None:
            return []

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
        print("Search error:", e)
        return []