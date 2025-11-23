import { normalizeString } from './csvParser';
import { supabase } from './supabase';

export interface TransactionFingerprint {
  fingerprint: string;
  data: string;
  valor: number;
  descricao: string;
}

export const generateFingerprint = (
  data: string,
  valor: number,
  descricao: string
): string => {
  const normalized = normalizeString(descricao);
  const dataStr = data.replace(/-/g, '');
  const valorStr = valor.toFixed(2).replace('.', '');
  
  return `${dataStr}_${valorStr}_${normalized}`;
};

export const checkDuplicates = async (
  transactions: TransactionFingerprint[]
): Promise<Set<string>> => {
  const duplicates = new Set<string>();
  
  if (transactions.length === 0) return duplicates;
  
  try {
    const { data: existingTransactions, error } = await supabase
      .from('transactions')
      .select('data, valor, descricao')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    const existingFingerprints = new Set(
      existingTransactions.map(t => 
        generateFingerprint(t.data, Number(t.valor), t.descricao)
      )
    );
    
    transactions.forEach(tx => {
      if (existingFingerprints.has(tx.fingerprint)) {
        duplicates.add(tx.fingerprint);
      }
    });
    
    return duplicates;
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    return duplicates;
  }
};

export const checkInternalDuplicates = (
  transactions: TransactionFingerprint[]
): Set<string> => {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  
  transactions.forEach((tx, index) => {
    if (seen.has(tx.fingerprint)) {
      duplicates.add(tx.fingerprint);
      duplicates.add(transactions[seen.get(tx.fingerprint)!].fingerprint);
    } else {
      seen.set(tx.fingerprint, index);
    }
  });
  
  return duplicates;
};
