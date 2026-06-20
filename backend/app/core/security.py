"""Firebase Authentication security module.

Handles JWT token verification against Firebase public certificates,
user identity extraction, and role-based access control (RBAC).
"""

import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings

security_scheme = HTTPBearer()

# Cache for Firebase public certificates to avoid querying Google on every request
PUBLIC_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
keys_cache: dict[str, str] = {}
keys_cache_expiry: float = 0.0


async def get_firebase_public_keys() -> dict[str, str]:
    """Fetch and cache Firebase public signing certificates.

    Downloads Google's public X.509 certificates used to verify Firebase
    ID tokens. Results are cached for one hour to minimize network calls.

    Returns:
        A mapping of key IDs to PEM-encoded public key strings.

    Raises:
        HTTPException: If the certificate endpoint returns a non-200 status.
    """
    global keys_cache, keys_cache_expiry
    now = time.time()

    # Refresh cache if empty or expired
    if not keys_cache or now > keys_cache_expiry:
        async with httpx.AsyncClient() as client:
            response = await client.get(PUBLIC_KEYS_URL)
            if response.status_code == 200:
                keys_cache = response.json()
                # Cache for 1 hour
                keys_cache_expiry = now + 3600
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to fetch Firebase public authentication certificates",
                )
    return keys_cache

async def verify_firebase_token(token: str) -> dict[str, Any]:
    """Decode and verify a Firebase ID token.

    Args:
        token: The raw JWT string from the Authorization header.

    Returns:
        The decoded JWT payload as a dictionary.

    Raises:
        HTTPException: If the token header is invalid or verification fails.
    """
    public_keys = await get_firebase_public_keys()

    try:
        # Get the unverified header to locate the kid (Key ID)
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid or kid not in public_keys:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token header credentials",
            )

        # Decode and verify token
        public_key = public_keys[kid]
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.PROJECT_ID,
            issuer=f"https://securetoken.google.com/{settings.PROJECT_ID}",
        )
        return dict(payload)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication token verification failed: {str(e)}",
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict[str, Any]:
    """Extract the authenticated user from the request.

    Supports mock tokens in development mode for local testing without
    Firebase credentials.

    Args:
        credentials: Bearer token extracted by the HTTPBearer scheme.

    Returns:
        A dictionary containing ``uid``, ``email``, and ``name`` keys.
    """
    token = credentials.credentials
    # In development mode, allow a bypass for local mock testing
    if settings.ENVIRONMENT == "development" and token == "mock-token-admin":
        return {
            "uid": "mock-admin-uid",
            "email": "admin@ecotrack.dev",
            "name": "Mock Admin",
            "role": "admin",
        }
    if settings.ENVIRONMENT == "development" and token == "mock-token-user":
        return {
            "uid": "mock-user-uid",
            "email": "user@ecotrack.dev",
            "name": "Mock User",
            "role": "user",
        }

    payload = await verify_firebase_token(token)
    return {
        "uid": payload.get("sub", ""),
        "email": payload.get("email", ""),
        "name": payload.get("name", "User"),
    }


class RoleChecker:
    """Dependency for enforcing role-based access control on endpoints.

    Args:
        allowed_roles: List of role strings permitted to access the endpoint.

    Raises:
        HTTPException: If the authenticated user's role is not in the allowed list.
    """

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, user: dict[str, str] = Depends(get_current_user)
    ) -> dict[str, str]:
        # Note: Roles can be stored in Firebase custom claims or checked via Firestore user record
        # For simplicity and security, we default users to "user" role unless specified in custom claims/record.
        role = user.get("role", "user")
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions",
            )
        return user
