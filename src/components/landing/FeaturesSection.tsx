import { BarChart3, CreditCard, Target, TrendingUp, Upload, Bell, Repeat, Lock } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Visualize suas finanças em tempo real com gráficos e indicadores intuitivos"
  },
  {
    icon: CreditCard,
    title: "Gestão de Cartões",
    description: "Faturas automáticas, controle de limite e alertas de vencimento"
  },
  {
    icon: Target,
    title: "Metas Financeiras",
    description: "Defina objetivos e acompanhe seu progresso mês a mês"
  },
  {
    icon: Repeat,
    title: "Transações Recorrentes",
    description: "Automatize lançamentos mensais como salário, aluguel e assinaturas"
  },
  {
    icon: TrendingUp,
    title: "Relatórios Avançados",
    description: "Análises detalhadas de gastos por categoria e evolução temporal"
  },
  {
    icon: Upload,
    title: "Importação CSV",
    description: "Importe extratos bancários com reconhecimento automático de categorias"
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    description: "Notificações por email sobre vencimentos, orçamentos e metas"
  },
  {
    icon: Lock,
    title: "Fechamento de Período",
    description: "Bloqueie meses anteriores para garantir integridade nos relatórios"
  }
];

export const FeaturesSection = () => {
  return (
    <section id="funcionalidades" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground">
            Ferramentas poderosas para transformar sua relação com o dinheiro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
