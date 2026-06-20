import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "@/components/common/Button";

describe("Button Component", () => {
  it("renders correctly with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies aria-label when provided", () => {
    render(<Button aria-label="Icon Button" />);
    expect(screen.getByLabelText("Icon Button")).toBeInTheDocument();
  });
});
