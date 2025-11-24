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
  saldo_inicial: z.number().optional().nullable(),
  dia_fechamento: z.number().min(1).max(31).optional().nullable(),
  dia_vencimento: z.number().min(1).max(31).optional().nullable(),
  ativo: z.boolean().default(true),
});

export const budgetSchema = z.object({
  ano: z.number().min(2000).max(2100),
  mes: z.number().min(1).max(12),
  category_id: z.string().uuid('Categoria inválida'),
  limite_valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  rollover_policy: z.enum(['none', 'carry_over', 'clamp']).default('none'),
  rollover_cap: z.number().positive('Limite deve ser positivo').optional().nullable(),
}).refine((data) => {
  // Se política é 'clamp', rollover_cap é obrigatório
  if (data.rollover_policy === 'clamp') {
    return data.rollover_cap !== null && data.rollover_cap !== undefined && data.rollover_cap > 0;
  }
  return true;
}, {
  message: "Defina o limite máximo de rollover",
  path: ["rollover_cap"],
});

export const goalSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  valor_meta: z.number()
    .positive("Valor deve ser maior que zero"),
  prazo: z.string()
    .nullable()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const prazoDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return prazoDate >= today;
    }, "Prazo não pode ser no passado"),
});

export const contributionSchema = z.object({
  valor: z.number()
    .positive("Valor deve ser maior que zero"),
  data: z.string()
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return date <= today;
    }, "Data não pode ser no futuro"),
});

export const investmentSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  tipo: z.enum(['rf', 'rv', 'fundo', 'outros'], {
    required_error: "Tipo é obrigatório"
  }),
  corretora: z.string().trim().max(100).optional(),
  observacoes: z.string().trim().max(500).optional(),
  wallet_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['ativo', 'resgatado', 'liquidado']).default('ativo'),
});

export const investmentContributionSchema = z.object({
  valor: z.coerce
    .number({ required_error: "Valor é obrigatório" })
    .positive("Valor deve ser positivo"),
  data: z.string().refine((date) => {
    return new Date(date) <= new Date();
  }, "Data não pode ser no futuro"),
});

export const userSettingsSchema = z.object({
  budget_mode: z.enum(['pagas', 'pagas_e_pendentes'], {
    required_error: "Modo de orçamento é obrigatório"
  }),
});

export const transferSchema = z.object({
  from_wallet_id: z.string().uuid('Carteira de origem inválida'),
  to_wallet_id: z.string().uuid('Carteira de destino inválida'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  data: z.string().min(1, 'Data é obrigatória'),
  descricao: z.string().max(200, 'Descrição muito longa').optional(),
}).refine((data) => data.from_wallet_id !== data.to_wallet_id, {
  message: 'Carteiras de origem e destino devem ser diferentes',
  path: ['to_wallet_id'],
});

export const statementSchema = z.object({
  wallet_id: z.string().uuid('Cartão inválido'),
  abre: z.string().min(1, 'Data de abertura é obrigatória'),
  fecha: z.string().min(1, 'Data de fechamento é obrigatória'),
  vence: z.string().min(1, 'Data de vencimento é obrigatória'),
}).refine((data) => new Date(data.abre) < new Date(data.fecha), {
  message: 'Data de fechamento deve ser após abertura',
  path: ['fecha'],
}).refine((data) => new Date(data.fecha) < new Date(data.vence), {
  message: 'Data de vencimento deve ser após fechamento',
  path: ['vence'],
});

export const payStatementSchema = z.object({
  payment_wallet_id: z.string().uuid('Conta de pagamento inválida'),
  payment_date: z.string().min(1, 'Data de pagamento é obrigatória'),
});

export const recurringTransactionSchema = z.object({
  tipo: z.enum(['receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(200, 'Descrição muito longa'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  category_id: z.string().uuid('Categoria inválida'),
  wallet_id: z.string().uuid().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  natureza: z.enum(['fixa', 'variavel']).optional().nullable(),
  
  // Configuração da recorrência
  frequencia: z.enum(['semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'], {
    required_error: 'Frequência é obrigatória',
  }),
  dia_referencia: z.number().min(1).max(31),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
}).refine((data) => {
  if (!data.data_fim) return true;
  return new Date(data.data_fim) > new Date(data.data_inicio);
}, {
  message: 'Data de término deve ser após data de início',
  path: ['data_fim'],
});
