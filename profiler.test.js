import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { decodeProfiler, parseProfiler } from './profiler.js';

const encode = text => gzipSync(text).toString('base64');

test('décode le gzip Base64 en texte UTF-8, sans interpréter le HTML', async () => {
  for (const text of ['Profil : été 🐈\n42 ms', '{"duration":42}', '<script>alert(1)</script>', '']) {
    assert.deepEqual(await decodeProfiler(encode(text)), { text, error: null });
  }
});

test('accepte les espaces et retours à la ligne dans le Base64', async () => {
  const value = encode('bonjour');
  assert.equal((await decodeProfiler(`  ${value.slice(0, 12)}\n${value.slice(12)} `)).text, 'bonjour');
});

test('signale le Base64 invalide ou vide', async () => {
  for (const value of ['', ' ', '%%%']) {
    const result = await decodeProfiler(value);
    assert.equal(result.text, null);
    assert.match(result.error, /Base64/);
  }
});

test('signale le gzip invalide ou tronqué', async () => {
  for (const value of [Buffer.from('pas du gzip').toString('base64'), gzipSync('bonjour').subarray(0, 15).toString('base64')]) {
    assert.match((await decodeProfiler(value)).error, /gzip/);
  }
});

test('une valeur invalide ne bloque pas les autres headers', async () => {
  const results = await Promise.all(['%%%', encode('valide')].map(decodeProfiler));
  assert.ok(results[0].error);
  assert.equal(results[1].text, 'valide');
});

test('signale les données décompressées qui ne sont pas du texte UTF-8', async () => {
  assert.match((await decodeProfiler(encode(Buffer.from([0xff, 0xfe])))).error, /UTF-8/);
});

test('construit les enfants, frères et racines en conservant les doublons', () => {
  const result = parseProfiler('==Appel == 55ms\n====Contrôleur == 54ms\n======SQL == 48ms\n====Cache == 0ms\n====Cache == 1ms\n==Autre appel == 2ms');
  assert.equal(result.count, 6);
  assert.equal(result.roots.length, 2);
  assert.deepEqual(result.roots[0].children.map(node => node.name), ['Contrôleur', 'Cache', 'Cache']);
  assert.equal(result.roots[0].children[0].children[0].time, 48);
  assert.equal(result.roots[0].time, 55);
  assert.deepEqual(result.unparsed, []);
});

test('rattache un niveau sauté au dernier ancêtre moins profond', () => {
  const result = parseProfiler('==Appel == 5ms\n======Positions == 4ms\n==========SQL == 3ms\n====Cache == 1ms');
  assert.equal(result.roots[0].children[0].level, 3);
  assert.equal(result.roots[0].children[0].children[0].name, 'SQL');
  assert.equal(result.roots[0].children[1].name, 'Cache');
});

test('préserve les noms complexes, les décimales et les temps nuls', () => {
  const result = parseProfiler("==Cache<products> x == y zip=false == 1,25ms\r\n====Étape été 🐈 == 0 ms\r\n====Suivante == 0.25ms\r\n");
  assert.equal(result.roots[0].name, 'Cache<products> x == y zip=false');
  assert.equal(result.roots[0].time, 1.25);
  assert.deepEqual(result.roots[0].children.map(node => node.time), [0, 0.25]);
});

test('signale les lignes invalides sans perdre les étapes valides', () => {
  const result = parseProfiler('texte quelconque\n\n==Valide == 1ms\n===Niveau impair == 0ms\n====Durée invalide == abc\n====Valide aussi == 0ms');
  assert.equal(result.count, 2);
  assert.deepEqual(result.unparsed.map(item => item.line), [1, 4, 5]);
  assert.equal(result.roots[0].children[0].name, 'Valide aussi');
  assert.deepEqual(parseProfiler(''), { roots: [], count: 0, unparsed: [] });
});

test('ne remplace pas les durées inclusives par la somme des descendants', () => {
  const result = parseProfiler('==Parent == 2ms\n====Enfant == 5ms\n====Enfant == 5ms');
  assert.equal(result.roots[0].time, 2);
});
