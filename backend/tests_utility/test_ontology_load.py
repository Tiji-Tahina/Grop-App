import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys

# Add project path
sys.path.append(os.getcwd())

from rag import ontology_graph

def test_ontology():
    print("📂 Testing ontology loading...")

    # Load the graph
    g = ontology_graph.get_graph()

    if g is not None and len(g) > 0:
        print(f"✅ Ontology loaded successfully!")
        print(f"📊 Number of triples found: {len(g)}")

        # Test domain keyword retrieval
        keywords = ontology_graph.get_domain_keywords()
        print(f"\n🏷️ Detected keywords:")
        print(f"  - French: {len(keywords.get('fr', []))} words")
        print(f"  - Malagasy: {len(keywords.get('mg', []))} words")

        if keywords.get('fr'):
            print(f"  Example: {keywords['fr'][:10]}")

        # Test a specific entity (e.g. Rice / Riz)
        facts = ontology_graph.get_facts_block("Riz")
        if facts:
            print(f"\n💡 Facts found for 'Riz':")
            print(facts)
        else:
            print("\n⚠️ No specific facts found for 'Riz'.")

    else:
        print("❌ Loading failed: ontology is empty or not found.")

if __name__ == "__main__":
    test_ontology()
