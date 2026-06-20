"""User profile repository.

Manages CRUD operations for user profiles, carbon baselines, GDPR
deletion workflows, and data export from Firestore.
"""

from datetime import datetime, timedelta
from typing import Any

from app.models.domain.user import CarbonBaseline, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    """Repository for user profile and GDPR data operations."""

    async def get_user(self, user_id: str) -> User | None:
        """Retrieve a user profile by Firebase UID.

        Args:
            user_id: The Firebase UID.

        Returns:
            The User domain model or None if not found.
        """
        doc = await self.users_ref.document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            if data:
                return User(**data)
        return None

    async def create_user(self, user: User) -> User:
        """Create a new user profile in Firestore.

        Args:
            user: The User domain model to persist.

        Returns:
            The persisted User instance.
        """
        user_ref = self.users_ref.document(user.userId)
        await user_ref.set(user.model_dump())
        return user

    async def update_user(self, user_id: str, updates: dict[str, Any]) -> None:
        """Partially update a user profile.

        Args:
            user_id: The Firebase UID.
            updates: Dictionary of fields to update.
        """
        updates["updatedAt"] = datetime.utcnow()
        await self.users_ref.document(user_id).update(updates)

    async def update_baseline(self, user_id: str, baseline: CarbonBaseline) -> None:
        """Update a user's carbon emission baseline.

        Args:
            user_id: The Firebase UID.
            baseline: New carbon baseline values.
        """
        updates = {
            "carbonBaseline": baseline.model_dump(),
            "updatedAt": datetime.utcnow(),
        }
        await self.users_ref.document(user_id).update(updates)

    async def flag_for_deletion(self, user_id: str) -> datetime:
        """Schedule a user account for GDPR-compliant deletion.

        Args:
            user_id: The Firebase UID.

        Returns:
            The timestamp when the deletion was requested.
        """
        # Sets a deletion requested timestamp
        deletion_time = datetime.utcnow()
        updates = {"deletionRequested": deletion_time, "updatedAt": deletion_time}
        await self.users_ref.document(user_id).update(updates)
        return deletion_time

    async def cancel_deletion(self, user_id: str) -> None:
        """Cancel a pending GDPR account deletion request.

        Args:
            user_id: The Firebase UID.
        """
        updates = {"deletionRequested": None, "updatedAt": datetime.utcnow()}
        await self.users_ref.document(user_id).update(updates)

    async def export_user_data(self, user_id: str) -> dict[str, Any]:
        """Export all user data for GDPR Data Portability compliance.

        Collects the user profile, all daily logs, and weekly insights.

        Args:
            user_id: The Firebase UID.

        Returns:
            A dictionary with profile, logs, and insights data.
        """
        # Collects all user profile information, daily logs, and weekly insights
        user = await self.get_user(user_id)
        if not user:
            return {}

        logs: list[dict[str, Any]] = []
        logs_query = self.logs_ref.where("userId", "==", user_id).stream()
        async for log_doc in logs_query:
            logs.append(log_doc.to_dict())

        insights: list[dict[str, Any]] = []
        insights_query = self.insights_ref.where("userId", "==", user_id).stream()
        async for insight_doc in insights_query:
            insights.append(insight_doc.to_dict())

        return {"profile": user.model_dump(), "logs": logs, "insights": insights}

    async def purge_deleted_users(self) -> int:
        """Permanently delete users whose deletion grace period has expired.

        Removes user profiles, activity logs, and weekly insights using
        batched writes for atomicity.

        Returns:
            The number of accounts purged.
        """
        # Cron job runner logic: finds and purges users who requested deletion > 7 days ago
        cutoff = datetime.utcnow() - timedelta(days=7)
        users_to_delete = self.users_ref.where(
            "deletionRequested", "<=", cutoff
        ).stream()
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
