import os
import re
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

# Whitelists for SQL safety — any column/metric not in these sets is rejected.
_ALLOWED_COLUMNS = frozenset({
    'region', 'culture', 'annee', 'mois', 'type_sol', 'variete', 'saison',
})
_ALLOWED_MEASURES = frozenset({
    'rendement_kg_ha', 'production_t', 'prix_ar_kg', 'surface_ha',
})
_ALLOWED_AGG = frozenset({'sum', 'avg', 'count', 'min', 'max'})

_CLICKHOUSE_TYPES = {
    str: 'String',
    int: 'Int32',
    float: 'Float64',
    bool: 'UInt8',
}


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
            # Timeouts indispensables : sans eux, un CH injoignable bloque
            # le pipeline chat indéfiniment (le user voit "loading" sans fin).
            # connect_timeout : ouverture TCP/TLS. send_receive_timeout : durée
            # max d'une requête une fois connecté.
            self._client = clickhouse_connect.get_client(
                host=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                secure=True,
                connect_timeout=5,
                send_receive_timeout=15,
            )
        return self._client

    @staticmethod
    def _validate_metric(metric: str) -> str:
        """Validate a metric expression against the whitelist."""
        metric = metric.strip()
        m = re.fullmatch(r'(sum|avg|count|min|max)\((\w+)\)', metric)
        if m:
            func, col = m.group(1), m.group(2)
            if func in _ALLOWED_AGG and col in _ALLOWED_MEASURES:
                return metric
        if metric in _ALLOWED_MEASURES:
            return metric
        raise ValueError(f"Disallowed metric: {metric!r}")

    @staticmethod
    def _validate_column(col: str) -> str:
        """Validate a column name against the whitelist."""
        if col not in _ALLOWED_COLUMNS:
            raise ValueError(f"Disallowed column: {col!r}")
        return col

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

        # Validate metrics
        metrics = params.get('metrics', ['sum(production_t) as total_production'])
        validated_metrics = [self._validate_metric(m) for m in metrics]
        metrics_sql = ", ".join(validated_metrics)

        # Validate group-by columns
        group_by_cols = params.get('groupBy', ['region'])
        for col in group_by_cols:
            self._validate_column(col)
        group_by_sql = ", ".join(group_by_cols)

        # Build WHERE clause with parameterized values
        filters = params.get('filters', {})
        where_parts = []
        query_params = {}
        for i, (key, value) in enumerate(filters.items()):
            self._validate_column(key)
            if isinstance(value, list):
                placeholders = []
                for j, v in enumerate(value):
                    pname = f"f_{i}_{j}"
                    vtype = _CLICKHOUSE_TYPES.get(type(v), 'String')
                    placeholders.append("{" + pname + ":" + vtype + "}")
                    query_params[pname] = v
                where_parts.append(f"{key} IN ({', '.join(placeholders)})")
            else:
                pname = f"f_{i}"
                vtype = _CLICKHOUSE_TYPES.get(type(value), 'String')
                where_parts.append(f"{key} = " + "{" + pname + ":" + vtype + "}")
                query_params[pname] = value

        where_sql = " AND ".join(where_parts) if where_parts else "1=1"

        query = (
            f"SELECT {group_by_sql}, {metrics_sql} "
            f"FROM cropgpt.agri_stats "
            f"WHERE {where_sql} "
            f"GROUP BY {group_by_sql} "
            f"ORDER BY {group_by_sql}"
        )

        result = client.query(query, parameters=query_params)

        return {
            "columns": result.column_names,
            "data": result.result_rows,
        }

# Instance unique (Singleton)
engine = OLAPEngine()
