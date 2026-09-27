import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHar } from './har.js';

const har = entries => JSON.stringify({ log: { entries } });
test('détecte uniquement le header exact de réponse, sans tenir compte de la casse', () => {
  const result = parseHar(har([
    { request: { headers: [{ name: 'x-cat-profiler', value: 'request-only' }] }, response: { headers: [] } },
    { request: { method: 'GET', url: 'https://example.com' }, response: { status: 200, headers: [{ name: 'X-Cat-Profiler', value: 'ok' }] }, time: 10 },
    { response: { headers: [{ name: 'x-cat-profiler-extra', value: 'no' }] } },
  ]));
  assert.equal(result.total, 3);
  assert.equal(result.matches.length, 1);
  assert.deepEqual(result.matches[0].profiler, ['ok']);
});
test('conserve les valeurs vides et les headers dupliqués', () => {
  const result = parseHar(har([{ response: { headers: [{ name: 'x-cat-profiler', value: '' }, { name: 'X-CAT-PROFILER', value: 'second' }] }, time: -1 }]));
  assert.deepEqual(result.matches[0].profiler, ['', 'second']);
  assert.equal(result.matches[0].time, null);
});
test('accepte un HAR vide et ignore les entrées sans réponse exploitable', () => {
  assert.deepEqual(parseHar(har([])), { total: 0, matches: [] });
  assert.equal(parseHar(har([null, {}, { response: { headers: [null] } }])).matches.length, 0);
});
test('rejette le JSON et les structures HAR invalides', () => {
  assert.throws(() => parseHar('{'), /JSON valide/);
  for (const value of ['null', '{}', '{"log":{"entries":{}}}']) assert.throws(() => parseHar(value), /Format HAR invalide/);
});
