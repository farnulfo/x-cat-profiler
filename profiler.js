export function parseProfiler(text) {
  const roots = [];
  const stack = [];
  const unparsed = [];
  let count = 0;
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    // Greedy name captures the last duration separator, including names with ==.
    const match = /^(={2,})\s*(.+)\s+==\s*(\d+(?:[.,]\d+)?)\s*ms\s*$/.exec(line);
    if (!match || match[1].length % 2 || !match[2].trim() || !Number.isFinite(Number(match[3].replace(',', '.')))) {
      unparsed.push({ line: index + 1, text: line });
      return;
    }
    const node = { name: match[2].trim(), level: match[1].length / 2, time: Number(match[3].replace(',', '.')), children: [] };
    while (stack.length && stack.at(-1).level >= node.level) stack.pop();
    (stack.length ? stack.at(-1).children : roots).push(node);
    stack.push(node);
    count++;
  });
  return { roots, count, unparsed };
}

// Each header keeps its own result so one invalid value cannot hide the others.
export async function decodeProfiler(value) {
  let bytes;
  try {
    if (!value.trim()) throw new Error();
    bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0));
  } catch {
    return { text: null, error: 'Valeur Base64 invalide ou vide.' };
  }
  if (typeof DecompressionStream === 'undefined') {
    return { text: null, error: 'La décompression gzip nécessite un navigateur plus récent.' };
  }
  let buffer;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    buffer = await new Response(stream).arrayBuffer();
  } catch {
    return { text: null, error: 'Données gzip invalides ou incomplètes.' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer), error: null };
  } catch {
    return { text: null, error: 'Le contenu décompressé n’est pas un texte UTF-8 valide.' };
  }
}
