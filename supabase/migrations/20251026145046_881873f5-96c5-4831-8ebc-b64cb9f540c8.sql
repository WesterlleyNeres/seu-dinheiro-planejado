-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to insert default payment methods for new users
CREATE OR REPLACE FUNCTION public.insert_default_payment_methods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_methods (user_id, nome, is_default) VALUES
    (NEW.id, 'Dinheiro', TRUE),
    (NEW.id, 'PIX', TRUE),
    (NEW.id, 'Débito', TRUE),
    (NEW.id, 'Crédito', TRUE);
  RETURN NEW;
END;
$$;

-- Trigger to insert default payment methods after profile creation
CREATE TRIGGER on_profile_created_insert_payment_methods
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_payment_methods();

-- Add payment_method_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id);

-- Add index for performance
CREATE INDEX idx_transactions_payment_method_id ON public.transactions(payment_method_id);