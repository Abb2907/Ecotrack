import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/** Firebase configuration loaded from environment variables. */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

/** Singleton Firebase app instance, safe for Next.js hot-reloads. */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Firebase Authentication instance used across the application. */
export const auth = getAuth(app);
