import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FAQEmptyStateProps {
  onClearSearch: () => void;
}

export const FAQEmptyState = ({ onClearSearch }: FAQEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <SearchX className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">Nenhum resultado encontrado</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        Não encontramos perguntas correspondentes à sua busca. Tente usar palavras diferentes ou
        navegue pelas categorias.
      </p>
      <Button variant="outline" onClick={onClearSearch}>
        Limpar busca
      </Button>
    </div>
  );
};
