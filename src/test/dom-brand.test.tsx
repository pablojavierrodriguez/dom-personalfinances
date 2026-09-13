import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DOMSymbol } from "@/components/ui/DOMSymbol";
import { DOMLogo } from "@/components/ui/DOMLogo";

describe("DOM Brand Components", () => {
  it("renders DOMSymbol in default and badge variants", () => {
    const { container, rerender } = render(<DOMSymbol size="md" variant="default" />);
    expect(container.querySelector("svg")).toBeDefined();

    rerender(<DOMSymbol size="lg" variant="badge" />);
    expect(container.querySelector("svg")).toBeDefined();
    expect(container.querySelector("rect")).toBeDefined();
  });

  it("renders DOMLogo with full variant and tagline", () => {
    render(
      <DOMLogo
        size="md"
        variant="full"
        showTagline
        taglineText="El dominio no se conquista. Se administra."
      />
    );

    expect(screen.getByText("DOM")).toBeDefined();
    expect(screen.getByText("El dominio no se conquista. Se administra.")).toBeDefined();
  });

  it("renders DOMLogo in wordmark-only variant", () => {
    render(<DOMLogo size="sm" variant="wordmark" />);
    expect(screen.getByText("DOM")).toBeDefined();
  });

  it("renders DOMLogo with inline tagline position and dot separator", () => {
    render(
      <DOMLogo
        size="sm"
        showTagline
        taglinePosition="inline"
        taglineText="Visión y Propósito"
      />
    );

    expect(screen.getByText("DOM")).toBeDefined();
    expect(screen.getByText("·")).toBeDefined();
    expect(screen.getByText("Visión y Propósito")).toBeDefined();
  });
});
