import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
}

interface ConversationMessage {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: string;
  content: string;
  tool_calls: any;
  tool_call_id: string | null;
  created_at: string;
}

export function useJarvisChat() {
  const { tenant, tenantId } = useTenant();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Fetch conversation messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["jarvis-chat", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("ff_conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Filter out tool messages AND empty assistant messages for display
      return (data as ConversationMessage[])
        .filter((m) => {
          // Always show user messages
          if (m.role === "user") return true;
          // Only show assistant messages with actual content (not tool-call-only)
          if (m.role === "assistant") {
            return m.content && m.content.trim().length > 0 && !m.tool_calls;
          }
          return false;
        })
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          created_at: m.created_at,
        }));
    },
    enabled: !!conversationId,
  });

  // Fetch most recent conversation
  useQuery({
    queryKey: ["jarvis-recent-conversation", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("ff_conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("channel", "web")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setConversationId(data.id);
      }
      
      return data;
    },
    enabled: !!tenantId && !conversationId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!tenantId || !session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ff-jarvis-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message,
            conversationId,
            tenantId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error("Limite de requisições excedido. Aguarde alguns segundos.");
        }
        if (response.status === 402) {
          throw new Error("Créditos insuficientes. Adicione créditos à sua conta.");
        }
        throw new Error(errorData.error || "Erro ao enviar mensagem");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["jarvis-chat", data.conversationId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    },
  });

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    queryClient.invalidateQueries({ queryKey: ["jarvis-recent-conversation"] });
  };

  return {
    messages,
    isLoading,
    isSending: sendMessage.isPending,
    sendMessage: sendMessage.mutateAsync,
    conversationId,
    startNewConversation,
  };
}
