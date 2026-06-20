"""Firestore database client initialization.

Provides a shared asynchronous Firestore client instance used by all
repository classes. Automatically respects the ``FIRESTORE_EMULATOR_HOST``
environment variable for local development.
"""

from google.cloud import firestore

from app.core.config import settings

# Initializes the asynchronous Firestore client
# When running locally, it automatically respects the FIRESTORE_EMULATOR_HOST env variable.
db = firestore.AsyncClient(project=settings.PROJECT_ID)
