import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
  Clock,
  LayoutGrid,
  CalendarDays,
  GripVertical,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisProjects } from "@/hooks/useJarvisProjects";
import { useJarvisProjectStructure } from "@/hooks/useJarvisProjectStructure";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { useToast } from "@/hooks/use-toast";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  JarvisProject,
  JarvisProjectStage,
  JarvisProjectItem,
  JarvisProjectChecklistItem,
  JarvisTask,
} from "@/types/jarvis";

const PROJECT_TEMPLATES = [
  {
    id: "kanban-basico",
    name: "Kanban básico",
    description: "A fazer → Em andamento → Feito",
    stages: [
      { title: "A fazer", items: [] },
      { title: "Em andamento", items: [] },
      { title: "Feito", items: [] },
    ],
  },
  {
    id: "integracao-sistemas",
    name: "Integração de sistemas",
    description: "Mapeamento, implementação e validação",
    stages: [
      {
        title: "Mapeamento",
        items: [
          {
            title: "Levantamento de campos",
            checklist: ["Origem", "Destino", "Regras de transformação"],
          },
          {
            title: "Mapear contatos",
            checklist: ["Nome", "Email", "Telefone"],
          },
          {
            title: "Mapear empresas",
            checklist: ["Razão social", "CNPJ", "Endereço"],
          },
        ],
      },
      {
        title: "Implementação",
        items: [
          {
            title: "Criar pipelines",
            checklist: ["ETL", "Logs", "Tratamento de erros"],
          },
          {
            title: "Testes de integração",
            checklist: ["Casos positivos", "Casos negativos"],
          },
        ],
      },
      {
        title: "Validação",
        items: [
          {
            title: "QA funcional",
            checklist: ["Checklist completo", "Aprovação"],
          },
        ],
      },
    ],
  },
  {
    id: "produto-mvp",
    name: "Produto MVP",
    description: "Descoberta → Construção → Lançamento",
    stages: [
      {
        title: "Descoberta",
        items: [
          {
            title: "Definir problema",
            checklist: ["Usuários", "Dores", "Objetivo"],
          },
          {
            title: "Hipóteses",
            checklist: ["Métrica de sucesso", "Teste"],
          },
        ],
      },
      {
        title: "Construção",
        items: [
          {
            title: "Backlog priorizado",
            checklist: ["Must", "Should", "Could"],
          },
          {
            title: "Desenvolver MVP",
            checklist: ["Sprint 1", "Sprint 2"],
          },
        ],
      },
      {
        title: "Lançamento",
        items: [
          {
            title: "Plano de rollout",
            checklist: ["Comunicação", "Monitoramento"],
          },
        ],
      },
    ],
  },
];

const DEFAULT_STAGE_TITLES = ["A fazer", "Em andamento", "Feito"];

const STATUS_LABELS: Record<JarvisProject["status"], string> = {
  active: "Ativo",
  completed: "Concluído",
  archived: "Arquivado",
};

const ITEM_STATUS_LABELS: Record<JarvisProjectItem["status"], string> = {
  open: "A fazer",
  in_progress: "Em andamento",
  done: "Concluído",
};

const TASK_COLUMNS = [
  { key: "open", title: "A fazer", icon: Circle },
  { key: "in_progress", title: "Em andamento", icon: Clock },
  { key: "done", title: "Concluídas", icon: CheckCircle },
] as const;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR");
};

const resolveStatusFromStageTitle = (title: string): JarvisProjectItem["status"] | null => {
  const normalized = (title || "").toLowerCase();
  if (/(feito|conclu|done|final)/i.test(normalized)) return "done";
  if (/(andamento|progress|execu|doing)/i.test(normalized)) return "in_progress";
  if (/(a fazer|aberto|open|backlog|pendente)/i.test(normalized)) return "open";
  return null;
};

const resolveStatusFromChecklist = (item: JarvisProjectItem, stageTitle?: string): JarvisProjectItem["status"] => {
  const forced = stageTitle ? resolveStatusFromStageTitle(stageTitle) : null;
  if (forced) return forced;
  const total = item.checklist_items?.length ?? 0;
  const done = item.checklist_items?.filter((check) => check.is_done).length ?? 0;
  if (total === 0) return item.status;
  if (done === 0) return "open";
  if (done >= total) return "done";
  return "in_progress";
};

export default function JarvisProjects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { loading: tenantLoading, tenantId } = useTenant();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<JarvisProject | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<JarvisTask | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedExistingTaskIds, setSelectedExistingTaskIds] = useState<string[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isCreatingDefaultStages, setIsCreatingDefaultStages] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState("");
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [newChecklistTitles, setNewChecklistTitles] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<"structure" | "kanban">("structure");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JarvisProjectItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemStatus, setItemStatus] = useState<JarvisProjectItem["status"]>("open");
  const [itemPriority, setItemPriority] = useState<JarvisProjectItem["priority"]>("medium");
  const [activeItemComposer, setActiveItemComposer] = useState<string | null>(null);
  const [stageComposerOpen, setStageComposerOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ itemId: string; stageId: string } | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  const {
    projects,
    isLoading,
    projectTasks,
    tasksLoading,
    createProject,
    updateProject,
    deleteProject,
    addTaskToProject,
    removeTaskFromProject,
    cleanupChatTasks,
  } = useJarvisProjects(selectedProjectId ?? undefined);

  const {
    stages,
    isLoading: structureLoading,
    createStage,
    updateStage,
    deleteStage,
    createItem,
    updateItem,
    deleteItem,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useJarvisProjectStructure(selectedProjectId ?? undefined);

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    allTags,
  } = useJarvisTasks();

  const refreshProjectTasks = useCallback(() => {
    if (selectedProjectId) {
      queryClient.invalidateQueries({ queryKey: ["jarvis-project-tasks", selectedProjectId] });
    }
  }, [queryClient, selectedProjectId]);

  useEffect(() => {
    if (projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId(null);
      return;
    }

    const exists = projects.some((project) => project.id === selectedProjectId);
    if (!selectedProjectId || !exists) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedItem) return;
    setItemTitle(selectedItem.title);
    setItemDescription(selectedItem.description ?? "");
    setItemStatus(selectedItem.status);
    setItemPriority(selectedItem.priority);
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    const refreshed = stages
      .flatMap((stage) => stage.items ?? [])
      .find((item) => item.id === selectedItem.id);

    if (!refreshed) {
      setItemDialogOpen(false);
      setSelectedItem(null);
      return;
    }

    setSelectedItem(refreshed);
  }, [stages, selectedItem?.id]);

  useEffect(() => {
    setNewStageTitle("");
    setNewItemTitles({});
    setNewChecklistTitles({});
    setStageComposerOpen(false);
    setActiveItemComposer(null);
  }, [selectedProjectId]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, JarvisTask[]> = {
      open: [],
      in_progress: [],
      done: [],
    };

    projectTasks.forEach((task) => {
      grouped[task.status]?.push(task);
    });

    return grouped;
  }, [projectTasks]);

  const availableTasks = useMemo(() => {
    const linkedIds = new Set(projectTasks.map((task) => task.id));
    const search = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      if (linkedIds.has(task.id)) return false;
      if (!search) return true;
      return (
        task.title.toLowerCase().includes(search) ||
        (task.description ?? "").toLowerCase().includes(search)
      );
    });
  }, [projectTasks, tasks, taskSearch]);

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();
    if (!search) return projects;
    return projects.filter((project) =>
      project.title.toLowerCase().includes(search) ||
      (project.description ?? "").toLowerCase().includes(search)
    );
  }, [projects, projectSearch]);

  const projectProgress = useMemo(() => {
    const total = projectTasks.length;
    if (total === 0) return 0;
    const done = projectTasks.filter((task) => task.status === "done").length;
    return Math.round((done / total) * 100);
  }, [projectTasks]);

  const getChecklistProgress = (item: JarvisProjectItem) => {
    const total = item.checklist_items?.length ?? 0;
    const done = item.checklist_items?.filter((check) => check.is_done).length ?? 0;
    return { total, done };
  };

  const getStageSummary = (stage: JarvisProjectStage) => {
    const items = stage.items ?? [];
    let totalChecklist = 0;
    let doneChecklist = 0;
    items.forEach((item) => {
      const { total, done } = getChecklistProgress(item);
      totalChecklist += total;
      doneChecklist += done;
    });
    return {
      totalItems: items.length,
      totalChecklist,
      doneChecklist,
    };
  };

  const selectedItemStage = useMemo(() => {
    if (!selectedItem) return null;
    return stages.find((stage) => stage.id === selectedItem.stage_id) || null;
  }, [stages, selectedItem]);

  const updateItemsOrder = useCallback(
    async (stageId: string, items: JarvisProjectItem[], options?: { forceStatus?: JarvisProjectItem["status"] }) => {
      if (!selectedProjectId) return;
      const forceStatus = options?.forceStatus;
      const updates = items.flatMap((item, index) => {
        const needsSort = item.sort_order !== index;
        const needsStage = item.stage_id !== stageId;
        const needsStatus = Boolean(forceStatus) && item.status !== forceStatus;
        const payload: Record<string, unknown> = {};
        if (needsSort) payload.sort_order = index;
        if (needsStage) payload.stage_id = stageId;
        if (needsStatus) payload.status = forceStatus;
        if (Object.keys(payload).length === 0) return [];
        return [
          apiRequest("/projects/" + selectedProjectId + "/items/" + item.id, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
        ];
      });

      if (updates.length === 0) return;
      await Promise.all(updates);
    },
    [selectedProjectId]
  );

  const resetDragState = () => {
    setDraggedItem(null);
    setDragOverStageId(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (item: JarvisProjectItem, stageId: string) => (event) => {
    if (isReordering) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    setDraggedItem({ itemId: item.id, stageId });
  };

  const handleDragOver = (event, stageId: string, index: number) => {
    if (!draggedItem || isReordering) return;
    event.preventDefault();
    setDragOverStageId(stageId);
    setDragOverIndex(index);
  };

  const handleDropOnStage = async (event, stageId: string, index: number) => {
    if (!draggedItem || isReordering) return;
    event.preventDefault();

    const sourceStage = stages.find((stage) => stage.id === draggedItem.stageId);
    const targetStage = stages.find((stage) => stage.id === stageId);
    if (!sourceStage || !targetStage) {
      resetDragState();
      return;
    }

    const sourceItems = [...(sourceStage.items ?? [])];
    const targetItems = draggedItem.stageId === stageId ? sourceItems : [...(targetStage.items ?? [])];
    const movedIndex = sourceItems.findIndex((item) => item.id === draggedItem.itemId);
    if (movedIndex === -1) {
      resetDragState();
      return;
    }

    const originalOrder = (sourceStage.items ?? []).map((item) => item.id);
    const [movedItem] = sourceItems.splice(movedIndex, 1);

    let nextIndex = index;
    if (draggedItem.stageId === stageId && movedIndex < index) {
      nextIndex -= 1;
    }
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex > targetItems.length) nextIndex = targetItems.length;

    targetItems.splice(nextIndex, 0, { ...movedItem, stage_id: stageId });

    if (draggedItem.stageId === stageId) {
      const nextOrder = targetItems.map((item) => item.id);
      if (originalOrder.join("|") === nextOrder.join("|")) {
        resetDragState();
        return;
      }
    }

    const targetStatus = draggedItem.stageId !== stageId
      ? resolveStatusFromStageTitle(targetStage.title)
      : null;

    setIsReordering(true);
    try {
      await updateItemsOrder(stageId, targetItems, { forceStatus: targetStatus || undefined });
      if (draggedItem.stageId !== stageId) {
        await updateItemsOrder(draggedItem.stageId, sourceItems);
      }
      await queryClient.invalidateQueries({ queryKey: ["jarvis-project-structure", selectedProjectId] });
    } catch (error) {
      console.error(error);
    } finally {
      setIsReordering(false);
      resetDragState();
    }
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const handleCreateProject = (values: { title: string; description?: string; status?: string }) => {
    createProject.mutate({
      title: values.title,
      description: values.description ?? null,
      status: (values.status as JarvisProject["status"]) ?? "active",
    });
  };

  const handleUpdateProject = (values: { title: string; description?: string; status?: string }) => {
    if (!editingProject) return;
    updateProject.mutate({
      id: editingProject.id,
      title: values.title,
      description: values.description ?? null,
      status: (values.status as JarvisProject["status"]) ?? editingProject.status,
    });
    setEditingProject(null);
  };

  const handleDeleteProject = async (project: JarvisProject) => {
    if (!confirm(`Excluir o projeto "${project.title}"? As tarefas não serão apagadas.`)) {
      return;
    }
    try {
      await deleteProject.mutateAsync(project.id);
      if (selectedProjectId === project.id) {
        const nextProject = projects.find((item) => item.id !== project.id) || null;
        setSelectedProjectId(nextProject?.id ?? null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTask = async (values: any) => {
    if (!selectedProject) return;

    try {
      const created = await createTask.mutateAsync({
        title: values.title,
        description: values.description,
        priority: values.priority,
        due_at: values.due_at ?? null,
        tags: values.tags ?? [],
      });

      await addTaskToProject.mutateAsync({
        projectId: selectedProject.id,
        taskId: created.id,
      });
      refreshProjectTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateTask = (values: any) => {
    if (!editingTask) return;
    updateTask.mutate(
      { id: editingTask.id, ...values },
      {
        onSuccess: () => {
          refreshProjectTasks();
        },
      }
    );
    setEditingTask(null);
  };

  const handleStatusChange = (taskId: string, status: JarvisTask["status"]) => {
    updateTask.mutate(
      { id: taskId, status },
      {
        onSuccess: () => {
          refreshProjectTasks();
        },
      }
    );
  };

  const handleEditTask = (task: JarvisTask) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleRemoveTask = (taskId: string) => {
    if (!selectedProject) return;
    if (confirm("Remover tarefa deste projeto?")) {
      removeTaskFromProject.mutate({ projectId: selectedProject.id, taskId });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Excluir tarefa permanentemente?")) {
      deleteTask.mutate(taskId, {
        onSuccess: () => {
          refreshProjectTasks();
          if (tenantId) {
            queryClient.invalidateQueries({ queryKey: ["jarvis-projects", tenantId] });
          }
        },
      });
    }
  };

  const handleLinkExistingTasks = async () => {
    if (!selectedProject || selectedExistingTaskIds.length === 0) return;
    try {
      await addTaskToProject.mutateAsync({
        projectId: selectedProject.id,
        taskIds: selectedExistingTaskIds,
      });
      setSelectedExistingTaskIds([]);
      setTaskSearch("");
      setLinkDialogOpen(false);
      refreshProjectTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedProject || !selectedTemplate) return;
    const template = PROJECT_TEMPLATES.find((item) => item.id === selectedTemplate);
    if (!template) return;

    setIsApplyingTemplate(true);

    try {
      const stageMap = new Map(stages.map((stage) => [stage.title.toLowerCase(), stage]));
      let createdStages = 0;
      let createdItems = 0;
      let createdChecklist = 0;

      for (let stageIndex = 0; stageIndex < template.stages.length; stageIndex += 1) {
        const stageTemplate = template.stages[stageIndex];
        const stageKey = stageTemplate.title.toLowerCase();
        let stageRecord = stageMap.get(stageKey) || null;

        if (!stageRecord) {
          stageRecord = await apiRequest("/projects/" + selectedProject.id + "/stages", {
            method: "POST",
            body: JSON.stringify({
              title: stageTemplate.title,
              sort_order: stages.length + stageIndex,
              status: "open",
            }),
          });
          stageMap.set(stageKey, stageRecord);
          createdStages += 1;
        }

        const existingItems = stageRecord.items ?? [];
        const itemMap = new Map(existingItems.map((item) => [item.title.toLowerCase(), item]));

        for (let itemIndex = 0; itemIndex < stageTemplate.items.length; itemIndex += 1) {
          const itemTemplate = stageTemplate.items[itemIndex];
          const itemKey = itemTemplate.title.toLowerCase();
          let itemRecord = itemMap.get(itemKey) || null;

          if (!itemRecord) {
            itemRecord = await apiRequest("/projects/" + selectedProject.id + "/stages/" + stageRecord.id + "/items", {
              method: "POST",
              body: JSON.stringify({
                title: itemTemplate.title,
                description: null,
                status: "open",
                priority: "medium",
                due_at: null,
                sort_order: existingItems.length + itemIndex,
              }),
            });
            itemMap.set(itemKey, itemRecord);
            createdItems += 1;
          }

          const checklistItems = itemRecord.checklist_items ?? [];
          const checklistSet = new Set(checklistItems.map((check) => check.title.toLowerCase()));
          for (let checkIndex = 0; checkIndex < (itemTemplate.checklist ?? []).length; checkIndex += 1) {
            const checkTitle = itemTemplate.checklist[checkIndex];
            if (!checkTitle) continue;
            const key = checkTitle.toLowerCase();
            if (checklistSet.has(key)) continue;
            await apiRequest("/projects/items/" + itemRecord.id + "/checklist", {
              method: "POST",
              body: JSON.stringify({
                title: checkTitle,
                sort_order: checklistItems.length + checkIndex,
              }),
            });
            checklistSet.add(key);
            createdChecklist += 1;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["jarvis-project-structure", selectedProject.id] });
      toast({
        title: "Template aplicado",
        description: "Criamos " + createdStages + " lista(s), " + createdItems + " cartão(ões) e " + createdChecklist + " item(ns) de checklist.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao aplicar template",
        description: error instanceof Error ? error.message : "Não foi possível aplicar o template.",
        variant: "destructive",
      });
    }

    setIsApplyingTemplate(false);
    setSelectedTemplate("");
  };

  const handleCreateDefaultStages = async () => {
    if (!selectedProject || stages.length > 0) return;
    setIsCreatingDefaultStages(true);

    try {
      for (let i = 0; i < DEFAULT_STAGE_TITLES.length; i += 1) {
        await apiRequest("/projects/" + selectedProject.id + "/stages", {
          method: "POST",
          body: JSON.stringify({
            title: DEFAULT_STAGE_TITLES[i],
            sort_order: i,
            status: resolveStatusFromStageTitle(DEFAULT_STAGE_TITLES[i]) ?? "open",
          }),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["jarvis-project-structure", selectedProject.id] });
      toast({ title: "Listas padrão criadas" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao criar listas",
        description: error instanceof Error ? error.message : "Não foi possível criar as listas.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDefaultStages(false);
    }
  };

  const handleCreateStage = async () => {
    const title = newStageTitle.trim();
    if (!title) return;
    try {
      await createStage.mutateAsync({ title, sort_order: stages.length });
      setNewStageTitle("");
      setStageComposerOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditStage = (stage: JarvisProjectStage) => {
    const title = window.prompt("Nome da etapa", stage.title);
    if (!title) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === stage.title) return;
    updateStage.mutate({ stageId: stage.id, title: trimmed });
  };

  const handleDeleteStage = (stage: JarvisProjectStage) => {
    if (confirm(`Excluir a etapa "${stage.title}"? Isso remove itens e checklist.`)) {
      deleteStage.mutate({ stageId: stage.id });
      if (activeItemComposer === stage.id) {
        setActiveItemComposer(null);
      }
    }
  };

  const handleCreateItem = async (stageId: string) => {
    const title = (newItemTitles[stageId] ?? "").trim();
    if (!title) return;
    const stage = stages.find((item) => item.id === stageId);
    const sortOrder = stage?.items?.length ?? 0;
    try {
      await createItem.mutateAsync({ stageId, title, sort_order: sortOrder });
      setNewItemTitles((prev) => ({ ...prev, [stageId]: "" }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditItem = (item: JarvisProjectItem) => {
    const title = window.prompt("Nome da subtarefa", item.title);
    if (!title) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) return;
    updateItem.mutate({ itemId: item.id, title: trimmed });
  };

  const handleDeleteItem = (item: JarvisProjectItem) => {
    if (confirm(`Excluir a subtarefa "${item.title}"?`)) {
      deleteItem.mutate({ itemId: item.id });
      if (selectedItem?.id === item.id) {
        setItemDialogOpen(false);
        setSelectedItem(null);
      }
    }
  };

  const handleCreateChecklist = async (itemId: string) => {
    const title = (newChecklistTitles[itemId] ?? "").trim();
    if (!title) return;
    try {
      await createChecklistItem.mutateAsync({ itemId, title });
      setNewChecklistTitles((prev) => ({ ...prev, [itemId]: "" }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditChecklist = (checklist: JarvisProjectChecklistItem) => {
    const title = window.prompt("Nome do checklist", checklist.title);
    if (!title) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === checklist.title) return;
    updateChecklistItem.mutate({ checklistId: checklist.id, title: trimmed });
  };

  const handleDeleteChecklist = (checklist: JarvisProjectChecklistItem) => {
    if (confirm("Excluir o item \"" + checklist.title + "\"?")) {
      deleteChecklistItem.mutate({ checklistId: checklist.id });
    }
  };

  const handleToggleChecklist = async (checklist: JarvisProjectChecklistItem, value: boolean) => {
    if (!selectedItem) {
      updateChecklistItem.mutate({ checklistId: checklist.id, is_done: value });
      return;
    }

    try {
      await updateChecklistItem.mutateAsync({ checklistId: checklist.id, is_done: value });
      const nextChecklist = (selectedItem.checklist_items ?? []).map((item) =>
        item.id === checklist.id ? { ...item, is_done: value } : item
      );
      const nextStatus = resolveStatusFromChecklist(
        { ...selectedItem, checklist_items: nextChecklist },
        selectedItemStage?.title
      );
      if (selectedProjectId && nextStatus !== selectedItem.status) {
        await apiRequest("/projects/" + selectedProjectId + "/items/" + selectedItem.id, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        setItemStatus(nextStatus);
        await queryClient.invalidateQueries({ queryKey: ["jarvis-project-structure", selectedProjectId] });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao atualizar checklist",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o checklist.",
        variant: "destructive",
      });
    }
  };

  const handleCleanupChatTasks = () => {
    if (!selectedProject) return;
    if (
      !confirm(
        "Limpar tarefas criadas pelo chat neste projeto? Isso remove tarefas da lista geral se não estiverem em outros projetos."
      )
    ) {
      return;
    }
    cleanupChatTasks.mutate(selectedProject.id);
  };

  const openItemDialog = (item: JarvisProjectItem) => {
    setSelectedItem(item);
    setItemDialogOpen(true);
  };

  const handleSaveItemDetails = () => {
    if (!selectedItem) return;
    updateItem.mutate({
      itemId: selectedItem.id,
      title: itemTitle.trim() || selectedItem.title,
      description: itemDescription.trim() || null,
      status: itemStatus,
      priority: itemPriority,
    });
    setItemDialogOpen(false);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setProjectPickerOpen(false);
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell className="md:h-[calc(100dvh-48px)] md:overflow-hidden">
      <div className="flex h-full flex-col gap-4">
        <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Quadros</h1>
                <p className="text-sm text-muted-foreground">Cada quadro representa um projeto.</p>
              </div>
            </div>

            <Button onClick={() => setProjectFormOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              Novo quadro
            </Button>
          </div>

          {projects.length > 0 && selectedProject ? (
            <div className="mt-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
                <div className="space-y-2">
                  <DropdownMenu
                    open={projectPickerOpen}
                    onOpenChange={(open) => {
                      setProjectPickerOpen(open);
                      if (!open) setProjectSearch("");
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="px-2 -ml-2 h-auto items-start justify-start gap-2 text-left"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold leading-tight">
                              {selectedProject.title}
                            </span>
                            <Badge variant="outline" className="text-[11px]">
                              {STATUS_LABELS[selectedProject.status]}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Clique para trocar de quadro
                          </span>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[360px] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Quadros
                        </p>
                        <Badge variant="secondary" className="text-[11px]">
                          {projects.length}
                        </Badge>
                      </div>
                      <Input
                        className="mt-2"
                        placeholder="Buscar quadros..."
                        value={projectSearch}
                        onChange={(event) => setProjectSearch(event.target.value)}
                      />
                      <div className="mt-3 grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                        {filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleSelectProject(project.id)}
                            className={cn(
                              "rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/60 hover:shadow-sm",
                              project.id === selectedProjectId
                                ? "border-primary/70 ring-2 ring-primary/10"
                                : ""
                            )}
                          >
                            <div className="h-8 rounded-lg bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
                            <p className="mt-2 text-sm font-semibold line-clamp-2">{project.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {project.task_count ?? 0} tarefas
                            </p>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setProjectPickerOpen(false);
                            setProjectFormOpen(true);
                          }}
                          className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-left text-sm text-muted-foreground transition hover:border-primary/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                              <Plus className="h-4 w-4" />
                            </div>
                            Criar novo quadro
                          </div>
                        </button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedProject.description && (
                    <p className="text-sm text-muted-foreground max-w-xl">
                      {selectedProject.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{projectTasks.length} tarefas vinculadas</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditingProject(selectedProject);
                        setProjectFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setLinkDialogOpen(true)}
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Vincular tarefa
                    </Button>
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setTaskFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nova tarefa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={handleCleanupChatTasks}
                      disabled={cleanupChatTasks.isPending || projectTasks.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar tarefas do chat
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => handleDeleteProject(selectedProject)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                  <div className="w-full lg:max-w-[320px] rounded-xl border border-border bg-background/80 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span>{projectProgress}%</span>
                    </div>
                    <Progress value={projectProgress} className="mt-2" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum quadro criado ainda.</p>
              <Button className="mt-4" onClick={() => setProjectFormOpen(true)}>
                Criar primeiro quadro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 min-h-0 space-y-4">
            {selectedProject ? (
              <>
                <Tabs
                  value={activeView}
                  onValueChange={(value) => setActiveView(value as "structure" | "kanban")}
                  className="flex h-full flex-col"
                >
                  <TabsList className="w-fit rounded-full bg-muted/60 p-1">
                    <TabsTrigger value="structure" className="rounded-full px-4">
                      Estrutura
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="rounded-full px-4">
                      Kanban
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4 flex-1 min-h-0">
                    <TabsContent value="structure" className="h-full">
                      <div className="h-full rounded-2xl border border-border/60 bg-gradient-to-br from-muted/70 via-muted/40 to-background p-4 shadow-sm flex flex-col">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-base font-semibold">Quadro do projeto</h3>
                            <p className="text-xs text-muted-foreground">
                              Listas (etapas) e cartões internos do projeto.
                            </p>
                          </div>
                          <Badge variant="secondary" className="w-fit">
                            {stages.length} listas
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wand2 className="h-4 w-4" />
                            <span>Templates e automações</span>
                          </div>
                          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                              <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Escolha um template" />
                              </SelectTrigger>
                              <SelectContent>
                                {PROJECT_TEMPLATES.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleApplyTemplate}
                              disabled={!selectedTemplate || isApplyingTemplate}
                            >
                              <Wand2 className="h-4 w-4 mr-1" />
                              {isApplyingTemplate ? "Aplicando..." : "Aplicar template"}
                            </Button>
                            {stages.length === 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCreateDefaultStages}
                                disabled={isCreatingDefaultStages}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {isCreatingDefaultStages ? "Gerando..." : "Listas padrão"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {structureLoading ? (
                          <div className="text-sm text-muted-foreground mt-4">Carregando estrutura...</div>
                        ) : (
                          <div className="mt-4 flex-1 min-h-0">
                            <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-3">
                              {stages.map((stage) => {
                                const summary = getStageSummary(stage);
                                const orderedItems = [...(stage.items ?? [])].sort((a, b) => {
                                  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                                });
                                const isDropActive = dragOverStageId === stage.id;

                                const renderDropZone = (index: number) => (
                                  <div
                                    onDragOver={(event) => handleDragOver(event, stage.id, index)}
                                    onDrop={(event) => handleDropOnStage(event, stage.id, index)}
                                    className={cn(
                                      "h-2 rounded-full transition",
                                      draggedItem && isDropActive && dragOverIndex === index
                                        ? "bg-primary/40"
                                        : "bg-transparent"
                                    )}
                                  />
                                );

                                return (
                                  <div
                                    key={stage.id}
                                    className="w-[300px] shrink-0 h-full min-h-[360px]"
                                  >
                                    <div
                                      className={cn(
                                        "flex h-full flex-col rounded-2xl border border-border bg-background/95 shadow-sm",
                                        isDropActive ? "ring-2 ring-primary/20" : ""
                                      )}
                                    >
                                      <div className="border-b px-3 py-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold leading-tight">{stage.title}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                              {summary.totalItems} cartões · Checklist {summary.doneChecklist}/
                                              {summary.totalChecklist}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleEditStage(stage)}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive"
                                              onClick={() => handleDeleteStage(stage)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
                                        {renderDropZone(0)}
                                        {orderedItems.length === 0 ? (
                                          <div className="text-xs text-muted-foreground">
                                            Nenhum cartão nesta lista.
                                          </div>
                                        ) : (
                                          orderedItems.map((item, index) => {
                                            const progress = getChecklistProgress(item);
                                            const statusLabel = ITEM_STATUS_LABELS[item.status];
                                            return (
                                              <div key={item.id} className="space-y-2">
                                                <button
                                                  type="button"
                                                  draggable
                                                  onDragStart={handleDragStart(item, stage.id)}
                                                  onDragEnd={handleDragEnd}
                                                  onClick={() => openItemDialog(item)}
                                                  className={cn(
                                                    "w-full text-left rounded-lg border border-border bg-card p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md cursor-grab active:cursor-grabbing",
                                                    draggedItem?.itemId === item.id ? "opacity-60" : ""
                                                  )}
                                                >
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2">
                                                      <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                      <p className="text-sm font-medium leading-tight line-clamp-2">
                                                        {item.title}
                                                      </p>
                                                    </div>
                                                    {item.status === "done" && (
                                                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                    )}
                                                  </div>
                                                  <div className="mt-2 flex flex-wrap gap-1">
                                                    {item.status !== "open" && (
                                                      <Badge variant="secondary" className="text-[11px]">
                                                        {statusLabel}
                                                      </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[11px]">
                                                      {item.priority === "high"
                                                        ? "Alta"
                                                        : item.priority === "medium"
                                                        ? "Média"
                                                        : "Baixa"}
                                                    </Badge>
                                                    {item.due_at && (
                                                      <Badge variant="secondary" className="text-[11px] flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3" />
                                                        {formatDate(item.due_at)}
                                                      </Badge>
                                                    )}
                                                    {progress.total > 0 && (
                                                      <Badge variant="secondary" className="text-[11px]">
                                                        Checklist {progress.done}/{progress.total}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </button>
                                                {renderDropZone(index + 1)}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>

                                      <div className="border-t px-3 py-2">
                                        {activeItemComposer === stage.id ? (
                                          <div className="space-y-2">
                                            <Input
                                              placeholder="Título do cartão"
                                              value={newItemTitles[stage.id] ?? ""}
                                              onChange={(e) =>
                                                setNewItemTitles((prev) => ({
                                                  ...prev,
                                                  [stage.id]: e.target.value,
                                                }))
                                              }
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                  handleCreateItem(stage.id);
                                                }
                                              }}
                                            />
                                            <div className="flex items-center gap-2">
                                              <Button
                                                size="sm"
                                                onClick={() => handleCreateItem(stage.id)}
                                              >
                                                Adicionar
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setActiveItemComposer(null);
                                                  setNewItemTitles((prev) => ({
                                                    ...prev,
                                                    [stage.id]: "",
                                                  }));
                                                }}
                                              >
                                                Cancelar
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-muted-foreground"
                                            onClick={() => setActiveItemComposer(stage.id)}
                                          >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Adicionar cartão
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              <div className="w-[300px] shrink-0 h-full min-h-[360px]">
                                <div className="h-full rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
                                  {stageComposerOpen ? (
                                    <div className="space-y-2">
                                      <Input
                                        placeholder="Nome da lista"
                                        value={newStageTitle}
                                        onChange={(e) => setNewStageTitle(e.target.value)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            handleCreateStage();
                                          }
                                        }}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={handleCreateStage}>
                                          Adicionar lista
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setStageComposerOpen(false);
                                            setNewStageTitle("");
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-start text-muted-foreground"
                                      onClick={() => setStageComposerOpen(true)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Adicionar lista
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="kanban" className="h-full">
                      {tasksLoading ? (
                        <Card>
                          <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Carregando tarefas vinculadas...
                          </CardContent>
                        </Card>
                      ) : projectTasks.length === 0 ? (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Tarefas vinculadas (Kanban opcional)</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Estrutura do projeto é separada. Use o Kanban somente se precisar de tarefas gerais vinculadas.
                            </p>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-3">
                            <p className="text-sm text-muted-foreground">
                              Nenhuma tarefa vinculada. Se quiser, use "Vincular tarefa" ou "Nova tarefa".
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {TASK_COLUMNS.map((column) => {
                            const tasks = tasksByStatus[column.key];
                            const ColumnIcon = column.icon;

                            return (
                              <Card key={column.key} className="h-full">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <ColumnIcon className="h-4 w-4" />
                                      {column.title}
                                    </CardTitle>
                                    <Badge variant="secondary">{tasks.length}</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {tasksLoading ? (
                                    <div className="text-xs text-muted-foreground">Carregando...</div>
                                  ) : tasks.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">Nenhuma tarefa</div>
                                  ) : (
                                    tasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className="rounded-lg border border-border bg-card p-3 space-y-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="text-sm font-medium">{task.title}</p>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleEditTask(task)}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive"
                                              onClick={() => handleRemoveTask(task.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {task.priority === "high"
                                              ? "Alta"
                                              : task.priority === "medium"
                                              ? "Média"
                                              : "Baixa"}
                                          </Badge>
                                          {task.due_at && (
                                            <Badge variant="secondary" className="text-xs">
                                              Prazo: {formatDate(task.due_at)}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          <Select
                                            value={task.status}
                                            onValueChange={(value) =>
                                              handleStatusChange(task.id, value as JarvisTask["status"])
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="open">A fazer</SelectItem>
                                              <SelectItem value="in_progress">Em andamento</SelectItem>
                                              <SelectItem value="done">Concluída</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                handleStatusChange(
                                                  task.id,
                                                  task.status === "done" ? "open" : "done"
                                                )
                                              }
                                            >
                                              {task.status === "done" ? "Reabrir" : "Concluir"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleDeleteTask(task.id)}
                                            >
                                              Excluir
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um projeto para visualizar o quadro.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

                  <Dialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open);
          if (!open) {
            setSelectedExistingTaskIds([]);
            setTaskSearch("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Vincular tarefas existentes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar tarefas..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
            />

            <div className="max-h-[260px] overflow-y-auto rounded-md border border-border p-2 space-y-2">
              {availableTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma tarefa disponível para vincular.
                </p>
              ) : (
                availableTasks.map((task) => {
                  const checked = selectedExistingTaskIds.includes(task.id);
                  return (
                    <label
                      key={task.id}
                      className="flex items-start gap-3 rounded-md border border-border p-3 text-sm cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const isChecked = Boolean(value);
                          setSelectedExistingTaskIds((prev) =>
                            isChecked ? [...prev, task.id] : prev.filter((id) => id !== task.id)
                          );
                        }}
                      />
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleLinkExistingTasks}
              disabled={selectedExistingTaskIds.length === 0 || addTaskToProject.isPending}
            >
              Vincular selecionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-lg w-full">
          <SheetHeader className="text-left">
            <SheetTitle>Detalhes do cartão</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Lista: {selectedItemStage?.title ?? "Sem lista"}
            </p>
          </SheetHeader>
          {selectedItem && (
            <div className="mt-4 space-y-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(160px,1fr)]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Título</p>
                    <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Descrição</p>
                    <Textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Descreva o cartão"
                      className="min-h-[120px]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Status</p>
                    <Select
                      value={itemStatus}
                      onValueChange={(value) => setItemStatus(value as JarvisProjectItem["status"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">A fazer</SelectItem>
                        <SelectItem value="in_progress">Em andamento</SelectItem>
                        <SelectItem value="done">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Prioridade</p>
                    <Select
                      value={itemPriority}
                      onValueChange={(value) => setItemPriority(value as JarvisProjectItem["priority"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Prazo</p>
                    <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                      {selectedItem.due_at ? formatDate(selectedItem.due_at) : "Sem prazo"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Checklist</p>
                  <Badge variant="secondary" className="text-xs">
                    {getChecklistProgress(selectedItem).done}/{getChecklistProgress(selectedItem).total}
                  </Badge>
                </div>
                {getChecklistProgress(selectedItem).total > 0 && (
                  <Progress
                    value={
                      (getChecklistProgress(selectedItem).done /
                        getChecklistProgress(selectedItem).total) *
                      100
                    }
                  />
                )}
                <div className="max-h-[40vh] overflow-y-auto pr-1">
                  {selectedItem.checklist_items && selectedItem.checklist_items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.checklist_items.map((check) => (
                        <div key={check.id} className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={check.is_done}
                              onCheckedChange={(value) => handleToggleChecklist(check, Boolean(value))}
                            />
                            <span
                              className={
                                "text-sm " +
                                (check.is_done ? "line-through text-muted-foreground" : "")
                              }
                            >
                              {check.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditChecklist(check)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteChecklist(check)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Nenhum item no checklist.</div>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Adicionar item ao checklist"
                    value={newChecklistTitles[selectedItem.id] ?? ""}
                    onChange={(e) =>
                      setNewChecklistTitles((prev) => ({
                        ...prev,
                        [selectedItem.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleCreateChecklist(selectedItem.id);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => handleCreateChecklist(selectedItem.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Checklist
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
            {selectedItem ? (
              <Button
                variant="destructive"
                onClick={() => handleDeleteItem(selectedItem)}
              >
                Excluir cartão
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveItemDetails}>Salvar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        project={editingProject}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        isSubmitting={createProject.isPending || updateProject.isPending}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        isSubmitting={createTask.isPending || updateTask.isPending}
        availableTags={allTags}
      />
    </PageShell>
  );
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: JarvisProject | null;
  onSubmit: (values: { title: string; description?: string; status?: string }) => void;
  isSubmitting: boolean;
}

function ProjectForm({ open, onOpenChange, project, onSubmit, isSubmitting }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<JarvisProject["status"]>(project?.status ?? "active");

  useEffect(() => {
    if (!open) return;
    setTitle(project?.title ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
  }, [open, project]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do projeto" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
          />
          <Select value={status} onValueChange={(value) => setStatus(value as JarvisProject["status"]) }>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {project ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}