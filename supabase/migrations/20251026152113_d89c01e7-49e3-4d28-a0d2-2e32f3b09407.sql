-- Migration Parte 2: Atualizar dados existentes

-- 1. Atualizar categorias existentes do tipo 'fixa' e 'variavel' para 'despesa'
UPDATE categories
SET tipo = 'despesa'
WHERE tipo IN ('fixa', 'variavel');

-- 2. Atualizar função de categorias padrão
CREATE OR REPLACE FUNCTION insert_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, nome, tipo) VALUES
    (NEW.id, 'Assinaturas', 'despesa'),
    (NEW.id, 'Carro', 'despesa'),
    (NEW.id, 'Casa', 'despesa'),
    (NEW.id, 'Estudos', 'despesa'),
    (NEW.id, 'Festas', 'despesa'),
    (NEW.id, 'Ifood', 'despesa'),
    (NEW.id, 'Lazer', 'despesa'),
    (NEW.id, 'Mercado', 'despesa'),
    (NEW.id, 'Pet', 'despesa'),
    (NEW.id, 'Saúde e Fitness', 'despesa'),
    (NEW.id, 'Uber e Transporte', 'despesa'),
    (NEW.id, 'Shopping/Compras', 'despesa'),
    (NEW.id, 'Viagens', 'despesa'),
    (NEW.id, 'Salário', 'receita');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';