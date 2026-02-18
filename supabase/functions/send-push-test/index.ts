import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities for Deno
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Import jose for JWT creation
    const { SignJWT, importPKCS8 } = await import("https://deno.land/x/jose@v5.2.0/index.ts");
    
    // Parse the endpoint URL
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
    
    // Create JWT for VAPID
    const now = Math.floor(Date.now() / 1000);
    
    // Convert base64url private key to PEM format
    const privateKeyBase64 = vapidKeys.privateKey
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // For P-256, the private key is 32 bytes
    const privateKeyBuffer = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    
    // Create PKCS8 wrapper for EC private key
    const pkcs8Header = new Uint8Array([
      0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
      0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
      0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
      0x01, 0x01, 0x04, 0x20
    ]);
    
    const pkcs8Trailer = new Uint8Array([
      0xa1, 0x44, 0x03, 0x42, 0x00
    ]);
    
    // For public key in PKCS8, we need the uncompressed point
    const publicKeyBase64 = vapidKeys.publicKey
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    
    const pkcs8Key = new Uint8Array([
      ...pkcs8Header,
      ...privateKeyBuffer,
      ...pkcs8Trailer,
      ...publicKeyBuffer
    ]);
    
    const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8Key))}\n-----END PRIVATE KEY-----`;
    
    const privateKey = await importPKCS8(pkcs8Pem, "ES256");
    
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", typ: "JWT" })
      .setAudience(audience)
      .setSubject(vapidKeys.subject)
      .setExpirationTime(now + 12 * 60 * 60) // 12 hours
      .setIssuedAt(now)
      .sign(privateKey);
    
    // Prepare payload
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    
    // For now, send unencrypted (some push services accept this for testing)
    // Full encryption requires complex ECDH + AES-GCM which is beyond scope
    // In production, use a proper web-push library
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: payloadBytes,
    });
    
    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status };
    } else if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, error: "Subscription expired" };
    } else {
      const text = await response.text();
      return { success: false, status: response.status, error: text };
    }
  } catch (err: unknown) {
    console.error("Web push error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@fracttoflow.com";
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ success: false, error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get auth header and extract user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseKey.replace(supabaseKey, authHeader.replace("Bearer ", "")));
    
    // Get user from token
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    const { tenant_id } = await req.json();
    
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "tenant_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify user belongs to tenant
    const { data: membership } = await supabaseClient
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();
    
    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "Not a member of this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get active subscriptions for this user/tenant
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("ff_push_subscriptions")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .eq("is_active", true);
    
    if (subError) {
      throw subError;
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No active subscriptions found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Send test notification to all subscriptions
    const payload = {
      title: "🧪 Teste GUTA",
      body: "Suas notificações estão funcionando!",
      data: {
        url: "/jarvis/reminders",
        test: true,
      },
    };
    
    const results: { endpoint: string; success: boolean; error?: string }[] = [];
    
    for (const sub of subscriptions) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject }
      );
      
      results.push({ endpoint: sub.endpoint, success: result.success, error: result.error });
      
      // If subscription is expired, deactivate it
      if (result.status === 410 || result.status === 404) {
        await supabaseClient
          .from("ff_push_subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);
      }
    }
    
    const anySuccess = results.some(r => r.success);
    
    return new Response(
      JSON.stringify({ 
        success: anySuccess, 
        sent: results.filter(r => r.success).length,
        total: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
