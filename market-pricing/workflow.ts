import { reactive } from "vue";

export type PriceTarget = {
  scope: "global" | "product" | "sku";
  ids?: number[];
  action?: "markup" | "restore";
  label: string;
};
export type PricingApi = {
  settings: () => Promise<any>;
  preview: (params: any) => Promise<any>;
  apply: (params: any) => Promise<any>;
};

export function createPricingWorkflow(
  api: PricingApi,
  saved: () => Promise<void>,
  identity: () => string,
) {
  const state = reactive({
    visible: false,
    ready: false,
    loading: false,
    busy: false,
    error: "",
    refreshError: "",
    target: {
      scope: "global",
      label: "全部商品",
      action: "markup",
    } as PriceTarget,
    form: {
      mode: "percent",
      value: 0,
      replace_descendants: false,
      follow_apps: false,
    },
    preview: null as any,
  });
  let generation = 0;
  let owner = "";
  const current = (id: number) => generation === id && owner === identity();
  const invalidate = () => {
    state.preview = null;
    state.error = "";
  };
  async function open(target: PriceTarget) {
    if (state.busy || state.loading) return;
    const id = ++generation;
    owner = identity();
    state.target = { ...target, action: target.action || "markup" };
    state.form = {
      mode: "percent",
      value: 0,
      replace_descendants: false,
      follow_apps: false,
    };
    state.preview = null;
    state.ready = false;
    state.error = "";
    state.refreshError = "";
    state.visible = true;
    state.loading = true;
    try {
      const settings = await api.settings();
      if (!current(id)) return;
      const exact = settings.rules.find(
        (r: any) =>
          r.scope_type === target.scope &&
          Number(r.scope_id) === (target.ids?.[0] || 0),
      );
      if (exact && ["percent", "add"].includes(exact.mode)) {
        state.form.mode = exact.mode;
        state.form.value = Number(exact.value);
      }
      state.form.follow_apps = Boolean(settings.follow_apps);
      state.ready = true;
    } catch (error: any) {
      if (current(id))
        state.error = error?.message || "读取定价设置失败，请关闭后重试";
    } finally {
      if (generation === id) state.loading = false;
    }
  }
  async function preview() {
    if (state.busy || state.loading) return;
    if (!state.ready) {
      state.error = "读取定价设置失败，请关闭后重新打开";
      return;
    }
    if (!Number.isFinite(state.form.value) || state.form.value < 0) {
      state.error = "请输入非负的加点数量或百分比";
      return;
    }
    const id = generation;
    if (!current(id)) {
      state.error = "登录或租户已变化，请重新打开";
      return;
    }
    state.busy = true;
    state.error = "";
    state.preview = null;
    try {
      const result = await api.preview({ ...state.form, ...state.target });
      if (current(id)) state.preview = result;
    } catch (error: any) {
      if (current(id)) state.error = error?.message || "预览失败，请重试";
    } finally {
      if (generation === id) state.busy = false;
    }
  }
  async function apply() {
    if (
      state.busy ||
      state.loading ||
      !state.preview?.token ||
      state.preview.invalid
    )
      return;
    const id = generation;
    if (!current(id)) {
      state.error = "登录或租户已变化，请重新打开";
      return;
    }
    state.busy = true;
    state.error = "";
    try {
      await api.apply({ token: state.preview.token });
      if (!current(id)) return;
      state.preview = null;
      state.visible = false;
      try {
        await saved();
      } catch {
        state.refreshError = "价格已保存，列表刷新失败，请刷新页面查看";
      }
    } catch (error: any) {
      if (current(id)) {
        state.preview = null;
        state.error = error?.message || "保存失败，请重新预览后重试";
      }
    } finally {
      if (generation === id) state.busy = false;
    }
  }
  function close() {
    if (state.busy || state.loading) return;
    generation++;
    state.visible = false;
    state.preview = null;
  }
  function dispose() {
    generation++;
    state.visible = false;
  }
  return { state, open, preview, apply, close, invalidate, dispose };
}

export function formatBillingUnit(row: { usage_unit: string; usage_unit_size?: number | string }): string {
    const names: Record<string, string> = { per_call: '次', count: '次', image: '张', per_image: '张', input_second: '输入秒', output_second: '输出秒', second: '秒', sec: '秒', token: 'Token', input_token: '输入 Token', output_token: '输出 Token', cached_input_token: '缓存输入 Token', character: '字符' }
    const size = Number(row.usage_unit_size || 1)
    const count = size >= 10000 && size % 10000 === 0 ? `${size / 10000} 万` : String(size)
    return `每 ${count} ${names[row.usage_unit] || row.usage_unit}`
}
