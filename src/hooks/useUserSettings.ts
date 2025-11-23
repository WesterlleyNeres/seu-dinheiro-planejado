import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type BudgetMode = 'pagas' | 'pagas_e_pendentes';

interface UserSettings {
  budget_mode: BudgetMode;
}

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsReturn => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          budget_mode: data.budget_mode as BudgetMode,
        });
      } else {
        // Create default settings if not exists
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            budget_mode: 'pagas',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setSettings({
          budget_mode: newSettings.budget_mode as BudgetMode,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Configurações atualizadas com sucesso');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refresh: loadSettings,
  };
};
