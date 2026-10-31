import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');

/**
 * Cobertura de regressão por filesystem — barato e captura "alguém apagou
 * um arquivo importante" sem precisar logar/renderizar.
 *
 * Testes mais profundos de comportamento ficam nas specs *.spec.ts que
 * usam helpers/auth.
 */
test.describe('Nina Beleza · features novas — presença e conteúdo', () => {
  test('docs/INTEGRATIONS.md descreve contrato de 4 operações', () => {
    const doc = readFileSync(resolve(repo, 'docs', 'INTEGRATIONS.md'), 'utf-8');
    expect(doc).toMatch(/Calendar Adapter/);
    expect(doc).toMatch(/OAuth/);
    expect(doc).toMatch(/Outbound/);
    expect(doc).toMatch(/Inbound/);
    expect(doc).toMatch(/Disconnect/);
    expect(doc).toMatch(/Trinks/);
    expect(doc).toMatch(/iClinic/);
  });

  test('migration de cron + app_config existe', () => {
    const path = resolve(repo, 'supabase/migrations/20260525140501_cron_jobs_and_app_config.sql');
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, 'utf-8');
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_cron/);
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_net/);
    expect(sql).toMatch(/nina-appointment-reminders/);
    expect(sql).toMatch(/nina-gcal-watch-renew/);
    expect(sql).toMatch(/app_config/);
  });

  test('migration two-way sync Google Calendar existe', () => {
    const path = resolve(repo, 'supabase/migrations/20260524033504_google_calendar_two_way_sync.sql');
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, 'utf-8');
    expect(sql).toMatch(/watch_channel_id/);
    expect(sql).toMatch(/sync_token/);
    expect(sql).toMatch(/last_sync_source/);
    expect(sql).toMatch(/google_calendar_sync_log/);
  });

  test('migration F3 (procedures/calendar/reminders/photos) existe', () => {
    const path = resolve(repo, 'supabase/migrations/20260522223353_f3_procedures_calendar_reminders_photos.sql');
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, 'utf-8');
    expect(sql).toMatch(/CREATE TABLE.+procedures/i);
    expect(sql).toMatch(/CREATE TABLE.+appointment_reminders/i);
    expect(sql).toMatch(/CREATE TABLE.+contact_photos/i);
    expect(sql).toMatch(/CREATE TABLE.+google_calendar_credentials/i);
    expect(sql).toMatch(/contact-photos/);
  });

  test('edge functions de Google Calendar 2-way existem', () => {
    const fns = [
      'supabase/functions/google-calendar-oauth/index.ts',
      'supabase/functions/google-calendar-watch/index.ts',
      'supabase/functions/google-calendar-webhook/index.ts',
    ];
    for (const f of fns) expect(existsSync(resolve(repo, f))).toBe(true);
  });

  test('edge function appointment-reminders existe e respeita contrato', () => {
    const code = readFileSync(
      resolve(repo, 'supabase/functions/appointment-reminders/index.ts'),
      'utf-8'
    );
    expect(code).toMatch(/appointment_reminders/);
    expect(code).toMatch(/send_queue/);
    expect(code).toMatch(/whatsapp-sender/);
    expect(code).toMatch(/cliente_nome/); // placeholder
  });

  test('nina-orchestrator tem tools list_procedures + appointment com enum beleza', () => {
    const code = readFileSync(
      resolve(repo, 'supabase/functions/nina-orchestrator/index.ts'),
      'utf-8'
    );
    expect(code).toMatch(/listProceduresTool/);
    expect(code).toMatch(/queryProcedures/);
    expect(code).toMatch(/syncRescheduleToGoogleCalendar/);
    expect(code).toMatch(/syncCancelToGoogleCalendar/);
    // Enum novo do create_appointment
    expect(code).toMatch(/"evaluation",\s*"procedure",\s*"followup",\s*"return"/);
    // Não deve mais ter o enum antigo SDR
    expect(code).not.toMatch(/"demo",\s*"meeting",\s*"support",\s*"followup"\]/);
  });

  test('StepFinish removeu form de teste sintético', () => {
    const code = readFileSync(
      resolve(repo, 'src/components/onboarding/StepFinish.tsx'),
      'utf-8'
    );
    // Removido: form de envio de mensagem teste
    expect(code).not.toMatch(/test-whatsapp-message/);
    expect(code).not.toMatch(/handleSendTest/);
    expect(code).not.toMatch(/Enviar Teste/);
    // Adicionado: instrução de teste real (cliente → Nina)
    expect(code).toMatch(/Teste a \{assistantName\} de verdade/);
    expect(code).toMatch(/Smartphone/);
  });

  test('UIs novas existem como componentes', () => {
    const components = [
      'src/components/settings/ProceduresManager.tsx',
      'src/components/settings/GoogleCalendarConnect.tsx',
      'src/components/settings/RemindersManager.tsx',
      'src/components/settings/AppConfigCard.tsx',
      'src/components/ContactPhotosSheet.tsx',
      'src/components/ThemeToggle.tsx',
      'src/hooks/useTheme.tsx',
    ];
    for (const f of components) expect(existsSync(resolve(repo, f))).toBe(true);
  });

  test('ApiSettings ganhou campo Business Account ID (WABA)', () => {
    const code = readFileSync(
      resolve(repo, 'src/components/settings/ApiSettings.tsx'),
      'utf-8'
    );
    expect(code).toMatch(/whatsapp_business_account_id/);
    expect(code).toMatch(/Business Account ID/);
  });

  test('prompt da Nina veta vocabulário agressivo de venda', () => {
    const promptFile = readFileSync(
      resolve(repo, 'src/prompts/default-nina-prompt.ts'),
      'utf-8'
    );
    // Proibições clínicas explícitas
    expect(promptFile).toMatch(/última vaga/i);
    expect(promptFile).toMatch(/promoção relâmpago/i);
    expect(promptFile).toMatch(/diagnóstico/i);
    // Tom acolhedor
    expect(promptFile).toMatch(/acolhimento/i);
    expect(promptFile).toMatch(/avaliação/i);
  });
});
