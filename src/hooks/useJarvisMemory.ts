import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { JarvisMemoryItem } from "@/types/jarvis";
import type { Json } from "@/integrations/supabase/types";

interface CreateMemoryInput {
  kind: string;
  content: string;
  title?: string;
  metadata?: Json;
  source?: string;
}

export const useJarvisMemory = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["jarvis-memory", tenantId];

  const { data: memoryItems = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("ff_memory_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JarvisMemoryItem[];
    },
    enabled: !!tenantId,
  });

  const createMemoryItem = useMutation({
    mutationFn: async (input: CreateMemoryInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      const { data, error } = await supabase
        .from("ff_memory_items")
        .insert([{
          tenant_id: tenantId,
          user_id: user.id,
          kind: input.kind,
          title: input.title || null,
          content: input.content,
          metadata: input.metadata || {},
          source: input.source || "manual",
        }])
        .select()
        .single();

      if (error) throw error;
      return data as JarvisMemoryItem;
    },
    // Optimistic update para inserir no topo instantaneamente
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousItems = queryClient.getQueryData<JarvisMemoryItem[]>(queryKey);
      
      // Criar item temporário
      const optimisticItem: JarvisMemoryItem = {
        id: `temp-${Date.now()}`,
        tenant_id: tenantId!,
        user_id: user!.id,
        kind: input.kind,
        title: input.title || null,
        content: input.content,
        metadata: (input.metadata || {}) as Record<string, unknown>,
        source: input.source || "manual",
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData<JarvisMemoryItem[]>(queryKey, (old) => 
        [optimisticItem, ...(old || [])]
      );
      
      return { previousItems };
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousItems);
      toast({ title: "Erro ao salvar memória", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      toast({ title: "Memória salva!" });
    },
  });

  const deleteMemoryItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ff_memory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Memória removida!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover memória", description: error.message, variant: "destructive" });
    },
  });

  const searchMemory = (query: string) => {
    if (!query.trim()) return memoryItems;
    const lowerQuery = query.toLowerCase();
    return memoryItems.filter(
      (item) =>
        item.content.toLowerCase().includes(lowerQuery) ||
        item.title?.toLowerCase().includes(lowerQuery) ||
        item.kind.toLowerCase().includes(lowerQuery)
    );
  };

  const getByKind = (kind: string) => {
    return memoryItems.filter((item) => item.kind === kind);
  };

  return {
    memoryItems,
    isLoading,
    error,
    createMemoryItem,
    deleteMemoryItem,
    searchMemory,
    getByKind,
  };
};
