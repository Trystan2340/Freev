(() => {
  'use strict';
  const T = window.FreevToolkit;
  const MAX_SIZE = 5 * 1024 * 1024;
  let rows = [];
  let fields = [];

  function filteredRows() {
    const query = T.byId('csv-search').value.trim().toLocaleLowerCase('fr');
    if (!query) return rows;
    return rows.filter((row) => fields.some((field) => String(row[field] ?? '').toLocaleLowerCase('fr').includes(query)));
  }

  function render() {
    const table = T.byId('csv-table');
    const visible = filteredRows().slice(0, 500);
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    fields.forEach((field) => { const th = document.createElement('th'); th.textContent = field; headRow.appendChild(th); });
    head.appendChild(headRow);
    const body = document.createElement('tbody');
    visible.forEach((row) => {
      const tr = document.createElement('tr');
      fields.forEach((field) => { const td = document.createElement('td'); td.textContent = String(row[field] ?? ''); tr.appendChild(td); });
      body.appendChild(tr);
    });
    table.replaceChildren(head, body);
    T.byId('csv-stats').replaceChildren(...[
      `${rows.length} ligne${rows.length > 1 ? 's' : ''}`,
      `${fields.length} colonne${fields.length > 1 ? 's' : ''}`,
      visible.length < filteredRows().length ? `Aperçu limité à ${visible.length}` : `${visible.length} affichée${visible.length > 1 ? 's' : ''}`,
    ].map((text) => { const span = document.createElement('span'); span.className = 'tool-stat'; span.textContent = text; return span; }));
  }

  function json() { return JSON.stringify(filteredRows(), null, 2); }

  T.byId('csv-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) return T.setStatus('Le fichier dépasse 5 Mo.', 'error');
    const result = Papa.parse(await file.text(), { header: true, skipEmptyLines: 'greedy', transformHeader: (name, index) => name.trim() || `Colonne ${index + 1}` });
    rows = result.data;
    fields = result.meta.fields || [];
    T.byId('csv-json').disabled = !rows.length;
    T.byId('csv-copy').disabled = !rows.length;
    render();
    T.setStatus(result.errors.length ? `${result.errors.length} anomalie(s) détectée(s), données affichées.` : 'CSV analysé avec succès.', result.errors.length ? '' : 'success');
  });
  T.byId('csv-search').addEventListener('input', render);
  T.byId('csv-json').addEventListener('click', () => T.downloadText(json(), 'donnees-freev.json', 'application/json;charset=utf-8'));
  T.byId('csv-copy').addEventListener('click', () => T.copyText(json()));

  window.freevGetSaveData = () => ({ app: 'CSVExplorer', version: 1, query: T.byId('csv-search').value, note: 'Les fichiers CSV ne sont pas copiés dans le cloud.' });
  window.freevApplySaveData = (data) => { T.byId('csv-search').value = String(data?.query || ''); render(); };
})();
