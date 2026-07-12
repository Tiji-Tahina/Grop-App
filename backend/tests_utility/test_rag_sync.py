import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Add project path
sys.path.append(os.getcwd())

from chat.pipeline import rag

def test_rag_query(query_text):
    print(f"\n🔍 Testing RAG query: '{query_text}'")

    # Mock ontology result to pass to RAG
    # RAG expects a dict from ontology.validate_and_enrich
    onto_result = {
        "is_valid": True,
        "language": "fr",
        "enriched_text": query_text,  # Required field for rag.py
        "context_tags": ["varieties"],
        "matched_keywords": [query_text], # For query expansion
        "ontology_facts": f"[Ontology Fact] {query_text} is a Malagasy rice variety."
    }

    try:
        results = rag.retrieve(onto_result)

        print(f"\n📊 RAG Results:")
        print(f"  Confidence level: {results.get('confidence_level')}")
        print(f"  Number of documents found: {len(results.get('retrieved_docs', []))}")

        for i, doc in enumerate(results.get('retrieved_docs', [])):
            print(f"\n--- Document {i+1}: {doc.get('title')} ---")
            print(f"Source: {doc.get('source')} | Score: {doc.get('score', 0):.2f}")
            # Show first 200 characters of the content
            content = doc.get('content', '')
            print(f"Excerpt: {content[:200]}...")

    except Exception as e:
        import traceback
        print(f"❌ Error during RAG test: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # Test with a variety imported from Obsidian
    test_rag_query("FOFIFA 174")

    # Test with a general concept
    test_rag_query("Vary Makalioka")

    # Test with a climate/region topic
    test_rag_query("Climat Analamanga")
