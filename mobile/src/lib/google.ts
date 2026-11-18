/**
 * Google sign-in on the device. The backend's /auth/google verifies a *Firebase* ID token (same as the web app), so:
 *   1. the native Google account picker (Credential Manager) returns a Google ID token for the Firebase project's web
 *      OAuth client (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
 *   2. Firebase Auth's REST endpoint `accounts:signInWithIdp` exchanges it for a Firebase ID token
 *      (EXPO_PUBLIC_FIREBASE_API_KEY, the public web API key the web app already ships);
 *   3. that token goes to POST /auth/google, which issues our own session.
 * Android also needs an OAuth client of type Android for this package + the signing key's SHA-1 in the same project.
 */
import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { ApiError } from "./api";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";

/** False until both public IDs are set at build time; the UI hides the Google button then. */
export const googleSignInConfigured = WEB_CLIENT_ID.length > 0 && FIREBASE_API_KEY.length > 0;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

/** Thrown when the student closes the account picker; callers show nothing. */
export class GoogleCancelled extends Error {}

/** Opens the Google account picker and returns a Firebase ID token for the chosen account. */
export async function googleFirebaseIdToken(): Promise<string> {
  if (!googleSignInConfigured) throw new ApiError(503, "google_signin_not_configured", "Google sign-in isn't set up in this version of the app.");
  ensureConfigured();
  let googleToken: string | null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the picker, so a student on a shared phone can choose another account.
    await GoogleSignin.signOut().catch(() => undefined);
    const res = await GoogleSignin.signIn();
    if (isCancelledResponse(res)) throw new GoogleCancelled();
    googleToken = res.data.idToken;
  } catch (e) {
    if (e instanceof GoogleCancelled) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) throw new GoogleCancelled();
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new ApiError(0, "play_services_missing", "Google Play services is needed for Google sign-in. Use your email and password instead.");
      }
    }
    throw new ApiError(0, "google_failed", "Google sign-in didn't work. Check your connection and try again.");
  }
  if (!googleToken) throw new ApiError(0, "google_failed", "Google didn't return your account details. Please try again.");

  let res: Response;
  try {
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(googleToken)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
    });
  } catch {
    throw new ApiError(0, "network_error", "Couldn't reach Google. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { idToken?: string } | null;
  if (!res.ok || !body?.idToken) throw new ApiError(res.status, "google_failed", "Google sign-in couldn't be completed. Please try again.");
  return body.idToken;
}
