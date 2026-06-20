/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../AuthContext";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}));

jest.mock("../../lib/firebase", () => ({
  auth: { currentUser: null },
}));

const TestComponent = () => {
  const { user, loading, loginAsGuest, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-state">{user ? user.email : "No User"}</div>
      <button onClick={loginAsGuest}>Login Guest</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should provide initial loading state", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation(() => jest.fn());

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should update user state when onAuthStateChanged triggers with a user", async () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth: any, callback: any) => {
      // Trigger callback immediately with a mock user
      callback({
        uid: "123",
        email: "test@user.com",
        getIdToken: async () => "token123",
      });
      return jest.fn(); // unsubscribe function
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-state")).toHaveTextContent("test@user.com");
    });
  });

  it("should handle loginAsGuest", async () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth: any, callback: any) => {
      callback(null); // No firebase user initially
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-state")).toHaveTextContent("No User");
    });

    act(() => {
      screen.getByText("Login Guest").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-state")).toHaveTextContent("user@ecotrack.dev");
      expect(localStorage.getItem("ecotrack_mock_token")).toBe("mock-token-user");
    });
  });

  it("should handle logout", async () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth: any, callback: any) => {
      callback({
        uid: "123",
        email: "test@user.com",
        getIdToken: async () => "token123",
      });
      return jest.fn();
    });

    (signOut as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-state")).toHaveTextContent("test@user.com");
    });

    act(() => {
      screen.getByText("Logout").click();
    });

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });
});
