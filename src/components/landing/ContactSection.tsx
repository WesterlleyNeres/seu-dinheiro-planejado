import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLeads, type LeadFormData } from "@/hooks/useLeads";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@/hooks/useLeads";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, Phone, Send } from "lucide-react";
import { Link } from "react-router-dom";

export const ContactSection = () => {
  const { submitLead } = useLeads();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      mensagem: "",
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    const result = await submitLead(data);
    if (result.success) {
      form.reset();
    }
  };

  return (
    <section id="contato" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Entre em Contato
          </h2>
          <p className="text-lg text-muted-foreground">
            Tem alguma dúvida? Envie uma mensagem e responderemos em breve
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-card border border-border rounded-xl p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mensagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Conte-nos como podemos ajudar..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </form>
            </Form>

            <div className="mt-8 pt-8 border-t border-border text-center">
              <p className="text-muted-foreground mb-4">Ou prefere começar agora?</p>
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Estamos aqui para ajudar
              </h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está pronta para responder suas dúvidas e auxiliar você a começar sua jornada de organização financeira.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Email</h4>
                  <p className="text-muted-foreground">contato@seudinheiro.com.br</p>
                  <p className="text-sm text-muted-foreground mt-1">Respondemos em até 24h</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Suporte</h4>
                  <p className="text-muted-foreground">Disponível para planos pagos</p>
                  <p className="text-sm text-muted-foreground mt-1">Segunda a Sexta, 9h às 18h</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-2">🚀 Teste Grátis</h4>
              <p className="text-sm text-muted-foreground">
                Comece agora mesmo sem cartão de crédito. Explore todas as funcionalidades do plano Free por tempo ilimitado!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
