import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold mb-4">
            🎉 Plataforma de Gestão Financeira Pessoal
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            <span className="text-primary">Suas finanças, peça por peça.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conecte, planeje e feche o mês. Controle total sobre receitas, despesas, orçamentos e metas financeiras.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 group">
                Começar no FLOW
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={() => scrollToSection("funcionalidades")} className="text-lg px-8">
              Como Funciona
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>100% Gratuito para começar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Sem cartão de crédito</span>
            </div>
          </div>

          <div className="pt-12">
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <TrendingUp className="h-24 w-24 text-primary/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
