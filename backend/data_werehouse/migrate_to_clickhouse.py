import clickhouse_connect
import numpy as np
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add path to import dw_madagascar
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import dw_madagascar

def migrate():
    print("🚀 Connecting to ClickHouse CLOUD...")

    host = os.getenv('CH_HOST')
    port = int(os.getenv('CH_PORT', 8443))
    user = os.getenv('CH_USER', 'default')
    password = os.getenv('CH_PASSWORD')

    if not host or not password:
        print("❌ Error: CH_HOST or CH_PASSWORD not set in .env file")
        return

    try:
        client = clickhouse_connect.get_client(
            host=host,
            port=port,
            username=user,
            password=password,
            secure=True  # Required for ClickHouse Cloud
        )
        print("✅ Connection successful!")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return

    # Schema initialization
    print("📂 Initializing schema...")
    sql_file = Path(__file__).parent / 'init_clickhouse.sql'
    with open(sql_file, 'r') as f:
        sql_commands = f.read().split(';')
        for cmd in sql_commands:
            if cmd.strip():
                client.command(cmd)

    # Extract data from the Numpy cube
    print("📊 Extracting data from cube...")
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
        print(f"📥 Inserting {len(data_to_insert)} rows into ClickHouse Cloud...")
        client.insert('cropgpt.agri_stats', data_to_insert,
                      column_names=['region', 'culture', 'annee', 'rendement_kg_ha', 'production_t', 'prix_ar_kg'])
        print("✅ Cloud migration completed successfully!")
    else:
        print("⚠️ No data to insert.")

if __name__ == "__main__":
    migrate()
