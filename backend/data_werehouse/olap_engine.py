import os
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

class OLAPEngine:
    """
    Moteur de requête centralisé pour transformer des demandes JSON 
    en requêtes SQL ClickHouse sécurisées.
    """
    
    def __init__(self):
        self.host = os.getenv('CH_HOST')
        self.port = int(os.getenv('CH_PORT', 8443))
        self.user = os.getenv('CH_USER', 'default')
        self.password = os.getenv('CH_PASSWORD')
        self._client = None

    def get_client(self):
        if not self._client:
            self._client = clickhouse_connect.get_client(
                host=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                secure=True
            )
        return self._client

    def execute_query(self, params):
        """
        Génère et exécute la requête SQL basée sur les paramètres.
        params: {
            'operation': 'slice' | 'dice' | 'drill-down' | 'roll-up',
            'filters': {'culture': 'Riz', 'annee': 2024},
            'groupBy': ['region'],
            'metrics': ['sum(production_t)', 'avg(rendement_kg_ha)']
        }
        """
        client = self.get_client()
        
        metrics_sql = ", ".join(params.get('metrics', ['sum(production_t) as total_production']))
        group_by_sql = ", ".join(params.get('groupBy', ['region']))
        
        # Construction des filtres (WHERE)
        filters = params.get('filters', {})
        where_clauses = []
        for key, value in filters.items():
            if isinstance(value, list):
                # Utiliser IN pour les listes
                formatted_values = ", ".join([f"'{v}'" if isinstance(v, str) else str(v) for v in value])
                where_clauses.append(f"{key} IN ({formatted_values})")
            else:
                # Utiliser = pour les valeurs uniques
                val = f"'{value}'" if isinstance(value, str) else value
                where_clauses.append(f"{key} = {val}")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Assemblage final
        query = f"""
            SELECT {group_by_sql}, {metrics_sql}
            FROM cropgpt.agri_stats
            WHERE {where_sql}
            GROUP BY {group_by_sql}
            ORDER BY {group_by_sql}
        """
        
        result = client.query(query)
        
        # Formatage du résultat pour le frontend (JSON)
        return {
            "columns": result.column_names,
            "data": result.result_rows,
            "query_executed": query # Utile pour le debug
        }

# Instance unique (Singleton)
engine = OLAPEngine()
