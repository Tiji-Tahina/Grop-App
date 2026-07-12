from django.conf import settings
from django.db import models

MADAGASCAR_REGIONS = [
    ('analamanga', 'Analamanga'),
    ('vakinankaratra', 'Vakinankaratra'),
    ('itasy', 'Itasy'),
    ('bongolava', 'Bongolava'),
    ('haute_matsiatra', 'Haute Matsiatra'),
    ('amoron_i_mania', "Amoron'i Mania"),
    ('vatovavy', 'Vatovavy'),
    ('fitovinany', 'Fitovinany'),
    ('ihorombe', 'Ihorombe'),
    ('atsimo_atsinanana', 'Atsimo-Atsinanana'),
    ('atsinanana', 'Atsinanana'),
    ('analanjirofo', 'Analanjirofo'),
    ('alaotra_mangoro', 'Alaotra-Mangoro'),
    ('boeny', 'Boeny'),
    ('sofia', 'Sofia'),
    ('betsiboka', 'Betsiboka'),
    ('melaky', 'Melaky'),
    ('atsimo_andrefana', 'Atsimo-Andrefana'),
    ('androy', 'Androy'),
    ('anosy', 'Anosy'),
    ('menabe', 'Menabe'),
    ('diana', 'Diana'),
    ('sava', 'SAVA'),
]

CROP_TYPES = [
    ('rice', 'Riz'),
    ('cassava', 'Manioc'),
    ('maize', 'Maïs'),
    ('vanilla', 'Vanille'),
    ('cloves', 'Girofle'),
    ('coffee', 'Café'),
    ('lychee', 'Litchi'),
    ('other', 'Autre'),
]

SOIL_TYPES = [
    ('laterite', 'Laterite'),
    ('alluvial', 'Alluvial'),
    ('volcanic', 'Volcanic'),
    ('sandy', 'Sandy'),
    ('clay', 'Clay'),
    ('loam', 'Silt'),
]


class Farm(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farms',
    )
    name = models.CharField(max_length=200)
    region = models.CharField(max_length=50, choices=MADAGASCAR_REGIONS)
    area_hectares = models.FloatField(help_text='Area in hectares')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    altitude_m = models.IntegerField(null=True, blank=True, help_text='Altitude in meters')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_region_display()}) — {self.owner.email}"


class Crop(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('growing', 'Growing'),
        ('harvested', 'Harvested'),
        ('failed', 'Failed'),
    ]

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='crops')
    crop_type = models.CharField(max_length=30, choices=CROP_TYPES)
    variety = models.CharField(max_length=100, blank=True, help_text='Specific variety ex: FOFIFA 154')
    soil_type = models.CharField(max_length=30, choices=SOIL_TYPES)
    planted_at = models.DateField()
    expected_harvest = models.DateField()
    actual_harvest = models.DateField(null=True, blank=True)
    actual_yield_kg = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-planted_at']

    def __str__(self):
        return f"{self.get_crop_type_display()} — {self.farm.name}"


class SoilData(models.Model):
    """Soil analysis data associated with a field."""
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='soil_data')
    ph = models.FloatField(null=True, blank=True, help_text='Soil pH (0-14)')
    nitrogen_ppm = models.FloatField(null=True, blank=True)
    phosphorus_ppm = models.FloatField(null=True, blank=True)
    potassium_ppm = models.FloatField(null=True, blank=True)
    organic_matter_percent = models.FloatField(null=True, blank=True)
    moisture_percent = models.FloatField(null=True, blank=True)
    sampled_at = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-sampled_at']

    def __str__(self):
        return f"Soil {self.farm.name} — {self.sampled_at}"
