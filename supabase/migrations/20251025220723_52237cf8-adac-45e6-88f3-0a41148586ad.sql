-- Create function to insert default categories for new users
CREATE OR REPLACE FUNCTION public.insert_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default expense categories (variavel)
  INSERT INTO public.categories (user_id, nome, tipo) VALUES
    (NEW.id, 'Assinaturas', 'variavel'),
    (NEW.id, 'Carro', 'variavel'),
    (NEW.id, 'Casa', 'variavel'),
    (NEW.id, 'Estudos', 'variavel'),
    (NEW.id, 'Festas', 'variavel'),
    (NEW.id, 'Ifood', 'variavel'),
    (NEW.id, 'Lazer', 'variavel'),
    (NEW.id, 'Mercado', 'variavel'),
    (NEW.id, 'Pet', 'variavel'),
    (NEW.id, 'Saúde e Fitness', 'variavel'),
    (NEW.id, 'Uber e Transporte', 'variavel'),
    (NEW.id, 'Shopping/Compras', 'variavel'),
    (NEW.id, 'Viagens', 'variavel'),
    -- Insert default income category
    (NEW.id, 'Salário', 'receita');
  
  RETURN NEW;
END;
$$;

-- Create trigger to insert default categories after profile creation
CREATE TRIGGER on_profile_created_insert_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_categories();