"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
