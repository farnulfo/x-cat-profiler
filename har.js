export function parseHar(text) {
  let har;
  try { har = JSON.parse(text); }
  catch { throw new Error('Ce fichier ne contient pas de JSON valide.'); }
  if (!Array.isArray(har?.log?.entries)) {
    throw new Error('Format HAR invalide : la liste log.entries est absente.');
  }
  const entries = har.log.entries;
  const matches = [];
  entries.forEach((entry, index) => {
    const headers = entry?.response?.headers;
    if (!Array.isArray(headers)) return;
    const profilerHeaders = headers.filter(header =>
      typeof header?.name === 'string' && header.name.toLowerCase() === 'x-cat-profiler');
    if (!profilerHeaders.length) return;
    matches.push({
      id: index,
      method: typeof entry.request?.method === 'string' ? entry.request.method : '—',
      url: typeof entry.request?.url === 'string' ? entry.request.url : '',
      status: entry.response.status,
      time: typeof entry.time === 'number' && entry.time >= 0 ? entry.time : null,
      headers,
      profiler: profilerHeaders.map(header => String(header.value ?? '')),
      started: entry.startedDateTime,
    });
  });
  return { total: entries.length, matches };
}
