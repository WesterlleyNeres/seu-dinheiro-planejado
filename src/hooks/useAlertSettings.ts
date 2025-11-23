import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AlertTypes {
  upcoming_bills: boolean;
  budget_alerts: boolean;
  statement_alerts: boolean;
  goal_alerts: boolean;
}

export interface AlertSettings {
  email_enabled: boolean;
  alert_time: string;
  timezone: string;
  alert_types: AlertTypes;
}

export const useAlertSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          email_enabled: data.email_enabled,
          alert_time: data.alert_time,
          timezone: data.timezone,
          alert_types: data.alert_types as unknown as AlertTypes,
        });
      } else {
        // Create default settings
        const defaultSettings = {
          email_enabled: true,
          alert_time: '07:30',
          timezone: 'America/Sao_Paulo',
          alert_types: {
            upcoming_bills: true,
            budget_alerts: true,
            statement_alerts: true,
            goal_alerts: true,
          },
        };
        
        const { error: insertError } = await supabase
          .from('alert_settings')
          .insert({
            user_id: user.id,
            email_enabled: defaultSettings.email_enabled,
            alert_time: defaultSettings.alert_time,
            timezone: defaultSettings.timezone,
            alert_types: defaultSettings.alert_types as any,
          });

        if (insertError) throw insertError;
        
        setSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações de alertas');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AlertSettings>) => {
    if (!user || !settings) return;

    try {
      const updated = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('alert_settings')
        .update({
          email_enabled: updated.email_enabled,
          alert_time: updated.alert_time,
          timezone: updated.timezone,
          alert_types: updated.alert_types as any,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(updated);
      toast.success('Configurações atualizadas');
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  const sendTestAlert = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-alerts', {
        body: { test: true, userId: user.id },
      });

      if (error) throw error;

      toast.success('Email de teste enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error('Erro ao enviar alerta de teste:', error);
      toast.error('Erro ao enviar email de teste');
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    sendTestAlert,
  };
};
