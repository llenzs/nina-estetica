# Integrações externas

Este documento define o **contrato** que qualquer integração com sistema externo deve respeitar. Hoje (2026-05) o único caso implementado é o **Google Calendar**. Quando vier o segundo provedor (Trinks, iClinic, Vagaro, etc), siga este guia em vez de reescrever do zero.

## Categorias

### Calendário / agenda
Sincronização bidirecional de eventos de atendimento.

- **Implementado**: Google Calendar
- **Candidatos futuros**: Trinks, iClinic, Vagaro, Belezix, Calendly, Outlook Calendar

### ERP / gestão (PMS)
Prontuário eletrônico, financeiro, comissão de profissional.

- **Implementado**: nenhum
- **Candidatos futuros**: Trinks, iClinic, Belezix

### Comunicação adicional
- **Implementado**: WhatsApp Cloud API
- **Candidatos futuros**: Instagram DM, Evolution API (WhatsApp não-oficial), Telegram

## Contrato de Calendar Adapter

Qualquer integração de calendário deve implementar 4 operações. Use o Google Calendar como referência (`supabase/functions/google-calendar-*`).

### 1. OAuth / autenticação

**Edge function**: `{provider}-oauth`

Endpoints:
- `GET ?action=authorize&user_id={uuid}` → retorna `{ authorize_url }` ou inicia flow específico do provider
- `GET ?action=callback&code=X&state=Y` → troca code por tokens, salva em tabela `{provider}_credentials`, retorna HTML que fecha popup

**Tabela**: `{provider}_credentials` com mínimo:
```
id, user_id, professional_id, [external_identifier],
access_token, refresh_token, token_expires_at, scope,
is_active, last_sync_at, created_at, updated_at
```

### 2. Outbound: nosso sistema → provider

Quando appointment é criado/atualizado/cancelado na Nina, propagar pro provider.

**Helpers no `nina-orchestrator/index.ts`**:
- `syncAppointmentTo{Provider}(supabase, appointment, userId)` — POST/PUT no provider
- `syncRescheduleTo{Provider}(supabase, appointment, userId)` — PATCH no provider
- `syncCancelTo{Provider}(supabase, appointment, userId)` — DELETE no provider
- Disparar com `.catch()` (best-effort, não bloqueia o orchestrator)

**Loop guard**: antes de disparar, checar `appointment.last_sync_source` — se for `'provider'` (vindo de webhook), não disparar de volta.

Persistir referência: ao criar, salvar ID do recurso externo em `appointments.{provider}_event_id` (ou usar tabela de mapping se a integração tiver mais de 1 entidade por appointment).

### 3. Inbound: provider → nosso sistema

Como o provider notifica mudanças? Três padrões comuns:

**a) Push notifications via webhook** (Google Calendar)
- Edge function `{provider}-watch` cria canal de notificação periodicamente (cron diário)
- Edge function `{provider}-webhook` recebe pushes, faz incremental sync, reconcilia com `appointments`
- Pegar `sync_token` quando disponível pra delta sync; senão, polling com `updated_at`

**b) Polling**
- Edge function `{provider}-poll` invocada por cron (5-15min)
- Lista eventos modificados desde `last_incoming_sync_at`
- Reconcilia

**c) Pull explícito**
- Provider não notifica nada; clínica precisa clicar "Sincronizar" na UI
- Pior UX, mas viável pra MVP

**Reconciliação**: ao processar evento externo, sempre marcar `appointment.last_sync_source = 'provider'` antes de update, pra evitar pingue-pongue infinito.

### 4. Disconnect

UI tem botão "Desconectar". Implementação:
- Soft delete: `UPDATE {provider}_credentials SET is_active = false WHERE user_id = X`
- Se há watch channel ativo, chamar API do provider pra parar (idempotente, ignorar erros)

## Schema genérico de log

Use a tabela `google_calendar_sync_log` como template. Recomendado: criar **uma tabela por provider** em vez de tabela genérica — facilita debugging e RLS específico. Campos comuns:

```
user_id, credential_id, appointment_id, direction, external_event_id,
status (success/failed/skipped), details (jsonb), created_at
```

Direction enum: `outbound_create | outbound_update | outbound_delete | inbound_create | inbound_update | inbound_delete | watch_renew | webhook_received`

## Quando vale fazer

**Não implementar especulativamente.** Critério: cliente pagante já usa esse provider e quer integração.

Exceções:
- Google Calendar: 80% das clínicas pequenas usam, sem custo do provider → vale ter de baixa fricção
- WhatsApp Cloud API: requisito fundamental (sem isso a Nina não existe)

Outras integrações só justificam quando o ROI tá claro (cliente fechando contrato condicionado à integração).

## ERP / Gestão (Trinks, iClinic, etc) — tratamento especial

ERPs guardam **prontuário** e **financeiro**, que são "fonte da verdade" pra clínica. Diferente de calendário, NÃO replicar dados — apenas:

1. Quando appointment é criado pela Nina, fazer **POST** no ERP pra registrar o agendamento lá
2. **Não** sincronizar de volta (o ERP já é o autoritativo pra dados clínicos)
3. Profissional consulta prontuário sempre no ERP, não no Nina

O Nina vira **front-of-funnel** (qualificar + agendar via WhatsApp) e o ERP segue como **back-of-house** (executar, faturar, comissionar).

## Integration UI pattern

Cada integração ganha 1 card em `Settings → Agenda` (ou aba dedicada se forem muitas). Padrão visual: ver `GoogleCalendarConnect.tsx`.

Mínimo no card:
- Badge status (conectado / pendente / com erro)
- E-mail/identificador da conta vinculada
- Timestamps de última sync (outbound e inbound separados)
- Botão conectar / desconectar
- Aviso de setup externo (secrets faltando)

## Custos por categoria

| Categoria | Esforço típico | Setup externo necessário |
|---|---|---|
| Google Calendar | 1-2 dias | Google Cloud Console + secrets |
| WhatsApp Cloud | 1 dia | Meta Business + secrets |
| ERP brasileiro com API REST (Trinks) | 2-3 dias | Conta Trinks + token API |
| ERP sem API documentada (iClinic enterprise) | 1-2 semanas | Negociação + sandbox |
| Calendar agregador (Cal.com, Calendly) | 1 dia | Conta + webhook |

Sempre validar com cliente real **antes** de começar. Não inverter ordem.
