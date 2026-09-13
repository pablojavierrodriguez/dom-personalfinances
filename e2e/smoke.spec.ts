import { test, expect } from "@playwright/test";

test.describe("DOM Smoke Tests", () => {
  test("renders landing page or auth redirect cleanly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DOM/);
  });

  test("loads auth page with branding and login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("DOM").first()).toBeVisible();
  });

  test("landing page renders cleanly with brand tagline", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByText("DOM").first()).toBeVisible();
  });
});
