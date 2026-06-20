import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Card } from "@/components/common/Card";

describe("Card Component", () => {
  it("renders children correctly", () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });
});
