import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    const { data: expiredAgents, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .lt('expiration_date', now)
      .neq('status', 'completed')
      .neq('status', 'expired');

    if (fetchError) throw fetchError;

    if (expiredAgents && expiredAgents.length > 0) {
      const agentIds = expiredAgents.map(a => a.id);

      await supabase
        .from('agents')
        .update({ status: 'expired' })
        .in('id', agentIds);

      for (const agent of expiredAgents) {
        await supabase.from('activity_log').insert({
          agent_id: agent.id,
          action: 'link_expired',
          details: `Link expired for ${agent.first_name} ${agent.last_name}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Expiration check completed',
        expired_count: expiredAgents?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});