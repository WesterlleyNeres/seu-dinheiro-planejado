import { normalizeString } from './csvParser';

export interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  score: number;
}

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 1.0;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.9;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  return 1 - (distance / maxLength);
};

export const matchCategory = (
  description: string,
  categories: Array<{ id: string; nome: string; tipo: string }>
): CategoryMatch | null => {
  const MIN_SCORE = 0.7;
  
  let bestMatch: CategoryMatch | null = null;
  let bestScore = 0;
  
  categories.forEach(category => {
    const score = calculateSimilarity(description, category.nome);
    
    if (score > bestScore && score >= MIN_SCORE) {
      bestScore = score;
      bestMatch = {
        categoryId: category.id,
        categoryName: category.nome,
        score,
      };
    }
  });
  
  return bestMatch;
};

export const matchCategoryByKeywords = (
  description: string,
  categories: Array<{ id: string; nome: string; tipo: string }>
): CategoryMatch | null => {
  const keywords: Record<string, string[]> = {
    mercado: ['mercado', 'supermercado', 'feira', 'hortifruti', 'padaria'],
    transporte: ['uber', 'taxi', '99', 'transporte', 'combustivel', 'gasolina'],
    alimentacao: ['ifood', 'restaurante', 'lanche', 'comida', 'delivery'],
    saude: ['farmacia', 'medico', 'consulta', 'exame', 'hospital'],
    lazer: ['cinema', 'streaming', 'netflix', 'spotify', 'entretenimento'],
    casa: ['aluguel', 'condominio', 'agua', 'luz', 'internet', 'gas'],
  };
  
  const normalized = normalizeString(description);
  
  for (const [categoryKey, words] of Object.entries(keywords)) {
    if (words.some(word => normalized.includes(word))) {
      const category = categories.find(c => normalizeString(c.nome).includes(categoryKey));
      if (category) {
        return {
          categoryId: category.id,
          categoryName: category.nome,
          score: 0.85,
        };
      }
    }
  }
  
  return null;
};
