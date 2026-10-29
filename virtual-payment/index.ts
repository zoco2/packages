/** Native SDK boundary only. No Vue, network, credentials, or financial mutations. */
function atLeast(value: string, minimum: string): boolean {
  const a = String(value || "")
      .split(".")
      .map(Number),
    b = minimum.split(".").map(Number);
  for (let i = 0; i < b.length; i++) {
    if (!Number.isFinite(a[i] ?? 0)) return false;
    if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i];
  }
  return true;
}
export function virtualPlatform(sdk: any): "ios" | "android" {
  const info = sdk.getSystemInfoSync();
  if (
    !sdk.canIUse("requestVirtualPayment") ||
    typeof sdk.requestVirtualPayment !== "function" ||
    !atLeast(info.SDKVersion, "2.19.2")
  )
    throw new Error("请升级微信后使用虚拟支付");
  if (info.platform === "ios") {
    if (
      !atLeast(info.version, "8.0.68") ||
      !atLeast(String(info.system).replace(/^iOS\s*/i, ""), "15.0")
    )
      throw new Error("请升级微信至8.0.68及以上、iOS至15及以上后支付");
    return "ios";
  }
  if (info.platform !== "android")
    throw new Error("请在支持虚拟支付的微信小程序手机端购买");
  return "android";
}
export async function invokeVirtualPayment(
  sdk: any,
  payload: any,
): Promise<"pending" | "cancelled"> {
  const platform = virtualPlatform(sdk);
  if (
    typeof payload.signData !== "string" ||
    !payload.paySig ||
    !payload.signature ||
    payload.mode !== "short_series_goods"
  )
    throw new Error("支付参数不完整，请重新拉起支付");
  const signed = JSON.parse(payload.signData);
  if (platform === "ios" && signed.env !== 0)
    throw new Error("苹果设备仅支持现网虚拟支付");
  if (platform === "ios" && Number(signed.goodsPrice) < 100)
    throw new Error("苹果虚拟支付金额不能低于1元");
  return new Promise((resolve, reject) =>
    sdk.requestVirtualPayment({
      mode: payload.mode,
      signData: payload.signData,
      paySig: payload.paySig,
      signature: payload.signature,
      success: () => resolve("pending"),
      fail: (error: any) =>
        /cancel/i.test(error?.errMsg || "")
          ? resolve("cancelled")
          : reject(
              new Error(
                "微信未完成支付，请检查账号支付资格后重试；已扣款请查询订单",
              ),
            ),
    }),
  );
}
