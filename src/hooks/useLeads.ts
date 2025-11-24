import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

export const leadSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  telefone: z.string().trim().optional(),
  mensagem: z.string().trim().min(10, "Mensagem deve ter pelo menos 10 caracteres").max(1000),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const useLeads = () => {
  const submitLead = async (data: LeadFormData) => {
    try {
      // Validate data
      const validatedData = leadSchema.parse(data);

      const { error } = await supabase.from("leads").insert({
        nome: validatedData.nome,
        email: validatedData.email,
        telefone: validatedData.telefone || null,
        mensagem: validatedData.mensagem,
        origem: "landing",
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente mais tarde.",
      });
      return { success: false, error };
    }
  };

  return { submitLead };
};
