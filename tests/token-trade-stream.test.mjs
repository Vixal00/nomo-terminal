import test from 'node:test';
import assert from 'node:assert/strict';
import { createTradeStream, advanceTradeStream } from '../components/nomo/token-trade-stream.ts';

const token = { id: 'nearly', price: .0048, volume: 1280000 };
test('the initial trade tape fills the panel with ordered, internally consistent transactions', () => {
  const state = createTradeStream(token, 1000000);
  assert.equal(state.rows.length, 48);
  assert.equal(new Set(state.rows.map(row => row.id)).size, state.rows.length);
  assert.ok(state.rows.some(row => row.side === 'buy') && state.rows.some(row => row.side === 'sell'));
  for (let i = 0; i < state.rows.length; i++) {
    const row = state.rows[i];
    assert.ok(row.amount > 0 && row.price > 0 && Number.isFinite(row.quantity));
    assert.ok(Math.abs(row.quantity * row.price - row.amount) < 1e-8);
    if (i) assert.ok(row.at < state.rows[i - 1].at);
  }
});
test('new market prices never rewrite the price or amount of an earlier trade', () => {
  const original = createTradeStream(token, 1000000);
  const previous = structuredClone(original);
  const next = advanceTradeStream(original, { ...token, price: .0096 }, 1005000);
  assert.deepEqual(original, previous);
  assert.deepEqual(next.rows.find(row => row.id === original.rows[0].id), original.rows[0]);
  assert.ok(next.rows[0].price > .009);
  assert.ok(next.rows[0].at > original.rows[0].at);
});
test('long sessions keep a bounded tape with unique trade identities', () => {
  let state = createTradeStream(token, 1000000);
  for (let index = 1; index <= 150; index++) state = advanceTradeStream(state, token, 1000000 + index * 1500);
  assert.equal(state.rows.length, 100);
  assert.equal(new Set(state.rows.map(row => row.id)).size, 100);
  assert.ok(state.rows.every((row, index) => !index || row.at <= state.rows[index - 1].at));
});
