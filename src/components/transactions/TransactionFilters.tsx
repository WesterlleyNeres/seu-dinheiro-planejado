import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCategories } from '@/hooks/useCategories';
import { useWallets } from '@/hooks/useWallets';
import { Filter, X } from 'lucide-react';
import { TransactionFilters as ITransactionFilters } from '@/hooks/useTransactions';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface TransactionFiltersProps {
  filters: ITransactionFilters;
  onFiltersChange: (filters: ITransactionFilters) => void;
}

export const TransactionFilters = ({ filters, onFiltersChange }: TransactionFiltersProps) => {
  const { categories } = useCategories();
  const { wallets } = useWallets();
  const [showFilters, setShowFilters] = useState(false);

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const setCurrentMonth = () => {
    const now = new Date();
    onFiltersChange({
      ...filters,
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>

        <Button variant="outline" size="sm" onClick={setCurrentMonth}>
          Mês Atual
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Início</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, startDate: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Fim</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, endDate: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={filters.tipo || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  tipo: value === 'all' ? undefined : (value as 'receita' | 'despesa'),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select
              value={filters.category_id || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  category_id: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value === 'all' ? undefined : (value as 'paga' | 'pendente'),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Carteira</label>
            <Select
              value={filters.wallet_id || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  wallet_id: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
