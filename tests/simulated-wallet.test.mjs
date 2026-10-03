import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, applyOperation } from '../components/nomo/simulated-wallet.ts';
const token = { id:'test', symbol:'TEST', price:2 };
test('a purchase debits cash and selling restores proceeds with cost basis', () => {
 const initial=createLedger();
 const bought=applyOperation(initial,{type:'Buy',token,amount:100,currency:'USDC'});
 assert.equal(bought.ok,true); assert.equal(bought.state.assets.USDC,1150);
 assert.equal(bought.state.positions.test.amount,50);assert.equal(bought.state.positions.test.cost,100);
 const sold=applyOperation(bought.state,{type:'Sell',token:{...token,price:3},amount:20,currency:'USDC'});
 assert.equal(sold.state.assets.USDC,1210);assert.equal(sold.state.positions.test.amount,30);
 assert.equal(sold.state.positions.test.cost,60);assert.equal(sold.state.history[0].pnl,20);
 assert.equal(initial.assets.USDC,1250);
});
test('invalid trades cannot spend or mint funds',()=>{
 for(const amount of [0,-1,NaN,Infinity,1251]) assert.equal(applyOperation(createLedger(),{type:'Buy',token,amount,currency:'USDC'}).ok,false);
 assert.equal(applyOperation(createLedger(),{type:'Sell',token,amount:1,currency:'USDC'}).ok,false);
 assert.equal(applyOperation(createLedger(),{type:'Buy',token:{...token,price:0},amount:10,currency:'USDC'}).ok,false);
});
test('bridging deducts the source and credits NEAR after the fee',()=>{
 const initial=createLedger();
 const result=applyOperation(initial,{type:'Bridge',asset:'SOL',amount:1,recipient:'demo.near'});
 assert.equal(result.ok,true);assert.equal(result.state.assets.SOL,4);assert.equal(result.state.assets.NEAR,39.6);
 assert.equal(applyOperation(result.state,{type:'Bridge',asset:'SOL',amount:5,recipient:'demo.near'}).ok,false);
 const buy=applyOperation(result.state,{type:'Buy',token:{...token,price:4.7},amount:10,currency:'NEAR',fee:.01});
 assert.ok(Math.abs(buy.state.assets.NEAR-29.6)<1e-8);assert.equal(buy.state.positions.test.amount,9.9);
});
test('transfers deduct once and reject invalid recipients or overspending',()=>{
 const initial=createLedger();
 const result=applyOperation(initial,{type:'Send',asset:'USDC',amount:1250,recipient:'friend.near'});
 assert.equal(result.ok,true);assert.equal(result.state.assets.USDC,0);
 assert.equal(applyOperation(result.state,{type:'Send',asset:'USDC',amount:1,recipient:'friend.near'}).ok,false);
 assert.equal(applyOperation(initial,{type:'Send',asset:'USDC',amount:1,recipient:'oops'}).ok,false);
});
test('funding and conversion preserve value while making NEAR spendable',()=>{
 const funded=applyOperation(createLedger(),{type:'Deposit',asset:'USDC',amount:1000});
 assert.equal(funded.state.assets.USDC,2250);
 const converted=applyOperation(funded.state,{type:'Convert',asset:'USDC',amount:47});
 assert.equal(converted.state.assets.USDC,2203);assert.equal(converted.state.assets.NEAR,10);
 assert.equal(applyOperation(converted.state,{type:'Convert',asset:'USDC',amount:2204}).ok,false);
 assert.equal(applyOperation(converted.state,{type:'Convert',asset:'SOL',amount:1}).ok,false);
});
