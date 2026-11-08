from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField


class PlantScan(models.Model):
    id = ObjectIdAutoField(primary_key=True)

    STATUS_CHOICES = [
        ('Healthy', 'Healthy'),
        ('Infected', 'Infected'),
    ]

    image = models.ImageField(upload_to='scans/')
    disease_name = models.CharField(max_length=200)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    accuracy = models.FloatField()
    organic_treatment = models.TextField(blank=True, default='')
    chemical_treatment = models.TextField(blank=True, default='')
    symptoms = models.TextField(blank=True, default='')
    causes = models.TextField(blank=True, default='')
    spread = models.TextField(blank=True, default='')
    safety_precautions = models.TextField(blank=True, default='')
    prevention = models.TextField(blank=True, default='')
    crop_damage = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.disease_name} - {self.status} ({self.accuracy}%)"

    class Meta:
        ordering = ['-created_at']


class CropRecommendation(models.Model):
    id = ObjectIdAutoField(primary_key=True)

    nitrogen = models.FloatField()
    phosphorus = models.FloatField()
    potassium = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    ph = models.FloatField()
    rainfall = models.FloatField()
    recommended_crop = models.CharField(max_length=100)
    confidence = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True, default='')
    soil_conditions = models.TextField(blank=True, default='')
    growing_info = models.TextField(blank=True, default='')
    fertilizer_guidance = models.TextField(blank=True, default='')
    water_requirements = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recommended_crop} (N={self.nitrogen}, P={self.phosphorus}, K={self.potassium})"

    class Meta:
        ordering = ['-created_at']
