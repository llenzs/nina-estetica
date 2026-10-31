# Nina Beleza & Estética

Plataforma SaaS de **atendimento, qualificação e agendamento com IA** dedicada para clínicas de estética, salões de beleza, biomedicina estética, harmonização orofacial e profissionais autônomos do setor.

É um fork da Nina genérica (SDR) com:

- Persona da Nina reescrita para o vocabulário do mercado de beleza (acolhimento, sem prescrição, sem vendas agressivas).
- Pipeline (`Funil de Clientes`) com estágios próprios: Novas Interessadas → Avaliação Agendada → Pós-avaliação → Negociando Pacote → Cliente Ativa / Não evoluiu.
- Paleta visual rose + gold em dark luxury, pensada pra clínicas premium.
- Mock data e seeds com procedimentos e contextos reais (botox, drenagem, microagulhamento, etc).
- Onboarding com copy específica: "Nome da Clínica/Salão" + "Nome da Assistente" em vez de "Empresa" + "SDR".

## Stack

- React 18 + Vite 6 + TypeScript
- TailwindCSS 3 + shadcn/ui + Radix UI
- Supabase (auth, banco, edge functions) — herdado do projeto original
- Playwright (testes E2E)
- Recharts, Framer Motion, Sonner

## Rodando localmente

Requisitos: Node 18+, npm.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

> O `.env` aponta para o Supabase original do fork. Para produção troque por sua própria instância Supabase e aplique os scripts de `CHAT_SYSTEM_SQL_SCRIPTS.sql` + `supabase/`.

## Testes End-to-End (Playwright)

```bash
npm run test:e2e
```

Os testes cobrem o fluxo crítico de quem usa o produto — landing/login, dashboard com vocabulário de beleza, navegação pela sidebar e identidade visual.

Para rodar em modo headed (com browser visível):

```bash
npm run test:e2e:headed
```

## Estrutura principal

```
src/
├── prompts/default-nina-prompt.ts   # ← persona da Nina (vertical beleza)
├── constants.ts                     # ← mock data com clientes/procedimentos
├── components/
│   ├── Sidebar.tsx                  # nav: Visão Geral · Funil · Atendimento · Clientes · Agenda · Profissionais
│   ├── Dashboard.tsx                # métricas de beleza (procedimentos, receita, atendimentos da Nina)
│   ├── Kanban.tsx                   # funil "Cliente Ativa" / "Em qualificação"
│   ├── onboarding/                  # wizard reescrito para clínica/salão
│   └── ...
└── assets/                          # logos novos (nina-beleza)
```

## Migrando do fork original

- `viver-de-ia-nina-webhook` → `nina-beleza-webhook` (verify token padrão)
- Paleta `--primary` cyan → rose; `--accent` violet → gold
- Logo VIA removido. Assets antigos (`icon-via.png`, `logo-via.png`, `logo-via-white.png`, `lovable-logo.png`) ainda existem em `src/assets/` mas não são mais referenciados pelo código — podem ser removidos com segurança.

---

Feito com 💖 para o mercado de beleza & estética.
