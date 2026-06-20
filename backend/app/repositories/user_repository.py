from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.repositories.base import BaseRepository
from app.models.domain.user import User, CarbonBaseline

class UserRepository(BaseRepository):
    async def get_user(self, user_id: str) -> Optional[User]:
        doc = await self.users_ref.document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            if data:
                return User(**data)
        return None

    async def create_user(self, user: User) -> User:
        user_ref = self.users_ref.document(user.userId)
        await user_ref.set(user.model_dump())
        return user

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> None:
        updates["updatedAt"] = datetime.utcnow()
        await self.users_ref.document(user_id).update(updates)

    async def update_baseline(self, user_id: str, baseline: CarbonBaseline) -> None:
        updates = {
            "carbonBaseline": baseline.model_dump(),
            "updatedAt": datetime.utcnow()
        }
        await self.users_ref.document(user_id).update(updates)

    async def flag_for_deletion(self, user_id: str) -> datetime:
        # Sets a deletion requested timestamp
        deletion_time = datetime.utcnow()
        updates = {
            "deletionRequested": deletion_time,
            "updatedAt": deletion_time
        }
        await self.users_ref.document(user_id).update(updates)
        return deletion_time

    async def cancel_deletion(self, user_id: str) -> None:
        updates = {
            "deletionRequested": None,
            "updatedAt": datetime.utcnow()
        }
        await self.users_ref.document(user_id).update(updates)

    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        # Collects all user profile information, daily logs, and weekly insights
        user = await self.get_user(user_id)
        if not user:
            return {}

        logs: List[Dict[str, Any]] = []
        logs_query = self.logs_ref.where("userId", "==", user_id).stream()
        async for log_doc in logs_query:
            logs.append(log_doc.to_dict())

        insights: List[Dict[str, Any]] = []
        insights_query = self.insights_ref.where("userId", "==", user_id).stream()
        async for insight_doc in insights_query:
            insights.append(insight_doc.to_dict())

        return {
            "profile": user.model_dump(),
            "logs": logs,
            "insights": insights
        }

    async def purge_deleted_users(self) -> int:
        # Cron job runner logic: finds and purges users who requested deletion > 7 days ago
        cutoff = datetime.utcnow() - timedelta(days=7)
        users_to_delete = self.users_ref.where("deletionRequested", "<=", cutoff).stream()
        purged_count = 0

        async for doc in users_to_delete:
            user_id = doc.id

            # Start a transaction or batch to delete associated documents
            batch = self.db.batch()

            # 1. Delete all user logs
            user_logs = self.logs_ref.where("userId", "==", user_id).stream()
            async for log_doc in user_logs:
                batch.delete(log_doc.reference)

            # 2. Delete weekly insights
            user_insights = self.insights_ref.where("userId", "==", user_id).stream()
            async for insight_doc in user_insights:
                batch.delete(insight_doc.reference)

            # 3. Delete user profile itself
            batch.delete(doc.reference)

            await batch.commit()
            purged_count += 1

        return purged_count
