import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRequests } from './request-sort.js';

const rows = [
  { id: 0, method: 'POST', url: 'https://example.com/10', status: 404, time: 100, decodedProfiler: [{ text: 'zèbre', error: null }] },
  { id: 1, method: 'GET', url: 'https://example.com/2', status: 200, time: 9, decodedProfiler: [{ text: 'Alpha', error: null }] },
  { id: 2, method: 'GET', url: 'https://example.com/1', status: 201, time: null, decodedProfiler: [{ text: 'Été', error: null }] },
];
const ids = (key, direction) => sortRequests(rows, key, direction).map(row => row.id);
test('trie les durées et statuts comme des nombres, valeurs absentes en dernier', () => {
  assert.deepEqual(ids('time', 'asc'), [1, 0, 2]);
  assert.deepEqual(ids('time', 'desc'), [0, 1, 2]);
  assert.deepEqual(ids('status', 'asc'), [1, 2, 0]);
  assert.deepEqual(ids('status', 'desc'), [0, 2, 1]);
});
test('trie méthode, URL complète et contenu décodé dans les deux sens', () => {
  assert.deepEqual(ids('method', 'asc'), [1, 2, 0]);
  assert.deepEqual(ids('method', 'desc'), [0, 1, 2]);
  assert.deepEqual(ids('url', 'asc'), [2, 1, 0]);
  assert.deepEqual(ids('url', 'desc'), [0, 1, 2]);
  assert.deepEqual(ids('profiler', 'asc'), [1, 2, 0]);
  assert.deepEqual(ids('profiler', 'desc'), [0, 2, 1]);
});
test('préserve le tableau source et l’ordre HAR en cas d’égalité', () => {
  assert.deepEqual(sortRequests(rows, null), rows);
  sortRequests(rows, 'time');
  assert.deepEqual(rows.map(row => row.id), [0, 1, 2]);
  assert.deepEqual(sortRequests([rows[2], rows[1]], 'method', 'desc').map(row => row.id), [1, 2]);
});
