-- Initialisation du Data Warehouse CropGPT sur ClickHouse
CREATE DATABASE IF NOT EXISTS cropgpt;

USE cropgpt;

-- Table principale des statistiques agricoles (OLAP)
CREATE TABLE IF NOT EXISTS agri_stats (
    region String,
    culture String,
    annee UInt16,
    rendement_kg_ha Float32,
    production_t Float32,
    prix_ar_kg Float32,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (region, culture, annee);

-- Vue matérialisée pour les moyennes par région (accélération des requêtes tableau de bord)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_summary
ENGINE = SummingMergeTree()
ORDER BY (region, culture)
AS SELECT
    region,
    culture,
    avg(rendement_kg_ha) as avg_rendement,
    sum(production_t) as total_production
FROM agri_stats
GROUP BY region, culture;
