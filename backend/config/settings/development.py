"""
Development settings — DEBUG enabled, SQLite, wide CORS.
"""

from dotenv import load_dotenv

load_dotenv()

from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# In dev, emails are displayed in the console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
