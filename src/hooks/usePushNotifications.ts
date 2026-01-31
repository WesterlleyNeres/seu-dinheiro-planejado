import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export const usePushNotifications = () => {
  const { toast } = useToast();
  
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  // Verificar suporte
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === "granted");
    }
  }, []);

  // Registrar Service Worker
  useEffect(() => {
    if (!isSupported) return;
    
    navigator.serviceWorker.register("/sw.js").then(registration => {
      console.log("SW registrado:", registration.scope);
    }).catch(err => {
      console.error("Erro ao registrar SW:", err);
    });
  }, [isSupported]);

  // Solicitar permissão
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast({ title: "Notificações ativadas!" });
        setIsSubscribed(true);
        return true;
      } else {
        toast({ 
          title: "Permissão negada", 
          description: "Ative nas configurações do navegador",
          variant: "destructive" 
        });
        return false;
      }
    } catch (err) {
      console.error("Erro ao solicitar permissão:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  // Testar notificação local
  const sendTestNotification = useCallback(() => {
    if (permission !== "granted") return;
    
    new Notification("Teste JARVIS", {
      body: "Suas notificações estão funcionando!",
      icon: "/favicon.svg",
    });
    
    toast({ title: "Notificação de teste enviada!" });
  }, [permission, toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission,
    sendTestNotification,
  };
};
