import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseCSV, detectColumns, parseDate, parseValue, ColumnMapping, ParsedCSVData } from '@/lib/csvParser';
import { matchCategory, matchCategoryByKeywords, CategoryMatch } from '@/lib/categoryMatcher';
import { generateFingerprint, checkDuplicates, checkInternalDuplicates, TransactionFingerprint } from '@/lib/deduplication';

export interface PreviewRow {
  id: string;
  data: string | null;
  valor: number;
  descricao: string;
  categoria?: string;
  categoryId?: string;
  categoryMatch?: CategoryMatch;
  tipo: 'receita' | 'despesa';
  isDuplicate: boolean;
  selected: boolean;
  fingerprint: string;
}

export type ImportStep = 'upload' | 'map' | 'preview' | 'summary';

export interface ImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string }>;
}

export const useImporter = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; nome: string; tipo: string }>>([]);

  const loadCategories = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('categories')
      .select('id, nome, tipo')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const content = await file.text();
      const parsed = parseCSV(content);
      
      if (parsed.rows.length === 0) {
        throw new Error('Arquivo não contém dados válidos');
      }
      
      setCsvData(parsed);
      const autoMapping = detectColumns(parsed.headers);
      setMapping(autoMapping);
      await loadCategories();
      
      toast.success(`Arquivo carregado: ${parsed.rows.length} linhas`);
      setStep('map');
    } catch (error: any) {
      toast.error(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!csvData || !mapping.data || !mapping.valor || !mapping.descricao) {
      toast.error('Mapeamento incompleto. Campos obrigatórios: Data, Valor, Descrição');
      return;
    }

    setLoading(true);
    try {
      await loadCategories();
      
      const previewRows: PreviewRow[] = csvData.rows.map((row, index) => {
        const data = parseDate(row[mapping.data!]);
        const valor = parseValue(row[mapping.valor!]);
        const descricao = row[mapping.descricao!] || `Transação ${index + 1}`;
        const categoriaText = mapping.categoria ? row[mapping.categoria] : '';
        
        let categoryMatch = null;
        if (categoriaText) {
          categoryMatch = matchCategory(categoriaText, categories);
          if (!categoryMatch) {
            categoryMatch = matchCategoryByKeywords(descricao, categories);
          }
        } else {
          categoryMatch = matchCategoryByKeywords(descricao, categories);
        }
        
        const fingerprint = generateFingerprint(data || '', valor, descricao);
        
        return {
          id: `row-${index}`,
          data,
          valor,
          descricao,
          categoria: categoriaText,
          categoryId: categoryMatch?.categoryId,
          categoryMatch,
          tipo: 'despesa' as const,
          isDuplicate: false,
          selected: true,
          fingerprint,
        };
      }).filter(row => row.data !== null);
      
      // Check duplicates
      const transactionFingerprints: TransactionFingerprint[] = previewRows.map(r => ({
        fingerprint: r.fingerprint,
        data: r.data!,
        valor: r.valor,
        descricao: r.descricao,
      }));
      
      const externalDuplicates = await checkDuplicates(transactionFingerprints);
      const internalDuplicates = checkInternalDuplicates(transactionFingerprints);
      
      const allDuplicates = new Set([...externalDuplicates, ...internalDuplicates]);
      
      previewRows.forEach(row => {
        if (allDuplicates.has(row.fingerprint)) {
          row.isDuplicate = true;
          row.selected = false;
        }
      });
      
      setPreview(previewRows);
      setStep('preview');
      toast.success(`Preview gerado: ${previewRows.length} transações`);
    } catch (error: any) {
      toast.error(`Erro ao gerar preview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processImport = async () => {
    if (!user) return;
    
    const selectedRows = preview.filter(row => row.selected && !row.isDuplicate);
    
    if (selectedRows.length === 0) {
      toast.error('Nenhuma transação selecionada para importar');
      return;
    }

    setLoading(true);
    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;

    try {
      // Get default category
      const defaultCategory = categories.find(c => c.tipo === 'despesa');
      if (!defaultCategory) {
        throw new Error('Nenhuma categoria de despesa encontrada');
      }

      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i];
        
        try {
          const mesReferencia = row.data!.substring(0, 7); // YYYY-MM
          
          const { error } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              tipo: row.tipo,
              descricao: row.descricao,
              valor: row.valor,
              data: row.data!,
              mes_referencia: mesReferencia,
              category_id: row.categoryId || defaultCategory.id,
              status: 'pendente',
            });
          
          if (error) throw error;
          imported++;
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      // Save import history
      await supabase.from('import_history').insert({
        user_id: user.id,
        filename: 'import.csv',
        rows_imported: imported,
        rows_skipped: preview.length - selectedRows.length,
        status: errors.length === 0 ? 'success' : errors.length < selectedRows.length ? 'partial' : 'failed',
        error_log: errors.length > 0 ? errors : null,
      });

      const summaryData: ImportSummary = {
        total: selectedRows.length,
        imported,
        duplicates: preview.filter(r => r.isDuplicate).length,
        errors: errors.length,
        errorDetails: errors,
      };

      setSummary(summaryData);
      setStep('summary');
      
      if (imported > 0) {
        toast.success(`${imported} transações importadas com sucesso!`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} erros durante a importação`);
      }
    } catch (error: any) {
      toast.error(`Erro ao importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setCsvData(null);
    setMapping({});
    setPreview([]);
    setSummary(null);
  };

  return {
    step,
    setStep,
    csvData,
    mapping,
    setMapping,
    preview,
    setPreview,
    summary,
    loading,
    categories,
    processFile,
    generatePreview,
    processImport,
    reset,
  };
};
