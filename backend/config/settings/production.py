"""
Settings de production — DEBUG=False, PostgreSQL, HTTPS.
Toutes les valeurs sensibles viennent des variables d'environnement.
"""
import os

import dj_database_url

from .base import *  # noqa

DEBUG = False

ALLOWED_HOSTS = [h for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h]

# Render injecte DATABASE_URL via fromDatabase.connectionString
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ['DATABASE_URL'],
        conn_max_age=600,
        ssl_require=True,
    )
}

# CORS / CSRF — origines du frontend Netlify (séparées par virgule)
CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o
]
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# WhiteNoise — sert les statiques sans S3 (free tier Render = pas de disque persistant)
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Render termine le TLS en amont — faire confiance au header X-Forwarded-Proto
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
