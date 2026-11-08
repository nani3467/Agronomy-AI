from rest_framework import serializers
from .models import PlantScan, CropRecommendation
from .disease_data import get_disease_details
from .crop_data import get_crop_details


class PlantScanSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)  # MongoDB ObjectId as string
    image_url = serializers.SerializerMethodField()
    symptoms = serializers.SerializerMethodField()
    causes = serializers.SerializerMethodField()
    spread = serializers.SerializerMethodField()
    safety_precautions = serializers.SerializerMethodField()
    prevention = serializers.SerializerMethodField()
    crop_damage = serializers.SerializerMethodField()
    organic_treatment = serializers.SerializerMethodField()
    chemical_treatment = serializers.SerializerMethodField()

    class Meta:
        model = PlantScan
        fields = [
            'id', 'image', 'image_url', 'disease_name', 'status',
            'accuracy', 'organic_treatment', 'chemical_treatment',
            'symptoms', 'causes', 'spread', 'safety_precautions',
            'prevention', 'crop_damage', 'created_at'
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            try:
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except Exception:
                return None
        return None

    def _get_detail_field(self, obj, field_name):
        val = getattr(obj, field_name, None)
        if val and str(val).strip():
            return val
        details = get_disease_details(obj.disease_name)
        return details.get(field_name, '')

    def get_symptoms(self, obj):
        return self._get_detail_field(obj, 'symptoms')

    def get_causes(self, obj):
        return self._get_detail_field(obj, 'causes')

    def get_spread(self, obj):
        return self._get_detail_field(obj, 'spread')

    def get_safety_precautions(self, obj):
        return self._get_detail_field(obj, 'safety_precautions')

    def get_prevention(self, obj):
        return self._get_detail_field(obj, 'prevention')

    def get_crop_damage(self, obj):
        return self._get_detail_field(obj, 'crop_damage')

    def get_organic_treatment(self, obj):
        return self._get_detail_field(obj, 'organic_treatment')

    def get_chemical_treatment(self, obj):
        return self._get_detail_field(obj, 'chemical_treatment')


class CropRecommendationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)  # MongoDB ObjectId as string
    emoji = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    soil_conditions = serializers.SerializerMethodField()
    growing_info = serializers.SerializerMethodField()
    fertilizer_guidance = serializers.SerializerMethodField()
    water_requirements = serializers.SerializerMethodField()
    ideal_ph_range = serializers.SerializerMethodField()
    ideal_temp_range = serializers.SerializerMethodField()
    harvest_duration = serializers.SerializerMethodField()
    market_tips = serializers.SerializerMethodField()

    class Meta:
        model = CropRecommendation
        fields = [
            'id', 'nitrogen', 'phosphorus', 'potassium',
            'temperature', 'humidity', 'ph', 'rainfall',
            'recommended_crop', 'confidence', 'description',
            'emoji', 'category', 'soil_conditions', 'growing_info',
            'fertilizer_guidance', 'water_requirements',
            'ideal_ph_range', 'ideal_temp_range', 'harvest_duration',
            'market_tips', 'created_at'
        ]

    def _get_crop_field(self, obj, field_name):
        val = getattr(obj, field_name, None)
        if val and str(val).strip():
            return val
        details = get_crop_details(obj.recommended_crop)
        return details.get(field_name, '')

    def get_emoji(self, obj):
        return get_crop_details(obj.recommended_crop).get('emoji', '🌾')

    def get_category(self, obj):
        return get_crop_details(obj.recommended_crop).get('category', 'Field Crop')

    def get_soil_conditions(self, obj):
        return self._get_crop_field(obj, 'soil_conditions')

    def get_growing_info(self, obj):
        return self._get_crop_field(obj, 'growing_info')

    def get_fertilizer_guidance(self, obj):
        return self._get_crop_field(obj, 'fertilizer_guidance')

    def get_water_requirements(self, obj):
        return self._get_crop_field(obj, 'water_requirements')

    def get_ideal_ph_range(self, obj):
        return get_crop_details(obj.recommended_crop).get('ideal_ph_range', '')

    def get_ideal_temp_range(self, obj):
        return get_crop_details(obj.recommended_crop).get('ideal_temp_range', '')

    def get_harvest_duration(self, obj):
        return get_crop_details(obj.recommended_crop).get('harvest_duration', '')

    def get_market_tips(self, obj):
        return get_crop_details(obj.recommended_crop).get('market_tips', '')
