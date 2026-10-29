/** Pure payment lifecycle. Importing this package never imports a Vue runtime. */
export type PaymentPollOptions = {
  allowManualAfterExpiry?: boolean;
  retryOnError?: boolean;
  query: () => Promise<any>;
  expiresAt?: () => number;
  onPaid?: (result: any) => void;
  onWaiting?: (manual: boolean, result: any) => void;
  onError?: (error: unknown, manual: boolean) => void;
  onExpired?: () => void;
  onBusy?: (busy: boolean) => void;
};

export function createPaymentPoller(options: PaymentPollOptions) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false,
    disposed = false,
    busy = false,
    completed = false,
    expired = false,
    generation = 0;
  const stop = () => {
    running = false;
    generation++;
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const check = async (manual = true) => {
    if (
      disposed ||
      busy ||
      completed ||
      (expired && !(manual && options.allowManualAfterExpiry)) ||
      (!manual && !running)
    )
      return;
    const deadline = options.expiresAt?.() || 0;
    if (
      deadline > 0 &&
      deadline * 1000 <= Date.now() &&
      !(manual && options.allowManualAfterExpiry)
    ) {
      expired = true;
      stop();
      options.onExpired?.();
      return;
    }
    const token = generation;
    busy = true;
    options.onBusy?.(true);
    try {
      const result = await options.query();
      if (disposed || token !== generation) return;
      if (Number(result?.pay_status) === 1) {
        completed = true;
        stop();
        options.onPaid?.(result);
      } else if (Number(result?.closed_time || 0) > 0) {
        expired = true;
        stop();
        options.onExpired?.();
      } else options.onWaiting?.(manual, result);
    } catch (error) {
      if (!disposed && token === generation) {
        if (!options.retryOnError) stop();
        options.onError?.(error, manual);
      }
    } finally {
      busy = false;
      if (!disposed) options.onBusy?.(false);
    }
  };
  const start = () => {
    stop();
    if (disposed) return;
    completed = false;
    expired = false;
    running = true;
    timer = setInterval(() => {
      void check(false);
    }, 3000);
  };
  const dispose = () => {
    stop();
    disposed = true;
  };
  return { start, stop, check, dispose };
}

export function reserveAlipayWindow(browser: Pick<Window, "open">): Window {
  const win = browser.open("", "_blank");
  if (!win) throw new Error("浏览器阻止了支付窗口，请允许弹窗后重试");
  win.opener = null;
  return win;
}

export function fillAlipayWindow(win: Window, html: string): void {
  if (win.closed) throw new Error("支付窗口已关闭，请重新打开支付宝支付");
  win.document.open();
  win.document.write(html);
  win.document.close();
}
