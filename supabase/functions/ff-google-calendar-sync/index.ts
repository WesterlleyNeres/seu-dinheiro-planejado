import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  updated?: string;
}

// Refresh access token if expired
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(
  supabase: any,
  integration: any,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const expiry = new Date(integration.expiry);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log("Token expired or expiring soon, refreshing...");
    
    const newTokens = await refreshAccessToken(
      integration.refresh_token,
      clientId,
      clientSecret
    );

    if (!newTokens) {
      return null;
    }

    const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    // Update tokens in database
    await supabase
      .from("ff_integrations_google")
      .update({
        access_token: newTokens.access_token,
        expiry: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return newTokens.access_token;
  }

  return integration.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização necessário" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use anon key with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant_id from request body
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from("ff_integrations_google")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();

    if (integrationError || !integration || !integration.access_token) {
      return new Response(
        JSON.stringify({ error: "Integração do Google não encontrada ou não conectada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Get valid access token
    const accessToken = await getValidAccessToken(
      supabase,
      integration,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Falha ao obter token de acesso válido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate time range: 30 days ago to 90 days ahead
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);

    // Build calendar API URL
    const calendarUrl = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
    calendarUrl.searchParams.set("timeMin", timeMin.toISOString());
    calendarUrl.searchParams.set("timeMax", timeMax.toISOString());
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    calendarUrl.searchParams.set("maxResults", "250");

    // Use sync token for incremental sync if available
    if (integration.sync_token) {
      calendarUrl.searchParams.delete("timeMin");
      calendarUrl.searchParams.delete("timeMax");
      calendarUrl.searchParams.set("syncToken", integration.sync_token);
    }

    // Fetch events from Google
    const calendarResponse = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // If sync token is invalid, do full sync
    if (calendarResponse.status === 410 && integration.sync_token) {
      console.log("Sync token expired, doing full sync...");
      
      // Clear sync token and retry
      await supabase
        .from("ff_integrations_google")
        .update({ sync_token: null })
        .eq("id", integration.id);

      // Redirect to self for full sync
      return new Response(
        JSON.stringify({ error: "Sync token expirado, tente novamente" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("Calendar API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Falha ao buscar eventos do Google Calendar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calendarData = await calendarResponse.json();
    const googleEvents: GoogleEvent[] = calendarData.items || [];
    const nextSyncToken = calendarData.nextSyncToken;

    let imported = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;

    for (const gEvent of googleEvents) {
      // Handle cancelled events
      if (gEvent.status === "cancelled") {
        const { data: existingEvent } = await supabase
          .from("ff_events")
          .select("id")
          .eq("tenant_id", tenant_id)
          .eq("google_event_id", gEvent.id)
          .single();

        if (existingEvent) {
          await supabase
            .from("ff_events")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", existingEvent.id);
          deleted++;
        }
        continue;
      }

      // Skip events without start time
      if (!gEvent.start) continue;

      const isAllDay = !!gEvent.start.date;
      const startAt = gEvent.start.dateTime || `${gEvent.start.date}T00:00:00Z`;
      const endAt = gEvent.end?.dateTime || (gEvent.end?.date ? `${gEvent.end.date}T23:59:59Z` : null);

      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from("ff_events")
        .select("id, updated_at")
        .eq("tenant_id", tenant_id)
        .eq("google_event_id", gEvent.id)
        .single();

      const eventData = {
        title: gEvent.summary || "Sem título",
        description: gEvent.description || null,
        location: gEvent.location || null,
        start_at: startAt,
        end_at: endAt,
        all_day: isAllDay,
        source: "google",
        google_event_id: gEvent.id,
        google_calendar_id: "primary",
        updated_at: new Date().toISOString(),
      };

      if (existingEvent) {
        // Update if Google event is newer
        const googleUpdated = gEvent.updated ? new Date(gEvent.updated) : new Date();
        const localUpdated = new Date(existingEvent.updated_at);

        if (googleUpdated > localUpdated) {
          await supabase
            .from("ff_events")
            .update(eventData)
            .eq("id", existingEvent.id);
          updated++;
        } else {
          unchanged++;
        }
      } else {
        // Insert new event
        await supabase.from("ff_events").insert({
          ...eventData,
          tenant_id,
          created_by: user.id,
          status: "scheduled",
          priority: "medium",
        });
        imported++;
      }
    }

    // Update sync token and last_sync_at
    await supabase
      .from("ff_integrations_google")
      .update({
        sync_token: nextSyncToken || integration.sync_token,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    console.log(`Sync complete: ${imported} imported, ${updated} updated, ${deleted} deleted, ${unchanged} unchanged`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        deleted,
        unchanged,
        total: googleEvents.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
