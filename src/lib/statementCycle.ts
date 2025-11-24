/**
 * Calcula as datas de abertura, fechamento e vencimento de uma fatura
 * baseado no dia de fechamento, dia de vencimento e data da transação
 */
export function calculateStatementDates(
  diaFechamento: number,
  diaVencimento: number,
  transactionDate: string
): { abre: string; fecha: string; vence: string } {
  const txDate = new Date(transactionDate);
  const txDay = txDate.getDate();
  const txMonth = txDate.getMonth();
  const txYear = txDate.getFullYear();

  let cycleMonth = txMonth;
  let cycleYear = txYear;

  // Se a transação é após o dia de fechamento, vai para o próximo ciclo
  if (txDay > diaFechamento) {
    cycleMonth++;
    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear++;
    }
  }

  // Data de abertura: dia seguinte ao fechamento do ciclo anterior
  const prevMonth = cycleMonth === 0 ? 11 : cycleMonth - 1;
  const prevYear = cycleMonth === 0 ? cycleYear - 1 : cycleYear;
  const abreDate = new Date(prevYear, prevMonth, diaFechamento + 1);
  
  // Data de fechamento: dia de fechamento do ciclo atual
  const fechaDate = new Date(cycleYear, cycleMonth, diaFechamento);
  
  // Data de vencimento: dia de vencimento após o fechamento
  let venceMonth = cycleMonth;
  let venceYear = cycleYear;
  
  // Se dia de vencimento é menor que dia de fechamento, vencimento é no próximo mês
  if (diaVencimento <= diaFechamento) {
    venceMonth++;
    if (venceMonth > 11) {
      venceMonth = 0;
      venceYear++;
    }
  }
  
  const venceDate = new Date(venceYear, venceMonth, diaVencimento);

  // Formatar no formato YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    abre: formatDate(abreDate),
    fecha: formatDate(fechaDate),
    vence: formatDate(venceDate),
  };
}
