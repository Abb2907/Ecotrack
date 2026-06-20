""" "Tests for the HMAC-SHA256 user ID anonymization service."""

import pytest

from app.services.anonymization_service import AnonymizationService


@pytest.mark.asyncio
async def test_userid_anonymization() -> None:
    service = AnonymizationService()

    uid_1 = "firebase-auth-uid-alice-12345"
    uid_2 = "firebase-auth-uid-bob-67890"

    # 1. Anonymize user IDs
    hash_alice = await service.anonymize_user_id(uid_1)
    hash_bob = await service.anonymize_user_id(uid_2)

    # Assert output formats
    assert len(hash_alice) == 64  # SHA256 hex output length
    assert len(hash_bob) == 64

    # 2. Assert output uniqueness (no collisions)
    assert hash_alice != hash_bob

    # 3. Assert idempotency (same input produces same hash for user cohort matching)
    hash_alice_second_run = await service.anonymize_user_id(uid_1)
    assert hash_alice == hash_alice_second_run
