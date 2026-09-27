import { parseProfiler } from './profiler.js?v=12fcef1aaf3a9acd';

export function analyzeProfilers(entries) {
  const top = [];
  let steps = 0;
  let invalidHeaders = 0;
  let unparsedLines = 0;
  for (const entry of entries) {
    entry.decodedProfiler.forEach((result, headerIndex) => {
      if (result.error) { invalidHeaders++; return; }
      const profile = parseProfiler(result.text);
      unparsedLines += profile.unparsed.length;
      const pending = profile.roots.slice().reverse().map(node => ({ node, parent: null }));
      while (pending.length) {
        const current = pending.pop();
        const { node } = current;
        steps++;
        // Keep only ten candidates; ties retain their original HAR/header/line order.
        if (top.length < 10 || node.time > top.at(-1).time) {
          const path = [];
          for (let item = current; item; item = item.parent) path.unshift(item.node.name);
          top.push({ entry, headerIndex, line: node.line, name: node.name, time: node.time, path });
          top.sort((a, b) => b.time - a.time);
          if (top.length > 10) top.pop();
        }
        for (let i = node.children.length - 1; i >= 0; i--) pending.push({ node: node.children[i], parent: current });
      }
    });
  }
  return { top, steps, requests: entries.length, invalidHeaders, unparsedLines };
}
