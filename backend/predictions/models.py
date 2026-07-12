from django.db import models
from crops.models import Farm, Crop


class MLModelVersion(models.Model):
    """Registry of deployed ML model versions."""
    name = models.CharField(max_length=100, help_text='Ex: rice_yield_xgboost_v1')
    version = models.CharField(max_length=20)
    crop_type = models.CharField(max_length=30)
    description = models.TextField(blank=True)
    metrics = models.JSONField(default=dict, help_text='R², RMSE, MAE on test set')
    is_active = models.BooleanField(default=False)
    artifact_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('name', 'version')

    def __str__(self):
        return f"{self.name} v{self.version} ({'active' if self.is_active else 'inactive'})"


class Prediction(models.Model):
    """ML prediction result for a given crop."""
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='predictions')
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name='predictions')
    model_version = models.ForeignKey(
        MLModelVersion,
        on_delete=models.SET_NULL,
        null=True,
        related_name='predictions',
    )
    predicted_yield_kg_ha = models.FloatField(help_text='Predicted yield in kg/hectare')
    confidence_score = models.FloatField(help_text='Confidence score [0-1]')
    input_features = models.JSONField(help_text='Features used for prediction')
    feature_importance = models.JSONField(
        default=dict,
        help_text='Relative importance of each feature',
    )
    recommendation = models.TextField(blank=True, help_text='Generated recommendations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"Prediction {self.crop.get_crop_type_display()} — "
            f"{self.predicted_yield_kg_ha:.0f} kg/ha ({self.farm.name})"
        )
