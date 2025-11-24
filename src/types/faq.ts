export type FAQSeverity = 'info' | 'warning' | 'error';

export interface FAQLink {
  label: string;
  path: string;
}

export interface FAQItem {
  id: string;
  category: string;
  severity: FAQSeverity;
  question: string;
  answer: string;
  solution?: string[];
  relatedLinks: FAQLink[];
  tags: string[];
}

export const FAQ_CATEGORIES = [
  'Todas',
  'Períodos e Bloqueios',
  'Recorrências',
  'Importação',
  'Cartões e Faturas',
  'Saldos e Auditoria',
  'Configurações',
] as const;

export type FAQCategory = typeof FAQ_CATEGORIES[number];
