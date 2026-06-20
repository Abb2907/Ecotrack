/**
 * @jest-environment jsdom
 */
/* eslint-disable react/display-name */
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children);
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock next/image
jest.mock("next/image", () => {
  const MockImage = (props: any) => React.createElement("img", props);
  MockImage.displayName = "MockImage";
  return MockImage;
});

// Mock AuthContext
jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
  }),
}));

import { Navbar } from "../Navbar";

describe("Navbar Component", () => {
  it("renders the EcoTrack brand name", () => {
    render(<Navbar />);
    expect(screen.getByText("EcoTrack")).toBeInTheDocument();
  });

  it("shows sign-in button when user is not authenticated", () => {
    render(<Navbar />);
    const signInButtons = screen.getAllByText("Sign In with Google");
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("has a mobile menu toggle button with aria-label", () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText("Toggle Navigation Menu");
    expect(menuButton).toBeInTheDocument();
  });
});
