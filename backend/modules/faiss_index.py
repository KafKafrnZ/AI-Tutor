import faiss
import numpy as np
import pickle

def create_index(embeddings):
    embeddings = np.array(embeddings).astype("float32")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings))
    return index

def save_index(index, path="data/faiss.index"):
    faiss.write_index(index, path)

def load_index(path="data/faiss.index"):
    return faiss.read_index(path)

def save_metadata(data, path="data/meta.pkl"):
    with open(path, "wb") as f:
        pickle.dump(data, f)

def load_metadata(path ="data/meta.pkl"):
    with open(path, "rb") as f:
        return pickle.load(f)


def search_index(index, query_vector, k=3):
    query_vector = np.array(query_vector).astype("float32")
    
    distances, indices = index.search(query_vector,k)
    return distances, indices
