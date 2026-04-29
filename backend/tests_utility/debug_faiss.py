import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.append(os.getcwd())

from chat.pipeline import rag
from django.conf import settings
import faiss
import pickle
import numpy as np
from pathlib import Path
from rag.embeddings import embed_query

def debug_faiss_search(query_text):
    print(f"\n--- DEBUG FAISS pour : '{query_text}' ---")
    
    store_path = Path(settings.RAG_VECTOR_STORE_PATH)
    index = faiss.read_index(str(store_path / 'index.faiss'))
    with open(store_path / 'metadata.pkl', 'rb') as f:
        metadata = pickle.load(f)
    
    print(f"Index total vectors: {index.ntotal}")
    
    query_vec = np.array([embed_query(query_text)], dtype='float32')
    distances, indices = index.search(query_vec, 5)
    
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0: continue
        score = 1 / (1 + dist)
        doc = metadata[idx]
        print(f"Doc: {doc['title']} | Dist: {dist:.4f} | Score: {score:.4f}")
        # print(f"Content: {doc['content'][:100]}...")

if __name__ == "__main__":
    debug_faiss_search("FOFIFA 174")
    debug_faiss_search("Makalioka")
    debug_faiss_search("Analamanga")
