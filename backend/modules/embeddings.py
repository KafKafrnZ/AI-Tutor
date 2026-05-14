from sentence_transformers import SentenceTransformer
import numpy as np

# load model once 
model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embeddings(texts):
    return model.encode(texts)