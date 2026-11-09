/**
 * Firebase is used ONLY to run Google Sign-In in the browser and obtain an ID token,
 * which the backend verifies. These NEXT_PUBLIC_* values are public client identifiers
 * (not secrets); access is enforced by the backend.
 */
import type { FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isGoogleSignInConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;

/** Opens the Google popup and returns a Firebase ID token. */
export async function getGoogleIdToken(): Promise<string> {
  if (!isGoogleSignInConfigured) throw new Error("Google Sign-In is not configured.");
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  app ??= getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const token = await cred.user.getIdToken();
  // Our backend session is the source of truth; don't keep a parallel Firebase session.
  await signOut(auth);
  return token;
}
