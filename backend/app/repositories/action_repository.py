from app.models.domain.action import Action
from app.models.domain.log import DailyLog
from app.repositories.base import BaseRepository


class ActionRepository(BaseRepository):
    # Catalog operations
    async def get_actions(self, category: str | None = None) -> list[Action]:
        actions: list[Action] = []
        query = self.actions_ref
        if category:
            query = query.where("category", "==", category)

        async for doc in query.stream():
            data = doc.to_dict()
            if data:
                actions.append(Action(**data))
        return actions

    async def get_action(self, action_id: str) -> Action | None:
        doc = await self.actions_ref.document(action_id).get()
        if doc.exists:
            data = doc.to_dict()
            if data:
                return Action(**data)
        return None

    async def create_action(self, action: Action) -> Action:
        await self.actions_ref.document(action.actionId).set(action.model_dump())
        return action

    # Seed catalog helper
    async def seed_default_actions(self) -> None:
        defaults = [
            Action(
                actionId="bike_commute",
                title="Bicycle Commute",
                description="Use a bicycle instead of driving a private combustion vehicle.",
                category="transport",
                baseReduction=0.21,  # kg CO2 per km
                unit="km",
                difficulty="easy",
                costImpact="savings",
                estimatedSavings=15.0,
            ),
            Action(
                actionId="public_transit",
                title="Public Transit Journey",
                description="Take bus or metro train instead of single-occupancy driving.",
                category="transport",
                baseReduction=0.15,  # kg CO2 per km
                unit="km",
                difficulty="easy",
                costImpact="savings",
                estimatedSavings=10.0,
            ),
            Action(
                actionId="vegan_diet",
                title="Plant-Based Diet Day",
                description="Eat purely plant-based meals for an entire day.",
                category="diet",
                baseReduction=4.5,  # kg CO2 per day
                unit="day",
                difficulty="medium",
                costImpact="neutral",
                estimatedSavings=0.0,
            ),
            Action(
                actionId="led_lighting",
                title="LED Light Switch",
                description="Replace high-energy incandescent bulbs with LEDs.",
                category="energy",
                baseReduction=0.04,  # kg CO2 per hour of use
                unit="hour",
                difficulty="easy",
                costImpact="savings",
                estimatedSavings=2.0,
            ),
            Action(
                actionId="thermostat_adjustment",
                title="Smart Thermostat Eco-Mode",
                description="Adjust heating/cooling thermostat by 2 degrees for efficiency.",
                category="energy",
                baseReduction=1.2,  # kg CO2 per day
                unit="day",
                difficulty="easy",
                costImpact="savings",
                estimatedSavings=40.0,
            ),
        ]

        for action in defaults:
            # Only write if it does not exist already
            doc_ref = self.actions_ref.document(action.actionId)
            doc = await doc_ref.get()
            if not doc.exists:
                await doc_ref.set(action.model_dump())

    # Daily logging operations
    async def log_reduction(self, log: DailyLog) -> DailyLog:
        await self.logs_ref.document(log.logId).set(log.model_dump())
        return log

    async def get_user_logs(
        self, user_id: str, limit: int = 50, offset: str | None = None
    ) -> list[DailyLog]:
        logs: list[DailyLog] = []
        # Uses index mapping: userId -> date (descending) -> createdAt (descending)
        query = (
            self.logs_ref.where("userId", "==", user_id)
            .order_by("date", direction="DESCENDING")
            .order_by("createdAt", direction="DESCENDING")
        )

        if offset:
            # Pagination cursor handling
            cursor_doc = await self.logs_ref.document(offset).get()
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)

        query = query.limit(limit)

        async for doc in query.stream():
            data = doc.to_dict()
            if data:
                logs.append(DailyLog(**data))
        return logs

    async def delete_log(self, log_id: str) -> None:
        await self.logs_ref.document(log_id).delete()

    async def get_log(self, log_id: str) -> DailyLog | None:
        doc = await self.logs_ref.document(log_id).get()
        if doc.exists:
            data = doc.to_dict()
            if data:
                return DailyLog(**data)
        return None
