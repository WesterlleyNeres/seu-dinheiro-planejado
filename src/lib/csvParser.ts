export interface ColumnMapping {
  data?: string;
  valor?: string;
  descricao?: string;
  categoria?: string;
  tipo?: string;
  wallet?: string;
  payment_method?: string;
  status?: string;
}

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
}

export const parseCSV = (content: string): ParsedCSVData => {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Arquivo CSV vazio');
  }
  
  const headers = lines[0].split(/[,;]/).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return { headers, rows };
};

const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const detectColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};
  
  const patterns = {
    data: ['data', 'date', 'dt', 'vencimento', 'pagamento'],
    valor: ['valor', 'value', 'amount', 'quantia', 'preco', 'total'],
    descricao: ['descricao', 'description', 'historico', 'memo', 'detalhe'],
    categoria: ['categoria', 'category', 'tipo', 'class'],
    tipo: ['tipo', 'type', 'natureza'],
    status: ['status', 'situacao', 'estado'],
  };
  
  headers.forEach(header => {
    const normalized = normalizeColumnName(header);
    
    Object.entries(patterns).forEach(([key, values]) => {
      if (values.some(pattern => normalized.includes(pattern))) {
        if (!mapping[key as keyof ColumnMapping]) {
          mapping[key as keyof ColumnMapping] = header;
        }
      }
    });
  });
  
  return mapping;
};

export const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  // DD/MM/YYYY
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const matchDDMMYYYY = dateStr.match(ddmmyyyy);
  if (matchDDMMYYYY) {
    const [, day, month, year] = matchDDMMYYYY;
    return `${year}-${month}-${day}`;
  }
  
  // YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (yyyymmdd.test(dateStr)) {
    return dateStr;
  }
  
  // MM/DD/YYYY
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const matchMMDDYYYY = dateStr.match(mmddyyyy);
  if (matchMMDDYYYY) {
    const [, month, day, year] = matchMMDDYYYY;
    if (parseInt(month) > 12) {
      return `${year}-${day}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

export const parseValue = (valueStr: string): number => {
  if (!valueStr) return 0;
  
  // Remove R$, espaços, pontos de milhar
  const cleaned = valueStr
    .replace(/R\$?\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : Math.abs(value);
};

export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};
