"""
Génération des embeddings et construction du vector store FAISS.

Utilise fastembed (ONNX Runtime) — pas de PyTorch :
  • image Docker légère (~400 MB au lieu de 1,2 GB avec torch)
  • RAM ~180 MB au lieu de ~600 MB → tient sur Render free tier (512 MB)
  • même modèle multilingue (fr/mg/en) que sentence-transformers, juste un autre runtime

Usage CLI :
    python -m rag.embeddings --build
"""
import json
import logging
import pickle
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

DOCUMENTS_DIR = Path(__file__).parent / 'data' / 'documents'
KNOWLEDGE_BASE_DIR = Path(__file__).parent / 'data' / 'knowledge_base'
VECTOR_STORE_DIR = Path(__file__).parent / 'data' / 'vector_store'

# Modèle multilingue (fr/mg/en), 384 dimensions, ~120 MB en ONNX.
EMBEDDING_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'

CHUNK_SIZE = 512
CHUNK_OVERLAP = 64


@lru_cache(maxsize=1)
def _get_model():
    """Charge le modèle ONNX une seule fois par worker (cache process-level)."""
    from fastembed import TextEmbedding
    logger.info("Chargement du modèle ONNX : %s", EMBEDDING_MODEL)
    return TextEmbedding(model_name=EMBEDDING_MODEL)


def embed_documents(texts: list) -> list:
    """Encode une liste de textes (utilisé à l'indexation)."""
    model = _get_model()
    return list(model.embed(texts))


def embed_query(text: str) -> list:
    """Encode une requête utilisateur (utilisé au runtime)."""
    model = _get_model()
    return next(iter(model.embed([text])))


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list:
    """Découpe un texte en chunks avec chevauchement."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(' '.join(words[start:end]))
        start += chunk_size - overlap
    return chunks


def build_index(documents: list = None) -> None:
    """
    Construit le vector store FAISS à partir des documents.

    Args:
        documents : liste de dicts ou None (charge depuis DOCUMENTS_DIR + KNOWLEDGE_BASE_DIR)
    """
    try:
        import faiss
        import numpy as np
    except ImportError as e:
        logger.error("Dépendances manquantes : %s. Installer avec requirements/production.txt", e)
        return

    if documents is None:
        documents = []
        # 1. Documents scrapés depuis le web
        for doc_file in DOCUMENTS_DIR.glob('*.json'):
            with open(doc_file, encoding='utf-8') as f:
                documents.append(json.load(f))
        # 2. Knowledge base locale (priorité haute — toujours incluse)
        if KNOWLEDGE_BASE_DIR.exists():
            for doc_file in KNOWLEDGE_BASE_DIR.glob('*.json'):
                with open(doc_file, encoding='utf-8') as f:
                    kb_doc = json.load(f)
                    kb_doc['source'] = kb_doc.get('source', 'knowledge_base')
                    documents.append(kb_doc)
            logger.info(
                "Knowledge base : %d documents chargés",
                len(list(KNOWLEDGE_BASE_DIR.glob('*.json'))),
            )

    if not documents:
        logger.warning(
            "Aucun document trouvé dans %s ni dans %s",
            DOCUMENTS_DIR, KNOWLEDGE_BASE_DIR,
        )
        return

    all_chunks = []
    metadata = []
    for doc in documents:
        for i, chunk in enumerate(chunk_text(doc.get('content', ''))):
            all_chunks.append(chunk)
            metadata.append({
                'doc_id': doc['id'],
                'title': doc['title'],
                'url': doc.get('url', ''),
                'content': chunk,
                'chunk_index': i,
                'topics': doc.get('topics', []),
            })

    logger.info("Encodage de %d chunks via fastembed (ONNX)…", len(all_chunks))
    vectors = embed_documents(all_chunks)
    embeddings = np.array(vectors, dtype='float32')

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(VECTOR_STORE_DIR / 'index.faiss'))
    with open(VECTOR_STORE_DIR / 'metadata.pkl', 'wb') as f:
        pickle.dump(metadata, f)

    logger.info("Index FAISS créé : %d vecteurs de dimension %d", index.ntotal, dimension)


if __name__ == '__main__':
    import argparse

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description='CropGPT RAG Index Builder (fastembed)')
    parser.add_argument('--build', action='store_true', help='Construire le vector store')
    args = parser.parse_args()

    if args.build:
        build_index()
