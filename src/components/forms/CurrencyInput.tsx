import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { maskCurrency, unmaskCurrency } from '@/lib/masks';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number;
  onChange?: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(
      maskCurrency(String(value * 100))
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCurrency(e.target.value);
      setDisplayValue(masked);
      
      if (onChange) {
        const numericValue = unmaskCurrency(masked);
        onChange(numericValue);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
