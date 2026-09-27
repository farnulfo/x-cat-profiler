import { parseHar } from './har.js';

const $ = id => document.getElementById(id);
let data = null;
let generation = 0;

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function duration(time) {
  return time === null ? '—' : `${Math.round(time).toLocaleString('fr-FR')} ms`;
}

function showDetail(entry) {
  const content = $('detail-content');
  content.replaceChildren();
  content.append(el('p', `${entry.method} · ${entry.status ?? '—'} · ${duration(entry.time)}`), el('p', entry.url));
  content.append(el('h3', 'X-CAT-PROFILER'), el('pre', entry.profiler.map(value => value || '(valeur vide)').join('\n')));
  content.append(el('h3', 'TOUS LES HEADERS DE RÉPONSE'));
  content.append(el('pre', entry.headers.map(header => `${header?.name ?? ''}: ${header?.value ?? ''}`).join('\n')));
  $('details').showModal();
}

function render() {
  const query = $('search').value.trim().toLowerCase();
  const matches = data?.matches ?? [];
  const filtered = matches.filter(entry => [entry.url, entry.method, String(entry.status), ...entry.profiler].some(value => value.toLowerCase().includes(query)));
  $('total').textContent = data ? data.total.toLocaleString('fr-FR') : '—';
  $('matched').textContent = data ? matches.length.toLocaleString('fr-FR') : '—';
  $('ratio').textContent = data ? `${data.total ? Math.round(matches.length / data.total * 100) : 0} %` : '—';
  $('count').textContent = filtered.length;
  $('search').disabled = !data;
  $('rows').replaceChildren();
  const fragment = document.createDocumentFragment();
  filtered.forEach(entry => {
    const row = el('tr');
    const method = el('td');
    method.append(el('span', entry.method, `method ${entry.method === 'GET' ? '' : 'write'}`));
    const urlCell = el('td');
    let path = entry.url || 'URL non renseignée';
    let host = '';
    try { const url = new URL(entry.url); path = url.pathname + url.search + url.hash; host = url.host; } catch {}
    urlCell.title = entry.url;
    urlCell.append(el('div', path, 'url-path'), el('div', host, 'url-host'));
    const status = el('td', String(entry.status ?? '—'), `status ${entry.status >= 400 ? 'bad' : ''}`);
    const profiler = el('td');
    const value = entry.profiler.join(', ') || '(valeur vide)';
    profiler.append(el('code', value));
    profiler.title = value;
    const action = el('td');
    const button = el('button', '↗', 'detail-button');
    button.setAttribute('aria-label', `Afficher le détail de ${entry.method} ${entry.url}`);
    button.addEventListener('click', () => showDetail(entry));
    action.append(button);
    row.append(method, urlCell, status, el('td', duration(entry.time)), profiler, action);
    fragment.append(row);
  });
  $('rows').append(fragment);
  $('empty').hidden = filtered.length > 0;
  const title = $('empty').querySelector('h3');
  const description = $('empty').querySelector('p');
  if (!data) {
    title.textContent = 'Tout commence par un fichier HAR';
    description.textContent = 'Importez votre capture réseau pour explorer les requêtes contenant x-cat-profiler.';
  } else if (!matches.length) {
    title.textContent = 'Aucune réponse avec x-cat-profiler';
    description.textContent = `${data.total} requête(s) analysée(s). Ce header est absent des réponses de ce fichier.`;
  } else {
    title.textContent = 'Aucun résultat pour cette recherche';
    description.textContent = 'Essayez une autre URL, une méthode ou une valeur de x-cat-profiler.';
  }
  $('result-summary').textContent = data ? `${filtered.length} requête(s) affichée(s) sur ${matches.length} profilée(s)` : 'En attente d’un fichier';
}

function load(text, name, size, demo = false) {
  const parsed = parseHar(text);
  data = parsed;
  $('search').value = '';
  $('file-name').textContent = name;
  $('file-size').textContent = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(size / 1024))} Ko`;
  $('file-info').hidden = false;
  $('demo-tag').hidden = !demo;
  $('error').hidden = true;
  render();
}

async function importFile(file) {
  if (!file) return;
  const current = ++generation;
  $('error').hidden = true;
  $('choose').disabled = true;
  $('choose').textContent = 'Analyse en cours…';
  try {
    const text = await file.text();
    if (current !== generation) return;
    load(text, file.name, file.size);
  } catch (error) {
    if (current !== generation) return;
    $('error').textContent = error.message || 'Impossible de lire ce fichier.';
    $('error').hidden = false;
  } finally {
    if (current === generation) {
      $('choose').disabled = false;
      $('choose').textContent = '＋ Choisir un fichier';
      $('file').value = '';
    }
  }
}

$('choose').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', event => importFile(event.target.files[0]));
let dragDepth = 0;
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('dropzone').addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; $('dropzone').classList.add('dragging'); });
$('dropzone').addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
$('dropzone').addEventListener('dragleave', () => { if (--dragDepth <= 0) $('dropzone').classList.remove('dragging'); });
$('dropzone').addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  $('dropzone').classList.remove('dragging');
  if (event.dataTransfer.files.length > 1) {
    $('error').textContent = 'Veuillez importer un seul fichier HAR à la fois.';
    $('error').hidden = false;
    return;
  }
  importFile(event.dataTransfer.files[0]);
});
$('search').addEventListener('input', render);
$('clear').addEventListener('click', () => {
  generation++;
  data = null;
  $('file').value = '';
  $('search').value = '';
  $('file-info').hidden = true;
  $('error').hidden = true;
  $('choose').disabled = false;
  $('choose').textContent = '＋ Choisir un fichier';
  render();
});
$('close-details').addEventListener('click', () => $('details').close());
$('details').addEventListener('click', event => { if (event.target === $('details') && event.offsetX < 0) $('details').close(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !$('details').open && data) {
    event.preventDefault();
    $('search').focus();
  }
});
$('demo').addEventListener('click', () => {
  generation++;
  $('choose').disabled = false;
  $('choose').textContent = '＋ Choisir un fichier';
  const paths = ['/api/products', '/api/products/42', '/api/cart', '/api/categories', '/api/search?q=cat', '/assets/app.css', '/favicon.ico', '/api/session'];
  const sample = { log: { version: '1.2', entries: paths.map((path, i) => ({
    request: { method: i === 2 ? 'POST' : 'GET', url: `https://demo.example.com${path}` },
    response: { status: i === 7 ? 401 : 200, headers: [
      { name: 'content-type', value: 'application/json' },
      ...(i < 5 ? [{ name: i === 1 ? 'X-Cat-Profiler' : 'x-cat-profiler', value: `cat-${['a8f21c', 'b3e902', 'c17d4a', 'd9f310', 'e52a8b'][i]}` }] : []),
    ] }, time: [124, 86, 218, 42, 167, 12, 8, 56][i],
  })) } };
  const text = JSON.stringify(sample);
  load(text, 'exemple-boutique.har', new Blob([text]).size, true);
});
