import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthScore } from "@/components/HealthScore";
import { SettingsProvider } from "@/lib/settings-store";
import React from "react";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe("HealthScore Component Tests", () => {
  it("renders neutral state with score 50 and no deficit alarm when there are 0 records", () => {
    render(
      <TestWrapper>
        <HealthScore
          monthlyIncome={0}
          monthlyExpenses={0}
          budgetsUsedPct={0}
          goalsProgress={0}
          pendingBills={0}
          hasBudgets={false}
        />
      </TestWrapper>
    );

    // 1. Score should be neutral baseline 50 (not 65)
    expect(screen.getByText("50")).toBeDefined();

    // 2. Status should be neutral
    expect(screen.getByText(/⚖️/)).toBeDefined();

    // 3. Subtitle should be neutral "Sin movimientos este mes"
    expect(screen.getByText(/Sin movimientos/i)).toBeDefined();

    // 4. Must NOT claim the user is spending more than earning
    expect(screen.queryByText(/Gastando más de lo que ingresa/i)).toBeNull();
    expect(screen.queryByText(/Spending more than earning/i)).toBeNull();
  });

  it("calculates high health score and savings rate when income exceeds expenses", () => {
    render(
      <TestWrapper>
        <HealthScore
          monthlyIncome={100000}
          monthlyExpenses={30000}
          budgetsUsedPct={30}
          goalsProgress={50}
          pendingBills={0}
          hasBudgets={true}
        />
      </TestWrapper>
    );

    // Savings rate should be visible (70%)
    expect(screen.getByText(/70% tasa de ahorro|70% savings rate/i)).toBeDefined();

    // Label should be excellent
    expect(screen.getByText(/💪/)).toBeDefined();
  });

  it("penalizes and warns when expenses exceed income", () => {
    render(
      <TestWrapper>
        <HealthScore
          monthlyIncome={20000}
          monthlyExpenses={60000}
          budgetsUsedPct={120}
          goalsProgress={0}
          pendingBills={2}
          hasBudgets={true}
        />
      </TestWrapper>
    );

    // Deficit warning should be visible
    expect(screen.getByText(/Gastando más de lo que ingresa|Spending more than earning/i)).toBeDefined();
    expect(screen.getByText(/⚠️/)).toBeDefined();
  });
});
