import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWalletAddress, isWalletAddress, trackedWalletKey, isStoredTrackedWallet, parseWalletImport } from '../components/nomo/tracked-wallets.ts';

const solana = 'So11111111111111111111111111111111111111112';
const evm = `0x${'Ab'.repeat(20)}`;
const stored = { address:'friend.near', name:'Friend', avatar:'/art/coins/p77.webp', monitor:true, trades:true, addedAt:0 };

test('normalization preserves case-sensitive Solana addresses', () => {
  assert.equal(normalizeWalletAddress(` ${solana} `, 'Solana'), solana);
  assert.equal(normalizeWalletAddress(evm, 'Base'), evm.toLowerCase());
  assert.equal(normalizeWalletAddress(' Friend.NEAR ', 'NEAR'), 'friend.near');
});

test('addresses are validated for their selected chain', () => {
  assert.equal(isWalletAddress(solana, 'Solana'), true);
  assert.equal(isWalletAddress('1'.repeat(32), 'Solana'), true);
  for (const address of ['1'.repeat(31), '1'.repeat(33), 'z'.repeat(44), 'O'.repeat(32), 'friend.near']) assert.equal(isWalletAddress(address, 'Solana'), false);
  for (const chain of ['Ethereum','Base','Robinhood Chain']) {
    assert.equal(isWalletAddress(evm, chain), true);
    assert.equal(isWalletAddress('0x1234', chain), false);
    assert.equal(isWalletAddress('friend.near', chain), false);
  }
});

test('wallet identity separates EVM networks and understands legacy NEAR wallets', () => {
  assert.notEqual(trackedWalletKey({address:evm,chain:'Base'}), trackedWalletKey({address:evm,chain:'Ethereum'}));
  assert.equal(trackedWalletKey({address:evm,chain:'Base'}), trackedWalletKey({address:evm.toLowerCase(),chain:'Base'}));
  assert.equal(trackedWalletKey(stored), trackedWalletKey({...stored,chain:'NEAR'}));
});

test('stored wallets preserve supported metadata without breaking existing wallets', () => {
  assert.equal(isStoredTrackedWallet(stored), true);
  assert.equal(isStoredTrackedWallet({...stored,address:solana,chain:'Solana',emoji:'🐺'}), true);
  assert.equal(isStoredTrackedWallet({...stored,chain:'Unknown'}), false);
  assert.equal(isStoredTrackedWallet({...stored,emoji:'not an emoji choice'}), false);
});

test('imports retain chain and emoji, deduplicate by network, and skip invalid entries', () => {
  const parsed = parseWalletImport(JSON.stringify([
    {address:solana,chain:'Solana',name:'Whale',emoji:'🐳'},
    {address:evm,chain:'Base'}, {address:evm.toLowerCase(),chain:'Base'},
    {address:evm,chain:'Ethereum'}, {address:'bad',chain:'Solana'},
  ]));
  assert.equal(parsed.length,3);
  assert.equal(parsed[0].address,solana);
  assert.equal(parsed[0].emoji,'🐳');
  assert.equal(parseWalletImport('friend.near Friend\nfriend.near Duplicate\nother.near Other').length,2);
});
