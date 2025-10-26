import { z } from 'zod';

export const transactionSchema = z.object({
  tipo: z.enum(['receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(200, 'Descrição muito longa'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  data: z.string().min(1, 'Data é obrigatória'),
  category_id: z.string().uuid('Categoria inválida'),
  status: z.enum(['paga', 'pendente']),
  forma_pagamento: z.string().optional(),
  wallet_id: z.string().uuid().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  natureza: z.enum(['fixa', 'variavel']).optional().nullable(),
  
  // Campos de parcelamento
  isInstallment: z.boolean().default(false),
  installmentType: z.enum(['fixed', 'calculated']).optional(),
  installmentCount: z.coerce.number().min(1).max(60).optional(),
  installmentValue: z.coerce.number().min(0.01).optional(),
  totalValue: z.coerce.number().min(0.01).optional(),
}).refine((data) => {
  // Se tem dados de parcelamento mas isInstallment está false
  if (!data.isInstallment && (data.installmentCount || data.installmentValue || data.totalValue)) {
    return false;
  }
  
  if (!data.isInstallment) return true;
  
  // Verificar se installmentType foi definido
  if (!data.installmentType) {
    return false;
  }
  
  if (data.installmentType === 'fixed') {
    const hasValue = typeof data.installmentValue === 'number' && data.installmentValue > 0;
    const hasCount = typeof data.installmentCount === 'number' && data.installmentCount > 0;
    return hasValue && hasCount;
  }
  
  if (data.installmentType === 'calculated') {
    const hasTotal = typeof data.totalValue === 'number' && data.totalValue > 0;
    const hasCount = typeof data.installmentCount === 'number' && data.installmentCount > 0;
    return hasTotal && hasCount;
  }
  
  return false;
}, {
  message: "Ative o 'Lançamento Parcelado' e preencha o valor e número de parcelas",
  path: ["isInstallment"],
});

export const categorySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo: z.enum(['despesa', 'receita', 'investimento', 'divida'], {
    required_error: 'Tipo é obrigatório',
  }),
});

export const walletSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo: z.enum(['conta', 'cartao'], {
    required_error: 'Tipo é obrigatório',
  }),
  instituicao: z.string().optional(),
  dia_fechamento: z.number().min(1).max(31).optional().nullable(),
  dia_vencimento: z.number().min(1).max(31).optional().nullable(),
  ativo: z.boolean().default(true),
});

export const budgetSchema = z.object({
  ano: z.number().min(2000).max(2100),
  mes: z.number().min(1).max(12),
  category_id: z.string().uuid('Categoria inválida'),
  limite_valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
});
