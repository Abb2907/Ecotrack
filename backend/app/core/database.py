from google.cloud import firestore

from app.core.config import settings

# Initializes the asynchronous Firestore client
# When running locally, it automatically respects the FIRESTORE_EMULATOR_HOST env variable.
db = firestore.AsyncClient(project=settings.PROJECT_ID)
