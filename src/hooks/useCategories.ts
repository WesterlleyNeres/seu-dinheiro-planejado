import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  nome: string;
  tipo: 'despesa' | 'receita' | 'investimento' | 'divida' | 'fixa' | 'variavel';
  user_id: string;
  created_at: string;
}

export const useCategories = (tipo?: Category['tipo']) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Category[]>(`/categories${query}`);
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro ao carregar categorias',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [user, tipo]);

  const createCategory = async (data: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      await apiRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Categoria criada',
        description: 'A categoria foi criada com sucesso',
      });

      loadCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);

      const message = String(error?.message || '');
      if (message.toLowerCase().includes('categoria já existe')) {
        toast({
          title: 'Erro ao criar categoria',
          description: 'Já existe uma categoria com este nome',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Erro ao criar categoria',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      await apiRequest(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Categoria atualizada',
        description: 'A categoria foi atualizada com sucesso',
      });

      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Erro ao atualizar categoria',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiRequest(`/categories/${id}`, { method: 'DELETE' });

      toast({
        title: 'Categoria excluída',
        description: 'A categoria foi excluída com sucesso',
      });

      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Erro ao excluir categoria',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: loadCategories,
  };
};
