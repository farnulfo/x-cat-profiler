import { parseHar } from './har.js';
import { decodeProfiler } from './profiler.js';
import { profilerView, rawSection } from './profiler-view.js';
import { profilerText, sortRequests } from './request-sort.js';
import { analyzeProfilers } from './profiler-analysis.js';

const $ = id => document.getElementById(id);
let data = null;
let generation = 0;
let sortKey = null;
let sortDirection = 'asc';

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function duration(time) {
  return time === null ? '—' : `${Math.round(time).toLocaleString('fr-FR')} ms`;
}

function showDetail(entry, target = null) {
  const content = $('detail-content');
  content.replaceChildren();
  content.append(el('p', `${entry.method} · ${entry.status ?? '—'} · ${duration(entry.time)}`), el('p', entry.url));
  entry.decodedProfiler.forEach((result, index) => {
    content.append(el('h3', `EXPLORATEUR DU PROFILER${entry.profiler.length > 1 ? ` (${index + 1})` : ''}`));
    content.append(result.error ? el('p', result.error, 'error') : profilerView(result.text, target?.headerIndex === index ? target.line : null));
  });
  content.append(rawSection('Valeur brute — Base64', entry.profiler.map(value => value || '(valeur vide)').join('\n')));
  content.append(rawSection('Tous les headers de réponse', entry.headers.map(header => `${header?.name ?? ''}: ${header?.value ?? ''}`).join('\n')));
  $('details').showModal();
  const selected = content.querySelector('.profiler-selected');
  if (selected) {
    selected.focus({ preventScroll: true });
    selected.scrollIntoView({ block: 'center' });
  }
}

function resetAnalysis() {
  $('analysis-results').hidden = true;
  $('analysis-list').replaceChildren();
  $('analysis-summary').textContent = '';
}

function showAnalysis() {
  if (!data) return;
  const analysis = analyzeProfilers(data.matches);
  $('analysis-list').replaceChildren();
  $('analysis-summary').textContent = `${analysis.steps} étapes analysées dans ${analysis.requests} requêtes profilées sur ${data.total} requêtes HAR. ${analysis.invalidHeaders} header(s) non décodable(s), ${analysis.unparsedLines} ligne(s) non reconnue(s).`;
  analysis.top.forEach((item, index) => {
    const card = el('li', undefined, 'analysis-item');
    const heading = el('div', undefined, 'analysis-item-heading');
    heading.append(el('span', String(index + 1).padStart(2, '0'), 'analysis-rank'), el('strong', item.name), el('span', `${item.time.toLocaleString('fr-FR', { maximumFractionDigits: 20 })} ms`, 'profiler-time'));
    const path = el('p', item.path.join(' › '), 'analysis-path');
    const source = el('div', undefined, 'analysis-source');
    const label = `Requête HAR #${item.entry.id + 1} · ${item.entry.method} ${item.entry.url || '(URL absente)'} · Header ${item.headerIndex + 1}, ligne ${item.line}`;
    const button = el('button', 'Voir la requête et l’étape ↗', 'button secondary');
    button.type = 'button';
    button.setAttribute('aria-label', `Voir ${item.name} dans la requête HAR ${item.entry.id + 1}, header ${item.headerIndex + 1}, ligne ${item.line}`);
    button.addEventListener('click', () => showDetail(item.entry, item));
    source.append(el('span', label), button);
    card.append(heading, path, source);
    $('analysis-list').append(card);
  });
  $('analysis-empty').hidden = analysis.top.length > 0;
  $('analysis-results').hidden = false;
}

function render() {
  const query = $('search').value.trim().toLowerCase();
  const matches = data?.matches ?? [];
  const filtered = sortRequests(matches.filter(entry => [entry.url, entry.method, String(entry.status), ...entry.profiler, ...entry.decodedProfiler.map(result => result.text ?? '')].some(value => value.toLowerCase().includes(query))), sortKey, sortDirection);
  document.querySelectorAll('[data-sort]').forEach(button => {
    const active = button.dataset.sort === sortKey;
    button.closest('th').setAttribute('aria-sort', active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
    button.querySelector('.sort-icon').textContent = active ? (sortDirection === 'asc' ? '↑' : '↓') : '↕';
  });
  $('total').textContent = data ? data.total.toLocaleString('fr-FR') : '—';
  $('matched').textContent = data ? matches.length.toLocaleString('fr-FR') : '—';
  $('ratio').textContent = data ? `${data.total ? Math.round(matches.length / data.total * 100) : 0} %` : '—';
  $('count').textContent = filtered.length;
  $('search').disabled = !data;
  $('analyze').disabled = !data;
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
    const value = profilerText(entry);
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

async function load(text, name, size, demo, current) {
  const parsed = parseHar(text);
  for (const entry of parsed.matches) {
    entry.decodedProfiler = [];
    for (const value of entry.profiler) {
      if (current !== generation) return;
      entry.decodedProfiler.push(await decodeProfiler(value));
    }
  }
  if (current !== generation) return;
  data = parsed;
  resetAnalysis();
  $('search').value = '';
  $('file-name').textContent = name;
  $('file-size').textContent = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(size / 1024))} Ko`;
  $('file-info').hidden = false;
  $('demo-tag').hidden = !demo;
  $('error').hidden = true;
  render();
}

async function importFile(file, demo = false) {
  if (!file) return;
  const current = ++generation;
  $('error').hidden = true;
  $('choose').disabled = true;
  $('choose').textContent = 'Analyse en cours…';
  try {
    const text = await file.text();
    if (current !== generation) return;
    await load(text, file.name, file.size, demo, current);
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
$('analyze').addEventListener('click', showAnalysis);
document.querySelectorAll('[data-sort]').forEach(button => {
  button.addEventListener('click', () => {
    sortDirection = sortKey === button.dataset.sort && sortDirection === 'asc' ? 'desc' : 'asc';
    sortKey = button.dataset.sort;
    render();
  });
});
$('clear').addEventListener('click', () => {
  generation++;
  data = null;
  resetAnalysis();
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
  const paths = ['/api/products', '/api/products/42', '/api/cart', '/api/categories', '/api/search?q=cat', '/assets/app.css', '/favicon.ico', '/api/session'];
  const sample = { log: { version: '1.2', entries: paths.map((path, i) => ({
    request: { method: i === 2 ? 'POST' : 'GET', url: `https://demo.example.com${path}` },
    response: { status: i === 7 ? 401 : 200, headers: [
      { name: 'content-type', value: 'application/json' },
      ...(i < 5 ? [{ name: i === 1 ? 'X-Cat-Profiler' : 'x-cat-profiler', value: 'H4sIAAAAAAACA02OOw7CMBBEe07hI0AAiWYrCiSUhnACQ7aw5NjJfrhTqLmBL0ZiQ2DLmae3A9DgoOkpaG5RxQ2KBsDsqo5XMN0xBqH08qiU8/UnB6jxLkpoWmTTU2zVCc9IdVgQ+MmvlzqX279ycj+Q2MWQJZRGVi+2aPYLeEpjSCNZKaDxdkb7GDhP3XynnqNSsN5xIedvHb8BoqGwveAAAAA=' }] : []),
    ] }, time: [124, 86, 218, 42, 167, 12, 8, 56][i],
  })) } };
  const text = JSON.stringify(sample);
  importFile(new File([text], 'exemple-boutique.har', { type: 'application/json' }), true);
});
