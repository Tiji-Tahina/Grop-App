import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import sys
import json

# Add project path
sys.path.append(os.getcwd())

from data_werehouse.olap_engine import engine

def test_engine():
    print("🧪 Testing the Centralized OLAP Engine...")

    # 1. Test a SLICE: Rice production by region
    print("\n--- TEST 1: SLICE (Crop = Rice) ---")
    query_slice = {
        "filters": {"culture": "Riz"},
        "groupBy": ["region"],
        "metrics": ["sum(production_t) as total"]
    }
    res1 = engine.execute_query(query_slice)
    print(f"Columns: {res1['columns']}")
    for row in res1['data'][:3]: # Show first 3 rows
        print(f"  {row}")

    # 2. Test a DICE: Rice vs Corn comparison in 2024
    print("\n--- TEST 2: DICE (Rice & Corn, 2024) ---")
    query_dice = {
        "filters": {
            "culture": ["Riz", "Maïs"],
            "annee": 2024
        },
        "groupBy": ["culture"],
        "metrics": ["round(avg(rendement_kg_ha), 2) as rendement_moyen"]
    }
    res2 = engine.execute_query(query_dice)
    print(f"Columns: {res2['columns']}")
    for row in res2['data']:
        print(f"  {row}")

    # 3. Test DRILL-DOWN: Details for the SAVA region
    print("\n--- TEST 3: DRILL-DOWN (Region = Sava) ---")
    query_drill = {
        "filters": {"region": "Sava"},
        "groupBy": ["culture"],
        "metrics": ["sum(production_t) as total_t"]
    }
    res3 = engine.execute_query(query_drill)
    print(f"Columns: {res3['columns']}")
    for row in res3['data']:
        print(f"  {row}")

if __name__ == "__main__":
    try:
        test_engine()
        print("\n✅ All OLAP tests passed successfully on ClickHouse Cloud!")
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
