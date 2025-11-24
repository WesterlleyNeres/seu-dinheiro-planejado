import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const plans = [
  {
    name: "Free",
    price: 0,
    period: "mês",
    description: "Perfeito para começar",
    features: [
      "50 transações por mês",
      "1 carteira",
      "Dashboard básico",
      "Categorização manual",
      "Suporte por email"
    ],
    cta: "Começar Grátis",
    popular: false
  },
  {
    name: "Plus",
    price: 19.90,
    period: "mês",
    description: "Ideal para uso pessoal",
    features: [
      "Transações ilimitadas",
      "Carteiras ilimitadas",
      "Importação CSV",
      "Alertas por email",
      "Fechamento de período",
      "Relatórios avançados",
      "Exportação PDF",
      "Suporte prioritário"
    ],
    cta: "Começar Agora",
    popular: true
  },
  {
    name: "Premium",
    price: 39.90,
    period: "mês",
    description: "Para quem quer mais",
    features: [
      "Tudo do Plus +",
      "Análise preditiva",
      "Suporte prioritário 24/7",
      "Consultoria mensal",
      "API de integração",
      "Dashboard customizável"
    ],
    cta: "Começar Agora",
    popular: false
  },
  {
    name: "Família",
    price: 59.90,
    period: "mês",
    description: "Para toda a família",
    features: [
      "Tudo do Premium +",
      "Até 5 usuários",
      "Gestão compartilhada",
      "Relatórios consolidados",
      "Controle de permissões"
    ],
    cta: "Começar Agora",
    popular: false
  }
];

export const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="precos" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos para todos os bolsos
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Comece grátis e evolua conforme suas necessidades
          </p>

          <div className="inline-flex items-center gap-4 bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2 rounded-md transition-colors ${
                !annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2 rounded-md transition-colors ${
                annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Anual
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-card border rounded-xl p-6 space-y-6 ${
                plan.popular
                  ? "border-primary shadow-xl scale-105 relative"
                  : "border-border hover:shadow-lg transition-shadow"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Mais Popular
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    R$ {annual && plan.price > 0 ? (plan.price * 10).toFixed(2) : plan.price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/{annual && plan.price > 0 ? "ano" : plan.period}</span>
                </div>
                {annual && plan.price > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou R$ {plan.price.toFixed(2)}/mês
                  </p>
                )}
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth" className="block">
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
};
