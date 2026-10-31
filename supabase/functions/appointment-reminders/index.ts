import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// F3.3 — Worker de lembretes (invocável por pg_cron a cada 5min)
//
// Setup externo necessário no Lovable Cloud:
//   1. Habilitar extensão pg_cron + pg_net
//   2. SELECT cron.schedule(
//        'nina-appointment-reminders',
//        '*/5 * * * *',
//        $$
//        SELECT net.http_post(
//          url := '<edge_function_url>/appointment-reminders',
//          headers := jsonb_build_object('Authorization', 'Bearer <service_role>')
//        );
//        $$
//      );
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();

    // Reivindica até 50 lembretes vencidos
    const { data: dueReminders, error: claimError } = await supabase
      .from('appointment_reminders')
      .select(`
        id,
        user_id,
        appointment_id,
        contact_id,
        reminder_type,
        message_body,
        appointment:appointments (
          id, title, date, time, type, status, contact_id
        ),
        contact:contacts (
          id, name, phone_number
        )
      `)
      .lte('scheduled_for', now)
      .eq('status', 'scheduled')
      .limit(50);

    if (claimError) throw claimError;

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;
    let skipped = 0;

    for (const reminder of dueReminders) {
      const appt = (reminder as any).appointment;
      const contact = (reminder as any).contact;

      // Marca em sending pra evitar race
      await supabase
        .from('appointment_reminders')
        .update({ status: 'sending' })
        .eq('id', reminder.id);

      try {
        // Skip se o appointment foi cancelado/concluído
        if (!appt || appt.status === 'cancelled' || appt.status === 'completed') {
          await supabase
            .from('appointment_reminders')
            .update({ status: 'cancelled', error_message: 'appointment not active' })
            .eq('id', reminder.id);
          skipped++;
          continue;
        }

        if (!contact?.phone_number) {
          await supabase
            .from('appointment_reminders')
            .update({ status: 'failed', error_message: 'contact without phone' })
            .eq('id', reminder.id);
          skipped++;
          continue;
        }

        // Renderiza template substituindo placeholders
        const dateFormatted = appt.date.split('-').reverse().join('/');
        const body = (reminder.message_body || '')
          .replace(/\{\{\s*cliente_nome\s*\}\}/gi, contact.name?.split(' ')[0] || 'tudo bem')
          .replace(/\{\{\s*data\s*\}\}/gi, dateFormatted)
          .replace(/\{\{\s*hora\s*\}\}/gi, appt.time)
          .replace(/\{\{\s*procedimento\s*\}\}/gi, appt.title || 'seu atendimento')
          .replace(/\{\{\s*endereco\s*\}\}/gi, '');

        // Encontra a conversation ativa do contato
        const { data: convo } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!convo) {
          await supabase
            .from('appointment_reminders')
            .update({ status: 'failed', error_message: 'no active conversation' })
            .eq('id', reminder.id);
          skipped++;
          continue;
        }

        // Enfileira no send_queue (o whatsapp-sender vai entregar)
        const { error: queueErr } = await supabase
          .from('send_queue')
          .insert({
            conversation_id: convo.id,
            contact_id: contact.id,
            content: body,
            from_type: 'nina',
            message_type: 'text',
            priority: 2,
            scheduled_at: new Date().toISOString(),
            metadata: {
              source: 'appointment_reminder',
              reminder_id: reminder.id,
              reminder_type: reminder.reminder_type,
              appointment_id: appt.id
            }
          });

        if (queueErr) throw queueErr;

        await supabase
          .from('appointment_reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminder.id);

        processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        await supabase
          .from('appointment_reminders')
          .update({
            status: 'failed',
            retry_count: (reminder as any).retry_count != null ? (reminder as any).retry_count + 1 : 1,
            error_message: errMsg
          })
          .eq('id', reminder.id);
        console.error('[Reminders] Erro processando reminder', reminder.id, errMsg);
      }
    }

    // Dispara whatsapp-sender
    fetch(`${supabaseUrl}/functions/v1/whatsapp-sender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ triggered_by: 'appointment-reminders' })
    }).catch(err => console.error('[Reminders] trigger whatsapp-sender:', err));

    return new Response(JSON.stringify({ processed, skipped, total: dueReminders.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Reminders] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
