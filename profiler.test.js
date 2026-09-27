import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { decodeProfiler } from './profiler.js';

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
