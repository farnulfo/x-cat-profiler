import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProfilers } from './profiler-analysis.js';

const entry = (id, ...texts) => ({ id, url: 'https://example.com/same', decodedProfiler: texts.map(text => ({ text, error: null })) });

test('classe tous les niveaux et toutes les requêtes par durée décroissante', () => {
  const first = entry(0, '==Parent == 12ms\n======Enfant == 11.5ms\n========Feuille == 1ms');
  const second = entry(1, '==Autre == 20ms');
  const result = analyzeProfilers([first, second]);
  assert.equal(result.steps, 4);
  assert.equal(result.requests, 2);
  assert.deepEqual(result.top.map(item => item.time), [20, 12, 11.5, 1]);
  assert.equal(result.top[0].entry, second);
  assert.deepEqual(result.top[2].path, ['Parent', 'Enfant']);
  assert.equal(result.top[2].line, 2);
});

test('limite le résultat à dix sans agréger les noms répétés', () => {
  const result = analyzeProfilers([entry(0, Array.from({ length: 25 }, (_, i) => `==Même nom == ${i}ms`).join('\n'))]);
  assert.equal(result.steps, 25);
  assert.equal(result.top.length, 10);
  assert.deepEqual(result.top.map(item => item.time), [24, 23, 22, 21, 20, 19, 18, 17, 16, 15]);
});

test('identifie précisément les occurrences et headers malgré les URL identiques', () => {
  const result = analyzeProfilers([entry(3, '==Doublon == 5ms\n==Doublon == 5ms', '==Doublon == 5ms'), entry(7, '==Doublon == 5ms')]);
  assert.deepEqual(result.top.map(item => [item.entry.id, item.headerIndex, item.line]), [[3, 0, 1], [3, 0, 2], [3, 1, 1], [7, 0, 1]]);
});

test('signale les données non exploitables, conserve les durées nulles', () => {
  const request = entry(0, 'invalide\n==Valide == 0ms', '');
  request.decodedProfiler.push({ text: null, error: 'gzip invalide' });
  const result = analyzeProfilers([request]);
  assert.equal(result.invalidHeaders, 1);
  assert.equal(result.unparsedLines, 1);
  assert.equal(result.top[0].time, 0);
  assert.equal(result.top[0].line, 2);
  assert.equal(analyzeProfilers([]).top.length, 0);
});
