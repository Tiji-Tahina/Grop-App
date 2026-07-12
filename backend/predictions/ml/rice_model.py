"""
Yield prediction model for Malagasy rice cultivation.

Input features:
- region         : Madagascar region (one-hot encoded)
- altitude_m     : altitude in meters
- area_hectares  : area
- soil_type      : soil type (one-hot)
- irrigation     : irrigated or rainfed crop (bool)
- sri_method     : use of SRI method (bool)
- rainfall_mm    : annual rainfall (mm)
- temp_avg_c     : average temperature (°C)
- n_fertilizer   : nitrogen applied (kg/ha)
- p_fertilizer   : phosphorus applied (kg/ha)

Output: predicted yield in kg/ha

In the absence of real training data, this module returns
estimates based on expert rules calibrated on
FOFIFA/FAO statistics for Madagascar.
"""
import logging

logger = logging.getLogger(__name__)

# Average yield by region/system (kg/ha) — source: MAEP/FAO 2022
BASELINE_YIELDS = {
    'irrigated': {
        'analamanga': 3800, 'vakinankaratra': 3500, 'alaotra_mangoro': 4200,
        'boeny': 3200, 'sofia': 2900, 'default': 3200,
    },
    'rainfed': {
        'analamanga': 2200, 'vakinankaratra': 2000, 'alaotra_mangoro': 2500,
        'boeny': 1800, 'sofia': 1600, 'default': 2000,
    },
}

# Soil type multipliers
SOIL_MULTIPLIERS = {
    'alluvial': 1.15,
    'volcanic': 1.10,
    'clay': 1.05,
    'loam': 1.08,
    'laterite': 0.90,
    'sandy': 0.80,
}

# SRI multiplier
SRI_MULTIPLIER = 1.60  # Average documented gain with SRI in Madagascar


def predict(features: dict) -> dict:
    """
    Returns a rice yield prediction based on expert rules.
    To be replaced by an XGBoost model once data is available.

    Args:
        features: dict with keys described in module header

    Returns:
        dict { predicted_yield_kg_ha, confidence_score, feature_importance, recommendation }
    """
    region = features.get('region', 'default')
    irrigation = bool(features.get('irrigation', False))
    sri_method = bool(features.get('sri_method', False))
    soil_type = features.get('soil_type', 'laterite')
    rainfall_mm = features.get('rainfall_mm', 1200)
    n_fertilizer = features.get('n_fertilizer', 0)

    # 1. Base yield by region and irrigation system
    system = 'irrigated' if irrigation else 'rainfed'
    baselines = BASELINE_YIELDS[system]
    base_yield = baselines.get(region, baselines['default'])

    # 2. Soil adjustment
    soil_mult = SOIL_MULTIPLIERS.get(soil_type, 1.0)
    yield_estimate = base_yield * soil_mult

    # 3. SRI adjustment
    if sri_method:
        yield_estimate *= SRI_MULTIPLIER

    # 4. Rainfall adjustment (for rainfed crops)
    if not irrigation:
        if rainfall_mm < 800:
            yield_estimate *= 0.75
        elif rainfall_mm > 1500:
            yield_estimate *= 1.05

    # 5. Nitrogen fertilization adjustment
    if n_fertilizer > 0:
        n_bonus = min(n_fertilizer / 100, 0.30)  # Max +30% for N
        yield_estimate *= (1 + n_bonus)

    # Confidence score (expert model = moderate confidence)
    confidence = 0.65 if not sri_method else 0.60  # SRI = more variability

    # Simplified feature importance
    feature_importance = {
        'irrigation_system': 0.35,
        'region': 0.20,
        'soil_type': 0.15,
        'sri_method': 0.12,
        'rainfall_mm': 0.10,
        'n_fertilizer': 0.08,
    }

    # Automatic recommendations
    recommendations = _generate_recommendations(features, yield_estimate)

    return {
        'predicted_yield_kg_ha': round(yield_estimate, 1),
        'confidence_score': confidence,
        'feature_importance': feature_importance,
        'recommendation': recommendations,
        'model_type': 'expert_rules',  # Will be 'xgboost' after training
    }


def _generate_recommendations(features: dict, yield_estimate: float) -> str:
    tips = []

    if not features.get('irrigation') and features.get('rainfall_mm', 1200) < 1000:
        tips.append(
            "Insufficient rainfall detected. Consider supplementary irrigation "
            "to secure the crop."
        )

    if not features.get('sri_method'):
        tips.append(
            "Adopting the SRI method (System of Rice Intensification) "
            "can increase yield by 40-80% with less water and seeds."
        )

    if features.get('soil_type') == 'laterite':
        tips.append(
            "Laterite soil: add organic compost (5-10 t/ha) to improve "
            "water retention and fertility."
        )

    if features.get('n_fertilizer', 0) < 30:
        tips.append(
            "Nitrogen fertilization is low. An application of 60-90 kg N/ha in "
            "split doses (tillering + panicle initiation) is recommended."
        )

    if yield_estimate < 2000:
        tips.append(
            "Low predicted yield. Consult a local MAEP technician for a "
            "field diagnosis and access to improved FOFIFA varieties."
        )

    return '\n'.join(f"• {t}" for t in tips) if tips else "Favorable conditions detected."
