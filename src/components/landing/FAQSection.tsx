import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "É seguro colocar meus dados financeiros?",
    answer: "Sim! Utilizamos criptografia de ponta a ponta e não temos acesso às suas senhas bancárias. Apenas você visualiza seus dados. Nosso sistema segue as melhores práticas de segurança da informação."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, não há fidelidade. Você pode cancelar sua assinatura a qualquer momento através das configurações da conta, e seus dados permanecerão disponíveis até o fim do período pago."
  },
  {
    question: "Funciona em celular?",
    answer: "Sim! O sistema é totalmente responsivo e funciona perfeitamente em smartphones, tablets e computadores. Você pode acessar suas finanças de qualquer dispositivo."
  },
  {
    question: "Como importo meus extratos bancários?",
    answer: "Basta exportar seu extrato em formato CSV do seu banco e usar nossa ferramenta de importação. O sistema reconhece automaticamente as categorias e detecta transações duplicadas."
  },
  {
    question: "Posso compartilhar com minha família?",
    answer: "Sim! O plano Família permite até 5 usuários com gestão compartilhada. Cada membro tem seu próprio login e você controla as permissões de acesso."
  },
  {
    question: "Quanto tempo leva para configurar?",
    answer: "Apenas 5 minutos! Crie sua conta, adicione suas carteiras e comece a registrar transações. Se tiver extratos para importar, pode levar alguns minutos a mais dependendo do volume."
  },
  {
    question: "Tem suporte em português?",
    answer: "Sim! Todo o sistema e suporte são 100% em português brasileiro. Nossa equipe está disponível por email para planos pagos e há documentação completa no FAQ integrado."
  },
  {
    question: "Posso migrar de outro sistema?",
    answer: "Sim! Nossa importação CSV aceita formatos de diversos sistemas. Se precisar de ajuda na migração, nossa equipe pode auxiliar usuários de planos pagos."
  }
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tire suas dúvidas sobre o sistema
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-lg px-6"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-foreground">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
