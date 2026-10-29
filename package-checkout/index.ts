/** Pure contracts shared by the independent PC and UniApp Vue runtimes. */
export function offerSeconds(
  quote: any,
  receivedAt: number,
  now = Date.now(),
): number {
  if (!quote?.eligible_end_at) return 0;
  return Math.max(
    0,
    Math.ceil(
      Number(quote.eligible_end_at) -
        Number(quote.server_time) -
        Math.max(0, now - receivedAt) / 1000,
    ),
  );
}
export function offerMessage(quote: any, seconds: number): string {
  if (!quote) return "";
  if (quote.reason === "used") return "本套餐优惠已使用";
  if (quote.pending_order_id || quote.reason === "reserved")
    return "本次按常规价格购买";
  if (!quote.is_discount) return "";
  if (!seconds) return "优惠已到期，请重新确认价格";
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return `限时优惠 · 剩余${hours}小时${minutes}分 · 每人每套餐限享一次`;
}
export async function preparePackagePurchase(options: {
  quote: () => Promise<any>;
  confirm: (quote: any, pending: boolean) => Promise<boolean>;
  create: (hash: string) => Promise<any>;
}): Promise<any | null> {
  const quote = await options.quote();
  if (!(await options.confirm(quote, false))) return null;
  // Never silently retry with a new price after an expired/stale quote.
  return options.create(quote.quote_hash);
}

let purchaseSerial = 0;
/** Per explicit purchase, reused by the request adapter on transport retries. */
export function newPurchaseRequestId(): string {
  const browserCrypto =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (typeof browserCrypto?.randomUUID === "function")
    return browserCrypto.randomUUID();
  return (
    Date.now().toString(36) +
    "_" +
    (++purchaseSerial).toString(36) +
    "_" +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}
