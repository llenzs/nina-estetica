import { test, expect } from '@playwright/test';
import { bypassAuth } from './helpers/auth';

test.describe('Nina Beleza · Settings — abas verticais beleza', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
  });

  test('exibe título "Configurações"', async ({ page }) => {
    await expect(page.getByTestId('settings-title')).toHaveText(/configurações/i);
  });

  test('aba "Procedimentos" existe (F3.1)', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /procedimentos/i })).toBeVisible({ timeout: 10_000 });
  });

  test('aba "Agenda" (Google Calendar) existe (F3.2)', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /^agenda$/i })).toBeVisible({ timeout: 10_000 });
  });

  test('aba "Lembretes" existe (F3.3)', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /lembretes/i })).toBeVisible({ timeout: 10_000 });
  });

  test('clicando em Procedimentos mostra catálogo vazio (sem dados mockados)', async ({ page }) => {
    await page.getByRole('tab', { name: /procedimentos/i }).click();
    await expect(page.getByText(/catálogo de procedimentos/i)).toBeVisible();
  });

  test('clicando em Lembretes mostra 3 sub-tabs', async ({ page }) => {
    await page.getByRole('tab', { name: /lembretes/i }).click();
    await expect(page.getByText(/lembretes automáticos/i)).toBeVisible();
    // 3 sub-tabs: Fila, Templates, Cron
    await expect(page.getByRole('button', { name: /^fila/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^cron/i })).toBeVisible();
  });

  test('clicando em Agenda mostra card Google Calendar', async ({ page }) => {
    await page.getByRole('tab', { name: /^agenda$/i }).click();
    await expect(page.getByText(/google calendar/i).first()).toBeVisible();
  });
});
