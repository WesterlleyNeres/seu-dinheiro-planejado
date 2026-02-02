import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LocalAttachment } from "@/components/jarvis/chat/ChatInput";

interface Attachment {
  type: "image" | "audio" | "document";
  url: string;
  name: string;
  size: number;
  mime_type: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  attachments?: Attachment[];
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
  attachments: any; // JSON from Supabase
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface SendMessageParams {
  message: string;
  attachments?: LocalAttachment[];
}

function getAttachmentType(mimeType: string): "image" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function useJarvisChat() {
  const { tenant, tenantId } = useTenant();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [wantsNewConversation, setWantsNewConversation] = useState(false);

  // Fetch all conversations for sidebar
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["jarvis-conversations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("ff_conversations")
        .select("id, title, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .eq("channel", "web")
        .order("updated_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!tenantId,
  });

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
          attachments: m.attachments || undefined,
        }));
    },
    enabled: !!conversationId,
  });

  // Fetch most recent conversation (only if not wanting a new one and no conversation selected)
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
    enabled: !!tenantId && !conversationId && !wantsNewConversation,
  });

  // Upload attachment to storage
  const uploadAttachment = async (
    file: File,
    targetConvId: string
  ): Promise<Attachment> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${tenantId}/${targetConvId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(path);

    return {
      type: getAttachmentType(file.type),
      url: urlData.publicUrl,
      name: file.name,
      size: file.size,
      mime_type: file.type,
    };
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ message, attachments }: SendMessageParams) => {
      if (!tenantId || !session?.access_token) {
        throw new Error("Não autenticado");
      }

      let uploadedAttachments: Attachment[] = [];

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        // Use temp ID if no conversation yet
        const targetConvId = conversationId || `temp-${Date.now()}`;
        
        uploadedAttachments = await Promise.all(
          attachments.map((att) => uploadAttachment(att.file, targetConvId))
        );
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
            attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
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
      if (data.conversationId) {
        setConversationId(data.conversationId);
        setWantsNewConversation(false); // Reset flag when new conversation is created
      }
      queryClient.invalidateQueries({ queryKey: ["jarvis-chat", data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["jarvis-conversations", tenantId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    },
  });

  // Rename conversation mutation
  const renameConversation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("ff_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-conversations", tenantId] });
      toast.success("Conversa renomeada");
    },
    onError: () => {
      toast.error("Erro ao renomear conversa");
    },
  });

  // Delete conversation mutation
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all messages
      const { error: messagesError } = await supabase
        .from("ff_conversation_messages")
        .delete()
        .eq("conversation_id", id);
      
      if (messagesError) throw messagesError;

      // Then delete the conversation
      const { error } = await supabase
        .from("ff_conversations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["jarvis-conversations", tenantId] });
      if (conversationId === deletedId) {
        startNewConversation();
      }
      toast.success("Conversa excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir conversa");
    },
  });

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    setWantsNewConversation(true);
    queryClient.setQueryData(["jarvis-chat", null], []); // Clear messages immediately
  };

  // Select a conversation
  const selectConversation = (id: string) => {
    setConversationId(id);
    setWantsNewConversation(false);
    queryClient.invalidateQueries({ queryKey: ["jarvis-chat", id] });
  };

  // Get current conversation
  const currentConversation = conversations.find((c) => c.id === conversationId);

  return {
    messages,
    isLoading,
    isSending: sendMessage.isPending,
    sendMessage: sendMessage.mutateAsync,
    conversationId,
    startNewConversation,
    // New exports for sidebar
    conversations,
    isLoadingConversations,
    selectConversation,
    renameConversation: renameConversation.mutate,
    deleteConversation: deleteConversation.mutate,
    currentConversation,
  };
}
