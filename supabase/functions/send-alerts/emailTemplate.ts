interface AlertData {
  upcomingBills: Array<{
    descricao: string;
    valor: number;
    data: string;
    daysUntil: number;
  }>;
  budgetAlerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }>;
  statementAlerts: Array<{
    wallet: string;
    vence: string;
    total: number;
    daysUntil: number;
  }>;
  goalAlerts: Array<{
    nome: string;
    progress: number;
    target: number;
    prazo: string;
    daysUntil: number;
  }>;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const generateAlertEmail = (data: AlertData, userEmail: string): string => {
  const styles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .section { background: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .item { padding: 12px; margin-bottom: 8px; background: #f7f7f7; border-radius: 6px; border-left: 4px solid #667eea; }
    .warning { border-left-color: #f59e0b; }
    .danger { border-left-color: #ef4444; }
    .amount { font-weight: bold; font-size: 1.1em; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
  `;

  let sections = '';

  // Upcoming Bills
  if (data.upcomingBills.length > 0) {
    sections += `
      <div class="section">
        <h2 style="margin-top: 0;">📅 Vencimentos Próximos</h2>
        ${data.upcomingBills.map(bill => `
          <div class="item ${bill.daysUntil <= 3 ? 'danger' : bill.daysUntil <= 7 ? 'warning' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${bill.descricao}</strong><br>
                <small style="color: #666;">Vence em ${formatDate(bill.data)}</small>
                <span class="badge ${bill.daysUntil <= 3 ? 'badge-danger' : 'badge-warning'}">${bill.daysUntil} dias</span>
              </div>
              <div class="amount">${formatCurrency(bill.valor)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Budget Alerts
  if (data.budgetAlerts.length > 0) {
    sections += `
      <div class="section">
        <h2 style="margin-top: 0;">⚠️ Alertas de Orçamento</h2>
        ${data.budgetAlerts.map(alert => `
          <div class="item ${alert.percentage >= 100 ? 'danger' : 'warning'}">
            <div>
              <strong>${alert.category}</strong><br>
              <div style="margin-top: 8px;">
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${Math.min(alert.percentage, 100)}%; height: 100%; background: ${alert.percentage >= 100 ? '#ef4444' : '#f59e0b'};"></div>
                </div>
                <small style="color: #666; margin-top: 4px; display: block;">
                  ${formatCurrency(alert.spent)} de ${formatCurrency(alert.limit)} (${alert.percentage.toFixed(0)}%)
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Statement Alerts
  if (data.statementAlerts.length > 0) {
    sections += `
      <div class="section">
        <h2 style="margin-top: 0;">💳 Faturas de Cartão</h2>
        ${data.statementAlerts.map(stmt => `
          <div class="item warning">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${stmt.wallet}</strong><br>
                <small style="color: #666;">Vence em ${formatDate(stmt.vence)}</small>
                <span class="badge badge-warning">${stmt.daysUntil} dias</span>
              </div>
              <div class="amount">${formatCurrency(stmt.total)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Goal Alerts
  if (data.goalAlerts.length > 0) {
    sections += `
      <div class="section">
        <h2 style="margin-top: 0;">🎯 Metas em Andamento</h2>
        ${data.goalAlerts.map(goal => {
          const percentage = (goal.progress / goal.target) * 100;
          return `
            <div class="item">
              <div>
                <strong>${goal.nome}</strong><br>
                <small style="color: #666;">Prazo: ${formatDate(goal.prazo)} (${goal.daysUntil} dias)</small>
                <div style="margin-top: 8px;">
                  <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: #667eea;"></div>
                  </div>
                  <small style="color: #666; margin-top: 4px; display: block;">
                    ${formatCurrency(goal.progress)} de ${formatCurrency(goal.target)} (${percentage.toFixed(0)}%)
                  </small>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${styles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">☀️ Bom dia!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Aqui está seu resumo financeiro diário</p>
        </div>
        
        ${sections}

        <div class="footer">
          <p>Configure seus alertas em: <a href="${Deno.env.get('APP_URL') || 'http://localhost:8080'}/settings" style="color: #667eea;">Configurações</a></p>
          <p style="margin-top: 10px; font-size: 0.85em; color: #999;">
            Você está recebendo este email porque habilitou alertas diários no FRACTTO FLOW.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
