import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

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

// Convert GUTA event to Google Calendar event format
function toGoogleEvent(event: any) {
  const googleEvent: any = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
  };

  if (event.all_day) {
    // All-day events use date (not dateTime)
    const startDate = event.start_at.split("T")[0];
    const endDate = event.end_at
      ? event.end_at.split("T")[0]
      : startDate;
    
    googleEvent.start = { date: startDate };
    googleEvent.end = { date: endDate };
  } else {
    googleEvent.start = {
      dateTime: event.start_at,
      timeZone: "America/Sao_Paulo",
    };
    googleEvent.end = {
      dateTime: event.end_at || new Date(new Date(event.start_at).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: "America/Sao_Paulo",
    };
  }

  return googleEvent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenant_id, event_id, action } = await req.json();
    
    if (!tenant_id || !event_id || !action) {
      return new Response(
        JSON.stringify({ error: "tenant_id, event_id e action são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["create", "update", "delete"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action deve ser 'create', 'update' ou 'delete'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from("ff_integrations_google")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();

    if (integrationError || !integration || !integration.access_token) {
      // No integration - silently succeed (user not connected to Google)
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "not_connected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get event
    const { data: event, error: eventError } = await supabase
      .from("ff_events")
      .select("*")
      .eq("id", event_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Evento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if event came from Google (avoid loop)
    if (event.source === "google" && action !== "delete") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "google_source" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

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

    let googleEventId = event.google_event_id;
    let result: any = {};

    if (action === "create") {
      const googleEvent = toGoogleEvent(event);
      
      const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create Google event:", errorText);
        return new Response(
          JSON.stringify({ error: "Falha ao criar evento no Google Calendar" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createdEvent = await response.json();
      googleEventId = createdEvent.id;

      // Update local event with Google ID
      await supabase
        .from("ff_events")
        .update({
          google_event_id: googleEventId,
          google_calendar_id: "primary",
          updated_at: new Date().toISOString(),
        })
        .eq("id", event_id);

      result = { action: "created", google_event_id: googleEventId };

    } else if (action === "update") {
      if (!googleEventId) {
        // Event doesn't exist in Google yet, create it
        const googleEvent = toGoogleEvent(event);
        
        const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to create Google event:", errorText);
          return new Response(
            JSON.stringify({ error: "Falha ao criar evento no Google Calendar" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const createdEvent = await response.json();
        googleEventId = createdEvent.id;

        await supabase
          .from("ff_events")
          .update({
            google_event_id: googleEventId,
            google_calendar_id: "primary",
            updated_at: new Date().toISOString(),
          })
          .eq("id", event_id);

        result = { action: "created", google_event_id: googleEventId };
      } else {
        // Update existing Google event
        const googleEvent = toGoogleEvent(event);
        
        const response = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to update Google event:", errorText);
          
          // If event not found, create it
          if (response.status === 404) {
            const createResponse = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(googleEvent),
            });

            if (createResponse.ok) {
              const createdEvent = await createResponse.json();
              await supabase
                .from("ff_events")
                .update({
                  google_event_id: createdEvent.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", event_id);
              result = { action: "recreated", google_event_id: createdEvent.id };
            } else {
              return new Response(
                JSON.stringify({ error: "Falha ao recriar evento no Google Calendar" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            return new Response(
              JSON.stringify({ error: "Falha ao atualizar evento no Google Calendar" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          result = { action: "updated", google_event_id: googleEventId };
        }
      }

    } else if (action === "delete") {
      if (googleEventId) {
        const response = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        // 204 = success, 404 = already deleted
        if (!response.ok && response.status !== 404) {
          const errorText = await response.text();
          console.error("Failed to delete Google event:", errorText);
          return new Response(
            JSON.stringify({ error: "Falha ao deletar evento do Google Calendar" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = { action: "deleted", google_event_id: googleEventId };
      } else {
        result = { action: "skipped", reason: "no_google_event_id" };
      }
    }

    console.log(`Push complete: ${JSON.stringify(result)}`);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Push error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
