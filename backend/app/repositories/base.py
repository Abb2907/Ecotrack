from google.cloud import firestore

from app.core.database import db


class BaseRepository:
    def __init__(self) -> None:
        self.db: firestore.AsyncClient = db
        self.users_ref = self.db.collection("users")
        self.actions_ref = self.db.collection("actions")
        self.logs_ref = self.db.collection("logs")
        self.insights_ref = self.db.collection("weekly_insights")
