"""
Production settings — DEBUG=False, PostgreSQL, HTTPS.
All sensitive values come from environment variables.
"""
import os

import dj_database_url

from .base import *  # noqa

DEBUG = False

ALLOWED_HOSTS = [h for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h]

# At runtime on Render, DATABASE_URL is injected via fromDatabase.connectionString.
# At BUILD time (Docker collectstatic / GitHub Actions), it does not exist → fallback to local SQLite
# so that Django commands that reference settings.DATABASES can still start.
_DATABASE_URL = os.environ.get('DATABASE_URL', '')
if _DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            _DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        ),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': '/tmp/build.sqlite3',
        },
    }

# CORS / CSRF — Netlify frontend origins (comma-separated)
CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o
]
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# WhiteNoise — serves static files without S3 (free tier Render = no persistent disk)
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Render terminates TLS upstream — trust the X-Forwarded-Proto header
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
