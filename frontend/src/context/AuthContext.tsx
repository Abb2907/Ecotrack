"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Authentication context type defining all auth state and operations.
 *
 * @property user - The currently authenticated Firebase or mock user, or null.
 * @property token - The current ID token string, or null.
 * @property loading - Whether an auth operation is in progress.
 * @property loginWithGoogle - Initiates Google Sign-In popup flow.
 * @property loginAsGuest - Signs in with a mock token for local development.
 * @property logout - Signs out the current user and clears session.
 * @property refreshToken - Forces a token refresh and returns the new token.
 */
interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication context provider component.
 *
 * Wraps the application tree to provide Firebase authentication state,
 * Google Sign-In, mock login for development, and token management.
 *
 * @param props - Component props.
 * @param props.children - Child components that consume the auth context.
 * @returns The context provider wrapping children.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a mock session in local storage first
    if (typeof window !== "undefined") {
      const mockToken = localStorage.getItem("ecotrack_mock_token");
      if (mockToken) {
        setUser({
          uid: "mock-user-uid",
          email: "user@ecotrack.dev",
          displayName: "Mock User",
          photoURL: null,
          getIdToken: async () => mockToken,
        } as any);
        setToken(mockToken);
        setLoading(false);
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        if (typeof window !== "undefined") {
          localStorage.removeItem("ecotrack_mock_token");
        }
      } else {
        if (typeof window !== "undefined" && !localStorage.getItem("ecotrack_mock_token")) {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error (falling back to mock login in development):", error);
      if (typeof window !== "undefined" && (process.env.NODE_ENV === "development" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        await loginAsGuest();
        return;
      }
      setLoading(false);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    setLoading(true);
    const mockToken = "mock-token-user";
    if (typeof window !== "undefined") {
      localStorage.setItem("ecotrack_mock_token", mockToken);
    }
    setUser({
      uid: "mock-user-uid",
      email: "user@ecotrack.dev",
      displayName: "Mock User",
      photoURL: null,
      getIdToken: async () => mockToken,
    } as any);
    setToken(mockToken);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ecotrack_mock_token");
      }
      await signOut(auth);
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Logout Error:", error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    if (typeof window !== "undefined") {
      const mockToken = localStorage.getItem("ecotrack_mock_token");
      if (mockToken) return mockToken;
    }
    if (!auth.currentUser) return null;
    const idToken = await auth.currentUser.getIdToken(true);
    setToken(idToken);
    return idToken;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, loginAsGuest, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context.
 *
 * Must be used within an {@link AuthProvider}. Throws an error if used
 * outside the provider boundary.
 *
 * @returns The current authentication context value.
 * @throws Error if used outside of an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
