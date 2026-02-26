import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type {
  JarvisProjectStage,
  JarvisProjectItem,
  JarvisProjectChecklistItem,
} from "@/types/jarvis";

interface ProjectStructureResponse {
  stages: JarvisProjectStage[];
}

interface CreateStageInput {
  title: string;
  sort_order?: number;
  status?: "open" | "in_progress" | "done";
}

interface UpdateStageInput extends Partial<CreateStageInput> {
  stageId: string;
}

interface CreateItemInput {
  stageId: string;
  title: string;
  description?: string | null;
  status?: "open" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  due_at?: string | null;
  sort_order?: number;
}

interface UpdateItemInput {
  itemId: string;
  title?: string;
  description?: string | null;
  status?: "open" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  stage_id?: string;
  due_at?: string | null;
  sort_order?: number;
}

interface CreateChecklistInput {
  itemId: string;
  title: string;
  sort_order?: number;
}

interface UpdateChecklistInput {
  checklistId: string;
  title?: string;
  is_done?: boolean;
  sort_order?: number;
}

const isNotFoundError = (error: unknown) => {
  return error instanceof Error && /404|nao encontrado|não encontrado|not found/i.test(error.message);
};

export const useJarvisProjectStructure = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const structureQueryKey = ["jarvis-project-structure", projectId];

  const { data, isLoading } = useQuery({
    queryKey: structureQueryKey,
    queryFn: async () => {
      if (!projectId) return { stages: [] } as ProjectStructureResponse;
      try {
        return await apiRequest<ProjectStructureResponse>(`/projects/${projectId}/structure`);
      } catch (error) {
        if (isNotFoundError(error)) return { stages: [] } as ProjectStructureResponse;
        throw error;
      }
    },
    enabled: !!projectId,
    retry: (failureCount, error) => {
      if (isNotFoundError(error)) return false;
      return failureCount < 2;
    },
  });

  const stages = data?.stages ?? [];

  const createStage = useMutation({
    mutationFn: async (input: CreateStageInput) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest<JarvisProjectStage>(`/projects/${projectId}/stages`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Etapa criada com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ stageId, ...input }: UpdateStageInput) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest<JarvisProjectStage>(`/projects/${projectId}/stages/${stageId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Etapa atualizada" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async ({ stageId }: { stageId: string }) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest(`/projects/${projectId}/stages/${stageId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Etapa removida" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createItem = useMutation({
    mutationFn: async ({ stageId, ...input }: CreateItemInput) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest<JarvisProjectItem>(`/projects/${projectId}/stages/${stageId}/items`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Subtarefa criada" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar subtarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, ...input }: UpdateItemInput) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest<JarvisProjectItem>(`/projects/${projectId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Subtarefa atualizada" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar subtarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!projectId) throw new Error("Projeto nao selecionado");
      return apiRequest(`/projects/${projectId}/items/${itemId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Subtarefa removida" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover subtarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createChecklistItem = useMutation({
    mutationFn: async ({ itemId, ...input }: CreateChecklistInput) => {
      return apiRequest<JarvisProjectChecklistItem>(`/projects/items/${itemId}/checklist`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Checklist adicionada" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateChecklistItem = useMutation({
    mutationFn: async ({ checklistId, ...input }: UpdateChecklistInput) => {
      return apiRequest<JarvisProjectChecklistItem>(`/projects/checklist/${checklistId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteChecklistItem = useMutation({
    mutationFn: async ({ checklistId }: { checklistId: string }) => {
      return apiRequest(`/projects/checklist/${checklistId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: structureQueryKey });
      toast({ title: "Checklist removida" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    createItem,
    updateItem,
    deleteItem,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  };
};
