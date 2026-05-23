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
    const { doi, url } = await req.json();
    if (!doi) {
      return new Response(JSON.stringify({ error: 'DOI is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const testUrl = url || `https://doi.org/${doi}`;
    let isAccessible = false;

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000); // 4s timeout
      
      const headRes = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (headRes.ok && !headRes.headers.get('content-type')?.includes('text/html')) {
        // Direct PDF or open access link
        isAccessible = true;
      }
    } catch (_) {
      isAccessible = false;
    }

    const finalLink = isAccessible ? testUrl : `https://sci-hub.se/${doi}`;

    return new Response(JSON.stringify({ isAccessible, url: finalLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
