"""Verify Firebase Authentication ID tokens (issued after Google Sign-In on the client).

Uses google-auth with Google's public certificates; only FIREBASE_PROJECT_ID is required.
No service-account secret is needed for verification.
"""

from dataclasses import dataclass

from app.core.config import get_settings
from app.core.errors import ApiError


@dataclass
class FirebaseIdentity:
    uid: str
    email: str
    email_verified: bool
    name: str | None
    picture: str | None
    sign_in_provider: str | None


def verify_firebase_id_token(token: str) -> FirebaseIdentity:
    settings = get_settings()
    if not settings.firebase_enabled:
        raise ApiError(
            503, "google_signin_not_configured",
            "Google Sign-In is not configured on this server (FIREBASE_PROJECT_ID missing).",
        )

    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token

    try:
        claims = id_token.verify_firebase_token(token, g_requests.Request(), audience=settings.firebase_project_id)
    except ValueError:
        raise ApiError(401, "invalid_google_token", "Google sign-in could not be verified. Please try again.")
    except Exception:  # network failure fetching Google certs
        raise ApiError(503, "google_unreachable", "Could not reach Google to verify sign-in. Please try again.")

    if not claims or claims.get("iss") != f"https://securetoken.google.com/{settings.firebase_project_id}":
        raise ApiError(401, "invalid_google_token", "Google sign-in could not be verified.")
    email = claims.get("email")
    if not email:
        raise ApiError(400, "email_required", "Your Google account did not share an email address.")

    return FirebaseIdentity(
        uid=claims["sub"],
        email=email.lower(),
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name"),
        picture=claims.get("picture"),
        sign_in_provider=(claims.get("firebase") or {}).get("sign_in_provider"),
    )
