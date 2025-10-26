-- Criar trigger para inserir categorias padrão (se não existir)
DROP TRIGGER IF EXISTS on_profile_created_insert_categories ON profiles;
CREATE TRIGGER on_profile_created_insert_categories
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION insert_default_categories();

-- Criar trigger para inserir formas de pagamento padrão (se não existir)
DROP TRIGGER IF EXISTS on_profile_created_insert_payment_methods ON profiles;
CREATE TRIGGER on_profile_created_insert_payment_methods
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION insert_default_payment_methods();

-- Atualizar função de formas de pagamento para incluir Boleto
CREATE OR REPLACE FUNCTION insert_default_payment_methods()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payment_methods (user_id, nome, is_default)
  VALUES
    (NEW.id, 'Dinheiro', TRUE),
    (NEW.id, 'PIX', TRUE),
    (NEW.id, 'Débito', TRUE),
    (NEW.id, 'Crédito', TRUE),
    (NEW.id, 'Boleto', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Inserir categorias padrão para usuários existentes que não têm nenhuma categoria
INSERT INTO categories (user_id, nome, tipo)
SELECT p.id, 'Assinaturas', 'variavel'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE user_id = p.id AND deleted_at IS NULL
);

INSERT INTO categories (user_id, nome, tipo)
SELECT p.id, unnest(ARRAY['Carro', 'Casa', 'Estudos', 'Festas', 'Ifood', 'Lazer', 'Mercado', 'Pet', 'Saúde e Fitness', 'Uber e Transporte', 'Shopping/Compras', 'Viagens']), 'variavel'
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM categories WHERE user_id = p.id AND nome = 'Assinaturas' AND deleted_at IS NULL
);

INSERT INTO categories (user_id, nome, tipo)
SELECT p.id, 'Salário', 'receita'
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM categories WHERE user_id = p.id AND nome = 'Assinaturas' AND deleted_at IS NULL
);

-- Inserir formas de pagamento padrão para usuários existentes que não têm nenhuma forma
INSERT INTO payment_methods (user_id, nome, is_default)
SELECT p.id, unnest(ARRAY['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto']), TRUE
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE user_id = p.id AND deleted_at IS NULL
);