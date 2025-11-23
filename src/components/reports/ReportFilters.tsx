import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWallets } from '@/hooks/useWallets';
import { useCategories } from '@/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ReportFilters {
  startMonth?: string;
  endMonth?: string;
  walletIds?: string[];
  categoryIds?: string[];
  tipo?: 'receita' | 'despesa' | 'ambos';
}

interface ReportFiltersProps {
  onFiltersChange: (filters: ReportFilters) => void;
}

export const ReportFiltersComponent = ({ onFiltersChange }: ReportFiltersProps) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tipo, setTipo] = useState<'receita' | 'despesa' | 'ambos'>('ambos');
  const [showFilters, setShowFilters] = useState(false);
  
  const { wallets } = useWallets();
  const { categories } = useCategories();

  const handleWalletToggle = (walletId: string) => {
    setSelectedWallets(prev =>
      prev.includes(walletId)
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApplyFilters = () => {
    onFiltersChange({
      startMonth: startDate ? format(startDate, 'yyyy-MM') : undefined,
      endMonth: endDate ? format(endDate, 'yyyy-MM') : undefined,
      walletIds: selectedWallets.length > 0 ? selectedWallets : undefined,
      categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
      tipo,
    });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedWallets([]);
    setSelectedCategories([]);
    setTipo('ambos');
    onFiltersChange({});
  };

  const activeFiltersCount = 
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (selectedWallets.length > 0 ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (tipo !== 'ambos' ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Date Range */}
              <div className="space-y-4">
                <Label>Período Customizado</Label>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM/yyyy', { locale: ptBR }) : 'Data Início'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM/yyyy', { locale: ptBR }) : 'Data Fim'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Transaction Type */}
              <div className="space-y-2">
                <Label>Tipo de Transação</Label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Receitas e Despesas</SelectItem>
                    <SelectItem value="receita">Apenas Receitas</SelectItem>
                    <SelectItem value="despesa">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Wallets */}
              <div className="space-y-2">
                <Label>Carteiras ({selectedWallets.length} selecionadas)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {wallets.map((wallet) => (
                      <div key={wallet.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`wallet-${wallet.id}`}
                          checked={selectedWallets.includes(wallet.id)}
                          onCheckedChange={() => handleWalletToggle(wallet.id)}
                        />
                        <label
                          htmlFor={`wallet-${wallet.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {wallet.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label>Categorias ({selectedCategories.length} selecionadas)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowFilters(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApplyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
