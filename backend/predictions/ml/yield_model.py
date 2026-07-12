"""
Generic interface for yield prediction models.
Dispatches to the specific model based on crop type.
"""
from .rice_model import predict as predict_rice


CROP_MODELS = {
    'rice': predict_rice,
}


def predict_yield(crop_type: str, features: dict) -> dict:
    """
    Dispatches the prediction to the correct model based on crop type.

    Args:
        crop_type: crop type ('rice', 'maize', ...)
        features: dict of features (see specific model)

    Returns:
        prediction dict or error if crop not supported
    """
    model_fn = CROP_MODELS.get(crop_type)
    if model_fn is None:
        return {
            'error': f"Model not available for '{crop_type}'. "
                     f"Supported crops: {list(CROP_MODELS.keys())}",
            'predicted_yield_kg_ha': None,
        }
    return model_fn(features)
