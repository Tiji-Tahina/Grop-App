import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys

# Ajouter le chemin du projet
sys.path.append(os.getcwd())

from rag import ontology_graph

def test_ontology():
    print("📂 Test du chargement de l'Ontologie...")
    
    # Charger le graphe
    g = ontology_graph.get_graph()
    
    if g is not None and len(g) > 0:
        print(f"✅ Ontologie chargée avec succès !")
        print(f"📊 Nombre de triplets trouvés : {len(g)}")
        
        # Test de récupération des mots-clés du domaine
        keywords = ontology_graph.get_domain_keywords()
        print(f"\n🏷️ Mots-clés détectés :")
        print(f"  - Français : {len(keywords.get('fr', []))} mots")
        print(f"  - Malagasy : {len(keywords.get('mg', []))} mots")
        
        if keywords.get('fr'):
            print(f"  Exemple : {keywords['fr'][:10]}")
            
        # Test d'une entité spécifique (ex: Rice ou Riz)
        facts = ontology_graph.get_facts_block("Riz")
        if facts:
            print(f"\n💡 Faits trouvés pour 'Riz' :")
            print(facts)
        else:
            print("\n⚠️ Aucun fait spécifique trouvé pour 'Riz'.")
            
    else:
        print("❌ Échec du chargement : l'ontologie est vide ou introuvable.")

if __name__ == "__main__":
    test_ontology()
