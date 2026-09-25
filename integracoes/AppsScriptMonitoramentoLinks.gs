/** Cole no Apps Script VINCULADO à planilha unificada e implante como app da Web.
 * Configure Script Properties: DASHBOARD_INGEST_TOKEN = segredo longo aleatório.
 * Execute como: você. Acesso: qualquer pessoa (o token autentica cada POST).
 */
const PLANILHA_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('DASHBOARD_INGEST_TOKEN');
    if (!secret || !payload.token || payload.token !== secret) throw new Error('Não autorizado');
    if (!Array.isArray(payload.rows) || payload.rows.length > 1000) throw new Error('Lote inválido');
    if (!lock.tryLock(30000)) throw new Error('Outra importação em andamento');
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const current = ss.getSheetByName('Monitoramento Links');
    const history = ss.getSheetByName('Histórico Links');
    if (!current || !history) throw new Error('Abas de monitoramento não encontradas');
    const rows = payload.rows.map(p => {
      if (!p || !p.id || !p.title) throw new Error('Produto sem ID ou nome');
      const status = String(p.status || 'Não verificado');
      if (!['Funcionando','Redirecionado','Erro','Não verificado','Acesso bloqueado'].includes(status)) throw new Error('Status inválido');
      const date = new Date(payload.checked_at || Date.now());
      if (isNaN(date.getTime())) throw new Error('Data inválida');
      const detail = String(p.detail || '').slice(0,1000);
      const http = String(p.http || '').slice(0,12);
      const destination = String(p.destination || '').slice(0,500);
      const action = status === 'Erro' ? 'Revisar link' : status === 'Acesso bloqueado' || status === 'Não verificado' ? 'Verificar manualmente' : '';
      return [date, String(p.id), String(p.title), status, http, destination, detail, 'GitHub Actions', action];
    });
    const previous = current.getLastRow();
    if (previous > 1) current.getRange(2,1,previous-1,9).clearContent();
    if (rows.length) {
      if (current.getMaxRows() < rows.length+1) current.insertRowsAfter(current.getMaxRows(), rows.length+1-current.getMaxRows());
      current.getRange(2,1,rows.length,9).setValues(rows);
      current.getRange(2,1,rows.length,1).setNumberFormat('dd/MM/yyyy HH:mm');
      const failures = rows.filter(r => !['Funcionando','Redirecionado'].includes(r[3]));
      if (failures.length) {
        if (history.getMaxRows() < history.getLastRow()+failures.length) history.insertRowsAfter(history.getMaxRows(), history.getLastRow()+failures.length-history.getMaxRows());
        history.getRange(history.getLastRow()+1,1,failures.length,9).setValues(failures);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true,received:rows.length})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err.message)})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
