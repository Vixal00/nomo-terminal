type Market = { id: string; price: number; volume: number };
export type StreamTrade = { id: string; side: "buy" | "sell"; amount: number; quantity: number; price: number; wallet: string; at: number; own?: boolean };
export type TradeStream = { rows: StreamTrade[]; sequence: number };
const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function makeTrade(token: Market, sequence: number, at: number): StreamTrade {
  let seed = [...`${token.id}:${sequence % 29}`].reduce((value, character) => Math.imul(value, 31) + character.charCodeAt(0) | 0, 17);
  const wallet = Array.from({ length: 44 }, () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return alphabet[(seed >>> 0) % alphabet.length]; }).join("");
  const scale = Math.max(.2, Math.min(1.7, token.volume / 700000));
  const amount = Math.round([14, 92, 350, 28, 1800, 65, 120, 8, 530, 220, 48][sequence % 11] * scale * (1 + (sequence % 7) * .073) * 100) / 100;
  const price = Math.max(Number.EPSILON, token.price * (1 + Math.sin(sequence * 1.73) * .002));
  return { id: `${token.id}-stream-${sequence}`, side: sequence % 7 === 1 || sequence % 7 === 3 || sequence % 7 === 6 ? "sell" : "buy", amount, quantity: amount / price, price, wallet, at };
}
/** Local presentation tape. Trades retain their original execution price. */
export function createTradeStream(token: Market, at: number): TradeStream {
  let age = 1200;
  const rows = Array.from({ length: 48 }, (_, index) => {
    age += [1400, 2600, 800, 3900, 1800, 6200][index % 6];
    return makeTrade(token, 47 - index, at - age);
  });
  return { rows, sequence: 48 };
}
export function advanceTradeStream(state: TradeStream, token: Market, at: number): TradeStream {
  const count = state.sequence % 5 === 0 ? 2 : 1;
  const incoming = Array.from({ length: count }, (_, index) => makeTrade(token, state.sequence + count - 1 - index, at - index * 180));
  return { rows: [...incoming, ...state.rows].slice(0, 100), sequence: state.sequence + count };
}
