import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DominusSymbol } from "@/components/ui/DominusSymbol";
import { DominusLogo } from "@/components/ui/DominusLogo";

describe("DOM Brand Components", () => {
  it("renders DominusSymbol in default and badge variants", () => {
    const { container, rerender } = render(<DominusSymbol size="md" variant="default" />);
    expect(container.querySelector("svg")).toBeDefined();

    rerender(<DominusSymbol size="lg" variant="badge" />);
    expect(container.querySelector("svg")).toBeDefined();
    expect(container.querySelector("rect")).toBeDefined();
  });

  it("renders DominusLogo with full variant and tagline", () => {
    render(
      <DominusLogo
        size="md"
        variant="full"
        showTagline
        taglineText="El dominio no se conquista. Se administra."
      />
    );

    expect(screen.getByText("DOM")).toBeDefined();
    expect(screen.getByText("El dominio no se conquista. Se administra.")).toBeDefined();
  });

  it("renders DominusLogo in wordmark-only variant", () => {
    render(<DominusLogo size="sm" variant="wordmark" />);
    expect(screen.getByText("DOM")).toBeDefined();
  });
});
