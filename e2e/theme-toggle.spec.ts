import { test, expect } from '@playwright/test';
import { bypassAuth } from './helpers/auth';

test.describe('Nina Beleza · toggle de tema', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/dashboard');
  });

  test('html inicia com classe dark (padrão)', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass || '').toMatch(/dark/);
  });

  test('botão de toggle muda de dark pra light no primeiro click', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Estado inicial: dark (forçado no helper bypassAuth)
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click via JS direto — framer-motion remonta o botão no DOM e isso
    // causa flakiness com o click() do Playwright (scrolling/intercept).
    await page.locator('button[aria-label="Alternar tema"]').first().waitFor({ timeout: 10_000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Alternar tema"]') as HTMLButtonElement | null;
      btn?.click();
    });

    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('preferência é persistida em localStorage', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    // Click via JS direto — framer-motion remonta o botão no DOM e isso
    // causa flakiness com o click() do Playwright (scrolling/intercept).
    await page.locator('button[aria-label="Alternar tema"]').first().waitFor({ timeout: 10_000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Alternar tema"]') as HTMLButtonElement | null;
      btn?.click();
    });

    await expect.poll(
      async () => page.evaluate(() => localStorage.getItem('nina-beleza-theme')),
      { timeout: 5_000 }
    ).toBe('light');
  });
});
