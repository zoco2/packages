export const statusLabels = {
  pending: "待发送",
  sent: "已发送",
  partial: "部分渠道成功",
  unknown: "结果待确认",
  failed: "发送失败",
  cancelled: "已取消",
  success: "成功",
  skipped: "已跳过",
  sending: "发送中",
};
export function toForm(snapshot) {
  const r = snapshot.rules;
  return {
    ...r,
    tiers: r.thresholds.map((points) => ({
      points,
      channels: [...(r.level_channels[points] || r.channels)],
    })),
  };
}
export function toRules(form) {
  if (!form.tiers?.length || form.tiers.length > 10)
    throw new Error("请设置1至10个提醒档位");
  const thresholds = [],
    level_channels = {};
  for (const tier of form.tiers) {
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(String(tier.points)))
      throw new Error("提醒档位必须是非负数字，最多两位小数");
    const points = Number(tier.points).toFixed(2);
    if (thresholds.includes(points)) throw new Error("提醒档位不能重复");
    thresholds.push(points);
    level_channels[points] = [...new Set(["in_app", ...tier.channels])];
  }
  const { tiers, ...rules } = form;
  return { ...rules, thresholds, level_channels };
}
