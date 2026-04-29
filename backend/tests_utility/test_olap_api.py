import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys
import json

# Ajouter le chemin du projet
sys.path.append(os.getcwd())

from data_werehouse.olap_engine import engine

def test_engine():
    print("🧪 Test du Moteur OLAP Centralisé...")
    
    # 1. Test d'un SLICE : Production de Riz par région
    print("\n--- TEST 1 : SLICE (Culture = Riz) ---")
    query_slice = {
        "filters": {"culture": "Riz"},
        "groupBy": ["region"],
        "metrics": ["sum(production_t) as total"]
    }
    res1 = engine.execute_query(query_slice)
    print(f"Colonnes : {res1['columns']}")
    for row in res1['data'][:3]: # Voir les 3 premiers
        print(f"  {row}")

    # 2. Test d'un DICE : Comparaison Riz/Maïs en 2024
    print("\n--- TEST 2 : DICE (Riz & Maïs, 2024) ---")
    query_dice = {
        "filters": {
            "culture": ["Riz", "Maïs"],
            "annee": 2024
        },
        "groupBy": ["culture"],
        "metrics": ["round(avg(rendement_kg_ha), 2) as rendement_moyen"]
    }
    res2 = engine.execute_query(query_dice)
    print(f"Colonnes : {res2['columns']}")
    for row in res2['data']:
        print(f"  {row}")

    # 3. Test de DRILL-DOWN : Détails pour la région SAVA
    print("\n--- TEST 3 : DRILL-DOWN (Région = Sava) ---")
    query_drill = {
        "filters": {"region": "Sava"},
        "groupBy": ["culture"],
        "metrics": ["sum(production_t) as total_t"]
    }
    res3 = engine.execute_query(query_drill)
    print(f"Colonnes : {res3['columns']}")
    for row in res3['data']:
        print(f"  {row}")

if __name__ == "__main__":
    try:
        test_engine()
        print("\n✅ Tous les tests OLAP sont passés avec succès sur ClickHouse Cloud !")
    except Exception as e:
        print(f"\n❌ Erreur pendant le test : {e}")
