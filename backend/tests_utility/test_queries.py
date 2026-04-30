import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import clickhouse_connect
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def test_complex_queries():
    print("🔍 Connexion à ClickHouse CLOUD pour requêtes complexes...")
    
    host = os.getenv('CH_HOST')
    port = int(os.getenv('CH_PORT', 8443))
    user = os.getenv('CH_USER', 'default')
    password = os.getenv('CH_PASSWORD')

    try:
        client = clickhouse_connect.get_client(
            host=host, 
            port=port, 
            username=user, 
            password=password,
            secure=True
        )
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return

    # Requête 1 : Top 5 des régions les plus productrices de Riz en 2024
    print("\n--- 1. Top 5 des régions productrices de Riz (2024) ---")
    query1 = """
    SELECT region, round(production_t, 2) as production_t
    FROM cropgpt.agri_stats
    WHERE culture = 'Riz' AND annee = 2024
    ORDER BY production_t DESC
    LIMIT 5
    """
    res1 = client.query(query1)
    print(pd.DataFrame(res1.result_rows, columns=res1.column_names))

    # Requête 2 : Croissance du rendement de la Vanille entre 2020 et 2024
    print("\n--- 2. Évolution du rendement de la Vanille (Sava) ---")
    query2 = """
    SELECT annee, round(rendement_kg_ha, 2) as rendement_kg_ha, 
           round(rendement_kg_ha - lagInFrame(rendement_kg_ha) OVER (ORDER BY annee), 2) as progression
    FROM cropgpt.agri_stats
    WHERE culture = 'Vanille' AND region = 'Sava'
    ORDER BY annee
    """
    res2 = client.query(query2)
    print(pd.DataFrame(res2.result_rows, columns=res2.column_names))

    # Requête 3 : Analyse multi-dimensionnelle (Moyenne prix et production par culture)
    print("\n--- 3. Analyse globale par culture (OLAP) ---")
    query3 = """
    SELECT culture, 
           round(avg(prix_ar_kg), 2) as prix_moyen,
           round(sum(production_t), 2) as production_totale,
           count() as nb_points_data
    FROM cropgpt.agri_stats
    GROUP BY culture
    ORDER BY production_totale DESC
    """
    res3 = client.query(query3)
    print(pd.DataFrame(res3.result_rows, columns=res3.column_names))

if __name__ == "__main__":
    test_complex_queries()
