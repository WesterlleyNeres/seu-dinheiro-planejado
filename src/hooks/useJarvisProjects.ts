import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import type { JarvisProject, JarvisTask } from "@/types/jarvis";

interface CreateProjectInput {
  title: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'archived';
}

interface UpdateProjectInput extends Partial<CreateProjectInput> {}

export const useJarvisProjects = (projectId?: string) => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectsQueryKey = ["jarvis-projects", tenantId];
  const tasksQueryKey = ["jarvis-project-tasks", projectId];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectsQueryKey,
    queryFn: async () => {
      if (!tenantId) return [];
      return apiRequest<JarvisProject[]>(`/projects?tenant_id=${tenantId}`);
    },
    enabled: !!tenantId,
  });

  const { data: projectTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: tasksQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return apiRequest<JarvisTask[]>(`/projects/${projectId}/tasks`);
    },
    enabled: !!projectId,
  });

  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      return apiRequest<JarvisProject>("/projects", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "active",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast({ title: "Projeto criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar projeto", description: error.message, variant: "destructive" });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput & { id: string }) => {
      return apiRequest<JarvisProject>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast({ title: "Projeto atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar projeto", description: error.message, variant: "destructive" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/projects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      }
      toast({ title: "Projeto removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover projeto", description: error.message, variant: "destructive" });
    },
  });

  const addTaskToProject = useMutation({
    mutationFn: async ({ projectId, taskId, taskIds }: { projectId: string; taskId?: string; taskIds?: string[] }) => {
      return apiRequest(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          task_id: taskId,
          task_ids: taskIds,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast({ title: "Tarefa vinculada ao projeto" });
    },
    onError: (error) => {
      toast({ title: "Erro ao vincular tarefa", description: error.message, variant: "destructive" });
    },
  });

  const removeTaskFromProject = useMutation({
    mutationFn: async ({ projectId, taskId }: { projectId: string; taskId: string }) => {
      return apiRequest(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast({ title: "Tarefa removida do projeto" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover tarefa", description: error.message, variant: "destructive" });
    },
  });

  return {
    projects,
    isLoading,
    projectTasks,
    tasksLoading,
    createProject,
    updateProject,
    deleteProject,
    addTaskToProject,
    removeTaskFromProject,
  };
};
