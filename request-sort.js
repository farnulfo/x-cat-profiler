const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

export function profilerText(entry) {
  return entry.decodedProfiler.map(result => result.error ? `⚠ ${result.error}` : result.text === '' ? '(contenu vide)' : result.text).join('\n');
}

export function sortRequests(entries, key, direction = 'asc') {
  if (!key) return entries.slice();
  const factor = direction === 'desc' ? -1 : 1;
  const numeric = key === 'status' || key === 'time';
  const value = entry => key === 'profiler' ? profilerText(entry) : entry[key];
  return entries.slice().sort((a, b) => {
    const left = value(a);
    const right = value(b);
    // Missing numeric values stay last in either direction.
    if (numeric) {
      const leftMissing = typeof left !== 'number' || !Number.isFinite(left);
      const rightMissing = typeof right !== 'number' || !Number.isFinite(right);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing) return a.id - b.id;
      return (left - right) * factor || a.id - b.id;
    }
    return collator.compare(String(left ?? ''), String(right ?? '')) * factor || a.id - b.id;
  });
}
