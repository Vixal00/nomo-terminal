import { type Token } from "./data";

/** Deterministic presentation fixtures. These records are not chain activity. */
export type ActivityTrade = {
  id: string;
  ageSeconds: number;
  side: "buy" | "sell";
  amount: number;
  quantity: number;
  price: number;
  wallet: string;
};

export type ActivityHolder = {
  wallet: string;
  share: number;
  quantity: number;
  value: number;
};

export type ActivityTrader = {
  wallet: string;
  bought: number;
  sold: number;
  pnl: number;
  balance: number;
};

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function walletFor(tokenId: string, index: number) {
  let seed = [...`${tokenId}:${index}`].reduce((value, char) => Math.imul(value, 31) + char.charCodeAt(0) | 0, 17);
  return Array.from({ length: 44 }, () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return alphabet[(seed >>> 0) % alphabet.length];
  }).join("");
}

export function createTokenActivity(token: Token) {
  const unitPrice = Math.max(token.price, Number.EPSILON);
  const ages = [2, 5, 8, 11, 17, 23, 31, 42, 55, 68, 81, 96];
  const tradeSizes = [420, 168, 1250, 89, 670, 245, 1820, 320, 72, 940, 155, 510];
  const scale = Math.max(.18, Math.min(2.2, token.volume / 360000));
  const trades: ActivityTrade[] = ages.map((ageSeconds, index) => {
    const price = unitPrice * (1 + Math.sin(index * 1.7 + token.symbol.length) * .008);
    const amount = Math.round(tradeSizes[index] * scale * 100) / 100;
    return {
      id: `${token.id}-trade-${index}`,
      ageSeconds,
      side: index % 4 === 1 || index % 5 === 3 ? "sell" : "buy",
      amount,
      price,
      quantity: amount / price,
      wallet: walletFor(token.id, index),
    };
  });

  // Allocate integer basis points so the displayed ten shares total top10Pct exactly.
  const weights = [20, 16, 13, 11, 9, 8, 7, 6, 5, 5];
  const totalBasisPoints = Math.round(token.top10Pct * 100);
  const shares = weights.map(weight => Math.floor(totalBasisPoints * weight / 100));
  let remainder = totalBasisPoints - shares.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % shares.length, remainder -= 1) shares[index] += 1;
  const holders: ActivityHolder[] = shares.map((basisPoints, index) => {
    const share = basisPoints / 100;
    const quantity = token.totalSupply * share / 100;
    return { wallet: walletFor(token.id, index + 24), share, quantity, value: quantity * unitPrice };
  });

  const traders: ActivityTrader[] = Array.from({ length: 10 }, (_, index) => {
    const quantity = (3600 - index * 270) * scale / unitPrice;
    const entryPrice = unitPrice * (.62 + index * .027);
    const exitPrice = unitPrice * (1.01 - index * .006);
    const soldQuantity = quantity * (.64 - index * .032);
    const bought = quantity * entryPrice;
    const sold = soldQuantity * exitPrice;
    const balance = (quantity - soldQuantity) * unitPrice;
    return { wallet: walletFor(token.id, index + 48), bought, sold, pnl: sold + balance - bought, balance };
  }).sort((a, b) => b.pnl - a.pnl);

  return { trades, holders, traders };
}
