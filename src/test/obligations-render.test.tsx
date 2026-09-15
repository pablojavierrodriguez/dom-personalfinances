import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ObligationsManager } from "@/components/ObligationsManager";
import { GoalsManager } from "@/components/GoalsManager";
import { SettingsProvider } from "@/lib/settings-store";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import React from "react";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <PrivacyProvider>{children}</PrivacyProvider>
    </SettingsProvider>
  );
}

describe("ObligationsManager & GoalsManager Render Tests", () => {
  it("renders ObligationsManager without throwing ReferenceError: MoneyInput is not defined", () => {
    const { container } = render(
      <TestWrapper>
        <ObligationsManager
          bills={[]}
          recurringTxs={[]}
          categories={[]}
          accounts={[]}
          onAddBill={() => {}}
          onUpdateBill={() => {}}
          onDeleteBill={() => {}}
          onToggleBill={() => {}}
          onAddRecurring={() => {}}
          onUpdateRecurring={() => {}}
          onDeleteRecurring={() => {}}
          onToggleRecurring={() => {}}
        />
      </TestWrapper>
    );

    expect(container).toBeTruthy();
  });

  it("renders GoalsManager without throwing ReferenceError: MoneyInput is not defined", () => {
    const { container } = render(
      <TestWrapper>
        <GoalsManager
          goals={[]}
          accounts={[]}
          onAdd={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          onContribute={() => {}}
          onWithdraw={() => {}}
        />
      </TestWrapper>
    );

    expect(container).toBeTruthy();
  });
});
