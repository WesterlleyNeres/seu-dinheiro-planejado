import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Maria Silva",
    role: "Empreendedora",
    content: "Finalmente consegui organizar minhas finanças! A importação automática de extratos economizou horas do meu tempo.",
    rating: 5,
    avatar: "MS"
  },
  {
    name: "João Santos",
    role: "Desenvolvedor",
    content: "O controle de cartões de crédito é perfeito. Nunca mais me perdi com as faturas e sei exatamente quanto tenho disponível.",
    rating: 5,
    avatar: "JS"
  },
  {
    name: "Ana Costa",
    role: "Professora",
    content: "Os relatórios me ajudaram a identificar onde eu estava gastando demais. Em 3 meses já consegui economizar 30%!",
    rating: 5,
    avatar: "AC"
  },
  {
    name: "Pedro Oliveira",
    role: "Médico",
    content: "Sistema profissional, fácil de usar e com recursos que nem aplicativos pagos têm. Recomendo de olhos fechados!",
    rating: 5,
    avatar: "PO"
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que nossos usuários dizem
          </h2>
          <p className="text-lg text-muted-foreground">
            Milhares de pessoas já transformaram suas vidas financeiras
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-muted-foreground italic">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
