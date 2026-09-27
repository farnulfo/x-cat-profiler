import { parseProfiler } from './profiler.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function rawSection(title, text) {
  const section = element('details', undefined, 'raw-section');
  section.append(element('summary', title), element('pre', text));
  return section;
}

export function profilerView(text) {
  const profile = parseProfiler(text);
  const view = element('section', undefined, 'profiler-view');
  if (!profile.count) {
    view.append(element('p', 'Aucune étape reconnue dans ce contenu. Le texte décompressé est disponible ci-dessous.'));
  } else {
    const toolbar = element('div', undefined, 'profiler-toolbar');
    toolbar.append(element('span', `${profile.count} étapes`, 'profiler-count'));
    const expand = element('button', 'Tout déplier', 'text-button');
    const collapse = element('button', 'Tout replier', 'text-button');
    expand.type = collapse.type = 'button';
    toolbar.append(expand, collapse);
    const tree = element('div', undefined, 'profiler-tree');
    tree.setAttribute('aria-label', 'Étapes du profilage');
    view.append(toolbar, element('p', 'Durées inclusives : les sous-étapes sont comprises dans la durée du parent. Barres : part de la durée de l’étape racine.', 'profiler-legend'), tree);
    expand.addEventListener('click', () => tree.querySelectorAll('details').forEach(node => { node.open = true; }));
    collapse.addEventListener('click', () => tree.querySelectorAll('details').forEach(node => { node.open = false; }));
    const pending = profile.roots.slice().reverse().map(node => ({ node, container: tree, total: node.time, depth: 0 }));
    while (pending.length) {
      const { node, container, total, depth } = pending.pop();
      const branch = node.children.length > 0;
      const wrapper = element(branch ? 'details' : 'div', undefined, 'profiler-node');
      const row = element(branch ? 'summary' : 'div', undefined, `profiler-row${branch ? '' : ' profiler-leaf'}`);
      row.append(element('span', node.name, 'profiler-name'));
      const meter = element('span', undefined, 'profiler-meter');
      meter.setAttribute('aria-hidden', 'true');
      const fill = element('span');
      fill.style.width = `${total > 0 ? Math.min(100, node.time / total * 100) : 0}%`;
      meter.append(fill);
      row.append(meter, element('span', `${node.time.toLocaleString('fr-FR', { maximumFractionDigits: 20 })} ms`, 'profiler-time'));
      wrapper.append(row);
      container.append(wrapper);
      if (branch) {
        wrapper.open = depth < 2;
        const children = element('div', undefined, 'profiler-children');
        wrapper.append(children);
        for (let i = node.children.length - 1; i >= 0; i--) pending.push({ node: node.children[i], container: children, total, depth: depth + 1 });
      }
    }
  }
  if (profile.unparsed.length) {
    view.append(rawSection(`${profile.unparsed.length} ligne(s) non reconnue(s)`, profile.unparsed.map(item => `Ligne ${item.line} : ${item.text}`).join('\n')));
  }
  const raw = rawSection('Texte décompressé', text || '(contenu vide)');
  raw.open = !profile.count;
  view.append(raw);
  return view;
}
