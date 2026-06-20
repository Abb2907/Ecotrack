/**
 * @jest-environment jsdom
 */
import { api } from "../api";
import { auth } from "../firebase";

// Mock Firebase Auth
jest.mock("../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage mock
    Storage.prototype.getItem = jest.fn(() => null);
  });

  describe("getHeaders", () => {
    it("should include Bearer token if user is authenticated", async () => {
      (auth.currentUser?.getIdToken as jest.Mock).mockResolvedValueOnce("test-firebase-token");

      // We call a method that uses getHeaders
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/me"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-firebase-token",
          }),
        })
      );
    });

    it("should fallback to mock token from localStorage if not authenticated with Firebase", async () => {
      // Simulate no firebase user
      (auth as any).currentUser = null;
      Storage.prototype.getItem = jest.fn((key) => {
        if (key === "ecotrack_mock_token") return "test-mock-token";
        return null;
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-mock-token",
          }),
        })
      );
    });
  });

  describe("API Methods", () => {
    it("registerUser should send POST request with user data", async () => {
      const mockProfile = { email: "test@test.com", displayName: "Test" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const res = await api.registerUser("Test", "test@test.com");
      expect(res).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test@test.com"),
        })
      );
    });

    it("should throw error if response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => "Internal Server Error",
      });

      await expect(api.getProfile()).rejects.toThrow("Internal Server Error");
    });

    it("logAction should correctly post a new log", async () => {
      const mockLog = { logId: "123", co2Reduced: 5.5 };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLog,
      });

      const res = await api.logAction("bike_commute", "2026-06-20", 2);
      expect(res).toEqual(mockLog);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/actions/log"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ actionId: "bike_commute", date: "2026-06-20", quantity: 2 }),
        })
      );
    });
  });
});
