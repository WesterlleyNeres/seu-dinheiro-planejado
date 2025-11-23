import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BudgetMode } from '@/hooks/useUserSettings';

interface BudgetModeToggleProps {
  value: BudgetMode;
  onChange: (value: BudgetMode) => void;
  disabled?: boolean;
}

export const BudgetModeToggle = ({ value, onChange, disabled }: BudgetModeToggleProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Cálculo de Orçamento</h3>
        <p className="text-sm text-muted-foreground">
          Defina como o sistema deve calcular o orçamento realizado
        </p>
      </div>
      
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pagas" id="pagas" />
          <Label htmlFor="pagas" className="cursor-pointer">
            <div>
              <div className="font-medium">Apenas Pagas</div>
              <div className="text-sm text-muted-foreground">
                Considera apenas transações com status "Paga" no cálculo do orçamento
              </div>
            </div>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pagas_e_pendentes" id="pagas_e_pendentes" />
          <Label htmlFor="pagas_e_pendentes" className="cursor-pointer">
            <div>
              <div className="font-medium">Pagas + Pendentes</div>
              <div className="text-sm text-muted-foreground">
                Considera transações "Pagas" e "Pendentes" no cálculo do orçamento
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
