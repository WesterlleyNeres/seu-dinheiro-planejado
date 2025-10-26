import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

interface PaymentMethodSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export const PaymentMethodSelect = ({
  value,
  onChange,
}: PaymentMethodSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { paymentMethods, createPaymentMethod } = usePaymentMethods();

  const selectedMethod = paymentMethods.find((pm) => pm.id === value);

  const handleCreate = async () => {
    if (!searchValue.trim()) return;
    
    const success = await createPaymentMethod(searchValue.trim());
    if (success) {
      setSearchValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMethod ? selectedMethod.nome : "Selecione..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Buscar ou criar..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar "{searchValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {paymentMethods.map((method) => (
                <CommandItem
                  key={method.id}
                  value={method.id}
                  onSelect={() => {
                    onChange(method.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === method.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {method.nome}
                  {method.is_default && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Padrão
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
