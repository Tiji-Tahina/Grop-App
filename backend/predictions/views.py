from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import viewsets

from crops.models import Crop
from .models import Prediction, MLModelVersion
from .serializers import PredictionSerializer, PredictRequestSerializer
from .ml.yield_model import predict_yield
from data_werehouse.olap_engine import engine


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def predict(request):
    """
    POST /api/predictions/predict/
    Lance une prédiction de rendement pour une culture.
    """
    serializer = PredictRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Vérifier que la culture appartient à l'utilisateur
    try:
        crop = Crop.objects.select_related('farm').get(
            pk=data['crop_id'],
            farm__owner=request.user,
        )
    except Crop.DoesNotExist:
        return Response({'error': 'Culture introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    # Construire les features
    features = {
        'region': crop.farm.region,
        'altitude_m': crop.farm.altitude_m or 800,
        'area_hectares': crop.farm.area_hectares,
        'soil_type': crop.soil_type,
        'irrigation': data['irrigation'],
        'sri_method': data['sri_method'],
        'rainfall_mm': data['rainfall_mm'],
        'temp_avg_c': data['temp_avg_c'],
        'n_fertilizer': data['n_fertilizer'],
        'p_fertilizer': data['p_fertilizer'],
    }

    result = predict_yield(crop.crop_type, features)

    if 'error' in result:
        return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)

    # Récupérer le modèle actif (optionnel)
    active_model = MLModelVersion.objects.filter(
        crop_type=crop.crop_type, is_active=True
    ).first()

    # Sauvegarder la prédiction
    prediction = Prediction.objects.create(
        farm=crop.farm,
        crop=crop,
        model_version=active_model,
        predicted_yield_kg_ha=result['predicted_yield_kg_ha'],
        confidence_score=result['confidence_score'],
        input_features=features,
        feature_importance=result.get('feature_importance', {}),
        recommendation=result.get('recommendation', ''),
    )

    return Response(PredictionSerializer(prediction).data, status=status.HTTP_201_CREATED)


class PredictionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PredictionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Prediction.objects.filter(
            farm__owner=self.request.user
        ).select_related('farm', 'crop', 'model_version')


@api_view(['POST'])
@permission_classes([permissions.AllowAny]) # On peut restreindre plus tard
def olap_query(request):
    """
    POST /api/predictions/analytics/
    Point d'entrée unique pour toutes les opérations OLAP (Slice, Dice, etc.)
    """
    try:
        results = engine.execute_query(request.data)
        return Response(results, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
