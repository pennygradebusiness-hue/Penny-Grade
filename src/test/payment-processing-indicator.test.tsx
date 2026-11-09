import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PaymentProcessingIndicator,
  PaymentProcessingOverlay,
} from "@/components/payment-processing-indicator";

describe("payment processing indicator", () => {
  it("announces the current payment step and renders a visible spinner", () => {
    render(<PaymentProcessingIndicator message="Verifying payment and assigning your card…" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Verifying payment and assigning your card…",
    );
    expect(screen.getByRole("status").querySelector("svg")).toHaveClass("animate-spin");
  });

  it("renders a blocking, accessible processing layer with the current gateway step", () => {
    render(<PaymentProcessingOverlay message="Verifying payment signature…" />);

    const overlay = screen.getByRole("status");
    expect(overlay).toHaveAttribute("aria-busy", "true");
    expect(overlay).toHaveClass("fixed", "inset-0");
    expect(overlay).toHaveTextContent("Verifying payment signature…");
    expect(overlay).toHaveTextContent("Keep this page open.");
    expect(overlay.querySelector("svg")).toHaveClass("animate-spin");
  });
});
