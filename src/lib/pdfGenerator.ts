import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyReportData {
  period: string;
  summary: {
    receitas_pagas: number;
    despesas_pagas: number;
    saldo: number;
  };
  categories: Array<{
    category_name: string;
    total: number;
    percentage: number;
  }>;
  recurring: {
    active_recurring: number;
    monthly_impact: number;
  };
}

export const generateMonthlyReport = (data: MonthlyReportData) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Relatório Financeiro Mensal', 20, 20);
  doc.setFontSize(12);
  doc.text(`Período: ${data.period}`, 20, 30);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, 37);
  
  // Summary section
  doc.setFontSize(16);
  doc.text('Resumo Financeiro', 20, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Descrição', 'Valor']],
    body: [
      ['Receitas', formatCurrency(data.summary.receitas_pagas)],
      ['Despesas', formatCurrency(data.summary.despesas_pagas)],
      ['Saldo', formatCurrency(data.summary.saldo)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Categories section
  const finalY = (doc as any).lastAutoTable.finalY || 55;
  doc.setFontSize(16);
  doc.text('Top 5 Categorias de Despesas', 20, finalY + 15);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Categoria', 'Valor', '%']],
    body: data.categories.slice(0, 5).map(c => [
      c.category_name,
      formatCurrency(c.total),
      `${c.percentage.toFixed(1)}%`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Recurring section
  if (data.recurring.active_recurring > 0) {
    const lastY = (doc as any).lastAutoTable.finalY || 20;
    doc.setFontSize(16);
    doc.text('Recorrências Ativas', 20, lastY + 15);
    doc.setFontSize(12);
    doc.text(`${data.recurring.active_recurring} recorrências ativas`, 20, lastY + 22);
    doc.text(`Impacto mensal: ${formatCurrency(data.recurring.monthly_impact)}`, 20, lastY + 29);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Gerado por FRACTTO FLOW', 20, pageHeight - 10);
  
  // Save file
  doc.save(`relatorio-${data.period}.pdf`);
};
