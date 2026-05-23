import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paperTitle, assigneeEmail, note } = await req.json();
    if (!assigneeEmail || !paperTitle) {
      return new Response(JSON.stringify({ error: 'Missing paperTitle or assigneeEmail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // In a real Supabase environment, this would call an email API (SMTP, Resend, or SendGrid)
    // using credentials stored in Supabase Vault / Env vars.
    console.log(`Sending assignment notification to: ${assigneeEmail} for paper: "${paperTitle}"`);

    return new Response(JSON.stringify({ success: true, message: 'Notification queued successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
