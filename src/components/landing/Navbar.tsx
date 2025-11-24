import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">$</span>
            </div>
            <span className="text-xl font-bold text-foreground">Seu Dinheiro Planejado</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection("funcionalidades")} className="text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollToSection("precos")} className="text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </button>
            <button onClick={() => scrollToSection("contato")} className="text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </button>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Criar Conta Grátis</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <button onClick={() => scrollToSection("funcionalidades")} className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors py-2">
              Funcionalidades
            </button>
            <button onClick={() => scrollToSection("precos")} className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors py-2">
              Preços
            </button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors py-2">
              FAQ
            </button>
            <button onClick={() => scrollToSection("contato")} className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors py-2">
              Contato
            </button>
            <div className="space-y-2 pt-4 border-t border-border">
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">Entrar</Button>
              </Link>
              <Link to="/auth" className="block">
                <Button className="w-full">Criar Conta Grátis</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
