## Diagnóstico

Investiguei o banco e o código. Há duas situações distintas:

### 1. Prompt antigo de "Viver de IA" está salvo no banco
O registro de `nina_settings` que a bootstrap migration deixou no banco contém o **prompt antigo da Nina como vendedora do Viver de IA** (5.699 caracteres começando com *"Você é a Nina, Assistente de Relacionamento e Vendas do Viver de IA"*), não o `DEFAULT_NINA_PROMPT` do nicho beleza/estética que existe em `src/prompts/default-nina-prompt.ts`.

Como o `AgentSettings.tsx` faz `system_prompt_override ?? DEFAULT_NINA_PROMPT`, ele carrega exatamente o que está no banco — ou seja, o prompt errado. Por isso o textarea aparece com conteúdo "errado" (ou em branco enquanto o cache do preview ainda mostra estado antigo).

### 2. Badge "Somente leitura" no screenshot
No banco, o usuário `henrique.cardoso@viverdeia.ai` **já tem role `admin`** (a migration anterior funcionou). O badge "Somente Leitura" que aparece no screenshot é estado antigo do preview antes do último restart. Após restart o badge mostra "Admin" corretamente — mas vamos confirmar com um novo restart depois da migration.

## Plano

### Passo 1 — Migration: zerar override para usar DEFAULT_NINA_PROMPT
Setar `system_prompt_override = NULL` no registro existente de `nina_settings`. Assim o frontend cai automaticamente no fallback `DEFAULT_NINA_PROMPT` (versão beleza/estética com Nina acolhedora, vocabulário de procedimentos estéticos, etc.) sem precisar duplicar o texto no SQL.

```sql
UPDATE public.nina_settings
SET system_prompt_override = NULL,
    updated_at = now()
WHERE system_prompt_override LIKE '%Viver de IA%'
   OR system_prompt_override LIKE '%Assistente de Relacionamento e Vendas%';
```

Vantagem: a fonte da verdade do prompt de beleza vira o arquivo `default-nina-prompt.ts` (versionado no Git). O admin só vai gravar override quando customizar de verdade.

### Passo 2 — Restart do dev server
Para limpar o cache do preview e garantir que o badge "Admin" + o prompt de beleza apareçam carregados no textarea.

### Passo 3 — Verificação
Abrir Settings → Agente e confirmar:
- Badge **"Admin"** (não mais "Somente Leitura")
- Textarea preenchida com o prompt da Nina **beleza/estética** (começa com *"Você é a Nina, assistente virtual de atendimento e agendamento da {{ clinica_nome }}…"*)
- Botão **Salvar Alterações** habilitado

## Fora de escopo

- Não vou tocar no `useCompanySettings` nem em RLS — está tudo correto, era cache.
- Não vou alterar o `AgentSettings.tsx` — a lógica de fallback já está certa.
