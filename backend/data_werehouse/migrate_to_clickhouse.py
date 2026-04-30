import clickhouse_connect
import numpy as np
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Ajouter le chemin pour importer dw_madagascar
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import dw_madagascar

def migrate():
    print("🚀 Connexion à ClickHouse CLOUD...")
    
    host = os.getenv('CH_HOST')
    port = int(os.getenv('CH_PORT', 8443))
    user = os.getenv('CH_USER', 'default')
    password = os.getenv('CH_PASSWORD')

    if not host or not password:
        print("❌ Erreur : CH_HOST ou CH_PASSWORD non définis dans le fichier .env")
        return

    try:
        client = clickhouse_connect.get_client(
            host=host, 
            port=port, 
            username=user, 
            password=password,
            secure=True  # Obligatoire pour ClickHouse Cloud
        )
        print("✅ Connexion réussie !")
    except Exception as e:
        print(f"❌ Erreur de connexion : {e}")
        return

    # Initialisation du schéma
    print("📂 Initialisation du schéma...")
    sql_file = Path(__file__).parent / 'init_clickhouse.sql'
    with open(sql_file, 'r') as f:
        sql_commands = f.read().split(';')
        for cmd in sql_commands:
            if cmd.strip():
                client.command(cmd)

    # Extraction des données depuis le cube Numpy
    print("📊 Extraction des données du cube...")
    data_to_insert = []
    
    cube = dw_madagascar.cube
    regions = dw_madagascar.REGIONS
    cultures = dw_madagascar.CULTURES
    annees = dw_madagascar.ANNEES

    for ri, region in enumerate(regions):
        for ci, culture in enumerate(cultures):
            for ai, annee in enumerate(annees):
                rendement = cube[ri, ci, ai, 0]
                production = cube[ri, ci, ai, 1]
                prix = cube[ri, ci, ai, 2]
                
                if production > 0:
                    data_to_insert.append([
                        region, culture, annee, 
                        float(rendement), float(production), float(prix)
                    ])

    if data_to_insert:
        print(f"📥 Insertion de {len(data_to_insert)} lignes dans ClickHouse Cloud...")
        client.insert('cropgpt.agri_stats', data_to_insert, 
                      column_names=['region', 'culture', 'annee', 'rendement_kg_ha', 'production_t', 'prix_ar_kg'])
        print("✅ Migration CLOUD terminée avec succès !")
    else:
        print("⚠️ Aucune donnée à insérer.")

if __name__ == "__main__":
    migrate()
