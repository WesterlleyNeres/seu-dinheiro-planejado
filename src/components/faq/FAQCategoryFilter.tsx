import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FAQ_CATEGORIES, FAQCategory } from '@/types/faq';
import { Lock, RefreshCw, Upload, CreditCard, DollarSign, Settings } from 'lucide-react';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Períodos e Bloqueios': Lock,
  'Recorrências': RefreshCw,
  'Importação': Upload,
  'Cartões e Faturas': CreditCard,
  'Saldos e Auditoria': DollarSign,
  'Configurações': Settings,
};

interface FAQCategoryFilterProps {
  selectedCategory: FAQCategory;
  onCategoryChange: (category: FAQCategory) => void;
  categoryCounts: Record<string, number>;
}

export const FAQCategoryFilter = ({
  selectedCategory,
  onCategoryChange,
  categoryCounts,
}: FAQCategoryFilterProps) => {
  return (
    <Tabs value={selectedCategory} onValueChange={(v) => onCategoryChange(v as FAQCategory)}>
      <TabsList className="h-auto flex-wrap justify-start gap-2">
        {FAQ_CATEGORIES.map((category) => {
          const Icon = categoryIcons[category];
          const count = categoryCounts[category] || 0;
          
          return (
            <TabsTrigger
              key={category}
              value={category}
              className="flex items-center gap-2"
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{category}</span>
              {category !== 'Todas' && count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};
