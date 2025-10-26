import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
      let query = supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCategories((data as any) || []);
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
      const { error } = await supabase.from('categories').insert({
        ...data,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Categoria criada',
        description: 'A categoria foi criada com sucesso',
      });

      loadCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Erro ao criar categoria',
          description: 'Já existe uma categoria com este nome',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar categoria',
          description: 'Tente novamente mais tarde',
          variant: 'destructive',
        });
      }
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', id);

      if (error) throw error;

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
      // Check if category has transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', id)
        .is('deleted_at', null)
        .limit(1);

      if (transactions && transactions.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta categoria possui lançamentos associados',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

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
