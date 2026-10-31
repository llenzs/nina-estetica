import { test, expect } from '@playwright/test';

test.describe('Nina Beleza · página de autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // O app redireciona "/" → "/auth" quando o usuário não está logado.
    // Vamos direto para a rota /auth para não depender do estado de loading do Supabase.
    await page.goto('/auth');
  });

  test('exibe o título do produto na aba do navegador', async ({ page }) => {
    await expect(page).toHaveTitle(/Nina Beleza/i);
  });

  test('mostra a marca Nina Beleza e o badge de vertical estética', async ({ page }) => {
    await expect(page.getByText('Nina Beleza · Estética com IA')).toBeVisible();
  });

  test('título inicial é o de login (modo "bem-vinda de volta")', async ({ page }) => {
    const title = page.getByTestId('auth-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText(/bem-vinda de volta/i);
  });

  test('subtítulo fala da clínica/agenda e não de SaaS genérico', async ({ page }) => {
    await expect(
      page.getByText(/atendimentos, agenda e funil de clientes/i)
    ).toBeVisible();
  });

  test('toggle para criar conta troca os textos para vertical beleza', async ({ page }) => {
    await page.getByRole('button', { name: /criar conta/i }).click();
    await expect(page.getByTestId('auth-title')).toHaveText(/sua clínica brilhando com ia/i);
    await expect(
      page.getByText(/sua assistente ia já atende, qualifica e agenda no whatsapp/i)
    ).toBeVisible();
  });

  test('valida senha curta sem chamar Supabase', async ({ page }) => {
    await page.getByLabel('Email').fill('cliente@suaclinica.com.br');
    await page.getByLabel('Senha').fill('123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/senha deve ter pelo menos 6 caracteres/i)).toBeVisible();
  });

  test('valida e-mail inválido (bypass de HTML5 para chegar no Zod)', async ({ page }) => {
    // Garante que o form já está renderizado pelo React antes de mexer no DOM.
    await page.waitForSelector('form');
    // O input tem type="email" + form sem noValidate, o que aciona a validação
    // nativa do navegador antes do Zod. Marcamos o form como noValidate via JS
    // para que o submit chegue até o validador Zod do app.
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('form')?.setAttribute('novalidate', 'true');
    });
    await page.getByLabel('Email').fill('isso-nao-eh-email');
    await page.getByLabel('Senha').fill('senha123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText('Email inválido')).toBeVisible({ timeout: 15_000 });
  });

  test('rota protegida redireciona para /auth quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('aplica design system definido (não fallback cyan/violet do SDR genérico)', async ({ page }) => {
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    );
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    );
    // Garante que CSS vars estão setadas no formato HSL "hue sat% light%"
    expect(primary).toMatch(/^\d+\s+\d+%\s+\d+%$/);
    expect(accent).toMatch(/^\d+\s+\d+%\s+\d+%$/);
    // Veta a paleta genérica cyan (hue 180-200) / violet (hue 250-280) do fork SDR
    const primaryHue = parseInt(primary.split(' ')[0]);
    expect(primaryHue >= 180 && primaryHue <= 200).toBe(false);
    expect(primaryHue >= 250 && primaryHue <= 280).toBe(false);
  });
});
