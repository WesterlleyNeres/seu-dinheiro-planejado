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
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisProjects } from "@/hooks/useJarvisProjects";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { TaskForm } from "@/components/jarvis/TaskForm";
import type { JarvisProject, JarvisTask } from "@/types/jarvis";

const PROJECT_TEMPLATES = [
  {
    id: "viagem",
    name: "Viagem",
    tasks: [
      { title: "Pesquisar passagens" },
      { title: "Reservar hospedagem" },
      { title: "Montar roteiro" },
    ],
  },
  {
    id: "reforma",
    name: "Reforma",
    tasks: [
      { title: "Listar materiais" },
      { title: "Definir orçamento" },
      { title: "Agendar mão de obra" },
    ],
  },
  {
    id: "projeto-profissional",
    name: "Projeto profissional",
    tasks: [
      { title: "Definir escopo" },
      { title: "Quebrar em tarefas" },
      { title: "Alinhar com o time" },
    ],
  },
];

const STATUS_LABELS: Record<JarvisProject["status"], string> = {
  active: "Ativo",
  completed: "Concluído",
  archived: "Arquivado",
};

const TASK_COLUMNS = [
  { key: "open", title: "A fazer", icon: Circle },
  { key: "in_progress", title: "Em andamento", icon: Clock },
  { key: "done", title: "Concluídas", icon: CheckCircle },
] as const;

export default function JarvisProjects() {
  const queryClient = useQueryClient();
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
  } = useJarvisProjects(selectedProjectId ?? undefined);

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
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

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

  const projectProgress = useMemo(() => {
    const total = projectTasks.length;
    if (total === 0) return 0;
    const done = projectTasks.filter((task) => task.status === "done").length;
    return Math.round((done / total) * 100);
  }, [projectTasks]);

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
      for (const task of template.tasks) {
        const created = await createTask.mutateAsync({
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_at: task.due_at ?? null,
          tags: task.tags ?? [],
        });

        await addTaskToProject.mutateAsync({
          projectId: selectedProject.id,
          taskId: created.id,
        });
      }
    } catch (error) {
      console.error(error);
    }

    setIsApplyingTemplate(false);
    setSelectedTemplate("");
    refreshProjectTasks();
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Projetos</h1>
            <p className="text-sm text-muted-foreground">Organize tarefas em iniciativas</p>
          </div>
        </div>

        <Button onClick={() => setProjectFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Projeto
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum projeto criado ainda.</p>
            <Button className="mt-4" onClick={() => setProjectFormOpen(true)}>
              Criar primeiro projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`cursor-pointer border ${
                  project.id === selectedProjectId ? "border-primary" : "border-border"
                }`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{project.title}</CardTitle>
                    <Badge variant={project.status === "archived" ? "secondary" : "outline"}>
                      {STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  {project.description && <p>{project.description}</p>}
                  <div className="flex items-center gap-2 text-xs">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>{project.task_count ?? 0} tarefas</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedProject ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>{selectedProject.title}</CardTitle>
                        {selectedProject.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedProject.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProject(selectedProject);
                            setProjectFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setLinkDialogOpen(true)}>
                          <LayoutGrid className="h-4 w-4 mr-1" />
                          Vincular tarefa
                        </Button>
                        <Button size="sm" onClick={() => setTaskFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Nova tarefa
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProject(selectedProject)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="w-full sm:w-[240px]">
                          <SelectValue placeholder="Aplicar template" />
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
                        variant="secondary"
                        onClick={handleApplyTemplate}
                        disabled={!selectedTemplate || isApplyingTemplate}
                      >
                        Aplicar template
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Status:</span>
                      <Badge variant="outline">{STATUS_LABELS[selectedProject.status]}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{projectProgress}%</span>
                      </div>
                      <Progress value={projectProgress} />
                    </div>
                  </CardContent>
                </Card>

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
                                      Prazo: {new Date(task.due_at).toLocaleDateString("pt-BR")}
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
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um projeto para visualizar o Kanban.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

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

      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        project={editingProject}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        isLoading={createProject.isPending || updateProject.isPending}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        isLoading={createTask.isPending}
        allTags={allTags}
      />
    </PageShell>
  );
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: JarvisProject | null;
  onSubmit: (values: { title: string; description?: string; status?: string }) => void;
  isLoading?: boolean;
}

const ProjectForm = ({ open, onOpenChange, project, onSubmit, isLoading }: ProjectFormProps) => {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<JarvisProject["status"]>(project?.status ?? "active");

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setDescription(project?.description ?? "");
      setStatus(project?.status ?? "active");
    }
  }, [open, project]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, description, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as JarvisProject["status"])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {project ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
