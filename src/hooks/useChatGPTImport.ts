import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  parseExportFile,
  mapToMemoryItem,
  type ParsedConversation,
  type ParsedMessage,
  type ParseError,
  type ImportResult,
} from '@/lib/chatgptParser';
import type { Json } from '@/integrations/supabase/types';

type ImportStep = 'upload' | 'select' | 'importing' | 'done';

interface ImportState {
  step: ImportStep;
  file: File | null;
  conversations: ParsedConversation[];
  selectedIds: Set<string>;
  progress: number;
  result: ImportResult | null;
  error: string | null;
}

const BATCH_SIZE = 50;

export function useChatGPTImport() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    conversations: [],
    selectedIds: new Set(),
    progress: 0,
    result: null,
    error: null,
  });

  // Estatísticas das conversas selecionadas
  const selectedStats = useMemo(() => {
    const selectedConvs = state.conversations.filter((c) =>
      state.selectedIds.has(c.id)
    );
    return {
      conversationCount: selectedConvs.length,
      messageCount: selectedConvs.reduce((sum, c) => sum + c.messageCount, 0),
    };
  }, [state.conversations, state.selectedIds]);

  // Handler para upload de arquivo
  const handleFileUpload = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, error: null }));

    const result = await parseExportFile(file);

    if ('type' in result) {
      // É um erro
      const error = result as ParseError;
      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Sucesso - ir para seleção
    const conversations = result as ParsedConversation[];
    const allIds = new Set(conversations.map((c) => c.id));

    setState((prev) => ({
      ...prev,
      step: 'select',
      file,
      conversations,
      selectedIds: allIds, // Seleciona todas por padrão
      error: null,
    }));

    toast({
      title: 'Arquivo processado',
      description: `${conversations.length} conversas encontradas`,
    });
  }, [toast]);

  // Toggle seleção de conversa
  const toggleConversation = useCallback((id: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { ...prev, selectedIds: newSelected };
    });
  }, []);

  // Selecionar/deselecionar todas
  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(prev.conversations.map((c) => c.id)),
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(),
    }));
  }, []);

  // Verificar hashes existentes para deduplicação
  const checkExistingHashes = useCallback(
    async (hashes: string[]): Promise<Set<string>> => {
      if (!tenantId || hashes.length === 0) return new Set();

      const { data } = await supabase
        .from('ff_memory_items')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('source', 'chatgpt')
        .in('metadata->>content_hash', hashes);

      const existingHashes = new Set<string>();
      if (data) {
        for (const item of data) {
          const hash = (item.metadata as Record<string, unknown>)?.content_hash;
          if (typeof hash === 'string') {
            existingHashes.add(hash);
          }
        }
      }
      return existingHashes;
    },
    [tenantId]
  );

  // Iniciar importação
  const startImport = useCallback(async () => {
    if (!tenantId || !user) {
      toast({
        title: 'Erro',
        description: 'Usuário ou tenant não encontrado',
        variant: 'destructive',
      });
      return;
    }

    if (state.selectedIds.size === 0) {
      toast({
        title: 'Nenhuma conversa selecionada',
        description: 'Selecione pelo menos uma conversa para importar',
        variant: 'destructive',
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      step: 'importing',
      progress: 0,
      result: null,
      error: null,
    }));

    // Coletar todas as mensagens das conversas selecionadas
    const allMessages: ParsedMessage[] = [];
    for (const conv of state.conversations) {
      if (state.selectedIds.has(conv.id)) {
        allMessages.push(...conv.messages);
      }
    }

    const totalMessages = allMessages.length;
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    try {
      // Processar em batches
      for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
        const batch = allMessages.slice(i, i + BATCH_SIZE);
        const batchHashes = batch.map((m) => m.hash);

        // Verificar duplicatas
        const existingHashes = await checkExistingHashes(batchHashes);
        const newMessages = batch.filter((m) => !existingHashes.has(m.hash));
        duplicates += batch.length - newMessages.length;

        if (newMessages.length > 0) {
          // Preparar para inserção
          const items = newMessages.map((m) => {
            const mapped = mapToMemoryItem(m, tenantId, user.id);
            return {
              ...mapped,
              metadata: mapped.metadata as Json,
            };
          });

          const { error } = await supabase
            .from('ff_memory_items')
            .insert(items);

          if (error) {
            console.error('Erro ao inserir batch:', error);
            errors += newMessages.length;
          } else {
            imported += newMessages.length;
          }
        }

        // Atualizar progresso
        const progress = Math.round(((i + batch.length) / totalMessages) * 100);
        setState((prev) => ({ ...prev, progress }));
      }

      const result: ImportResult = {
        total: totalMessages,
        imported,
        duplicates,
        errors,
      };

      setState((prev) => ({
        ...prev,
        step: 'done',
        progress: 100,
        result,
      }));

      // Invalidar cache de memórias
      queryClient.invalidateQueries({ queryKey: ['jarvis-memory'] });

      toast({
        title: 'Importação concluída!',
        description: `${imported} memórias importadas${duplicates > 0 ? `, ${duplicates} duplicatas ignoradas` : ''}`,
      });
    } catch (error) {
      console.error('Erro na importação:', error);
      setState((prev) => ({
        ...prev,
        step: 'done',
        error: 'Erro durante a importação. Algumas memórias podem ter sido importadas.',
        result: { total: totalMessages, imported, duplicates, errors: totalMessages - imported - duplicates },
      }));
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro durante a importação',
        variant: 'destructive',
      });
    }
  }, [tenantId, user, state.conversations, state.selectedIds, checkExistingHashes, toast, queryClient]);

  // Reset para nova importação
  const reset = useCallback(() => {
    setState({
      step: 'upload',
      file: null,
      conversations: [],
      selectedIds: new Set(),
      progress: 0,
      result: null,
      error: null,
    });
  }, []);

  // Voltar para etapa anterior
  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'select') {
        return { ...prev, step: 'upload', file: null, conversations: [], selectedIds: new Set() };
      }
      if (prev.step === 'done') {
        return { ...prev, step: 'select', result: null, progress: 0 };
      }
      return prev;
    });
  }, []);

  return {
    ...state,
    selectedStats,
    handleFileUpload,
    toggleConversation,
    selectAll,
    deselectAll,
    startImport,
    reset,
    goBack,
  };
}
