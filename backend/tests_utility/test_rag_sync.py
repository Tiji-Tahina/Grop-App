import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Ajouter le chemin du projet
sys.path.append(os.getcwd())

from chat.pipeline import rag

def test_rag_query(query_text):
    print(f"\n🔍 Test de la requête RAG : '{query_text}'")
    
    # Mock du résultat de l'ontologie pour passer au RAG
    # Le RAG s'attend à un dict venant de ontology.validate_and_enrich
    onto_result = {
        "is_valid": True,
        "language": "fr",
        "enriched_text": query_text,  # Champ requis par rag.py
        "context_tags": ["varieties"],
        "matched_keywords": [query_text], # Pour l'expansion de requête
        "ontology_facts": f"[Fait Ontologique] {query_text} est une variété de riz malgache."
    }
    
    try:
        results = rag.retrieve(onto_result)
        
        print(f"\n📊 Résultats du RAG :")
        print(f"  Niveau de confiance : {results.get('confidence_level')}")
        print(f"  Nombre de documents trouvés : {len(results.get('retrieved_docs', []))}")
        
        for i, doc in enumerate(results.get('retrieved_docs', [])):
            print(f"\n--- Document {i+1} : {doc.get('title')} ---")
            print(f"Source : {doc.get('source')} | Score : {doc.get('score', 0):.2f}")
            # Afficher les 200 premiers caractères du contenu
            content = doc.get('content', '')
            print(f"Extrait : {content[:200]}...")
            
    except Exception as e:
        import traceback
        print(f"❌ Erreur lors du test RAG : {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # Test avec une variété importée d'Obsidian
    test_rag_query("FOFIFA 174")
    
    # Test avec un concept général
    test_rag_query("Vary Makalioka")
    
    # Test avec un sujet climat/région
    test_rag_query("Climat Analamanga")
