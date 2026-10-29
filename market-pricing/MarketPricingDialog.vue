<template>
  <el-alert
    v-if="flow.state.refreshError"
    :title="flow.state.refreshError"
    type="warning"
    :closable="false"
    class="my-3"
  />
  <el-dialog
    :model-value="s.visible"
    :title="restoring ? '恢复价格' : '溢价设置'"
    width="860px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!locked"
    :show-close="!locked"
    @close="flow.close"
  >
    <div v-loading="s.loading" class="market-price-rules">
      <el-alert
        :title="
          restoring
            ? restoreDescription
            : '加点或百分比按每个规格的计费单位计算，价格变化仅影响新提交任务。'
        "
        :type="restoring ? 'warning' : 'info'"
        :closable="false"
        show-icon
      />
      <div class="market-price-rules__scope">
        操作范围：{{ s.target.label }}
      </div>
      <el-form
        v-if="s.ready"
        label-width="110px"
        :disabled="locked"
        @submit.prevent="flow.preview"
      >
        <template v-if="!restoring">
          <el-form-item label="溢价方式">
            <el-radio-group v-model="s.form.mode" @change="flow.invalidate"
              ><el-radio label="percent">百分比上浮</el-radio
              ><el-radio label="add">固定加点</el-radio></el-radio-group
            >
          </el-form-item>
          <el-form-item
            :label="s.form.mode === 'percent' ? '上浮比例' : '增加算力点'"
          >
            <el-input
              v-model.number="s.form.value"
              inputmode="decimal"
              class="!w-[180px]"
              placeholder="请输入非负数"
              @input="flow.invalidate"
            />
            <span class="ml-2">{{
              s.form.mode === "percent" ? "%" : "点 / 原计费单位"
            }}</span>
          </el-form-item>
          <el-form-item v-if="s.target.scope !== 'sku'" label="独立配置">
            <el-checkbox
              v-model="s.form.replace_descendants"
              @change="flow.invalidate"
              >覆盖范围内的下级规则和手动售价</el-checkbox
            >
            <div class="market-price-rules__hint">
              未勾选时保留独立配置，规格优先于商品，商品优先于全局。
            </div>
          </el-form-item>
        </template>
        <el-form-item
          v-if="owner === 'tenant' && s.target.scope === 'global'"
          label="应用售价"
        >
          <el-checkbox v-model="s.form.follow_apps" @change="flow.invalidate"
            >已接入算力市场的应用统一跟随市场价</el-checkbox
          >
          <div class="market-price-rules__hint">
            勾选后覆盖应用独立售价的生效方式，原设置保留；包含已设置的免费售价。
          </div>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="s.error"
        :title="s.error"
        type="error"
        :closable="false"
        show-icon
        role="alert"
        class="mb-4"
      />
      <div v-if="s.preview" aria-live="polite">
        <el-alert v-if="s.preview.application_overrides?.length" type="warning" :closable="false" title="以下应用已有独立售价，启用统一计价后将按市场价结算，原配置保留。" class="mb-3">
          <div v-for="app in s.preview.application_overrides" :key="app.app_code">{{ app.name }}：{{ app.count }} 项独立价格，其中 {{ app.free_count }} 项免费。</div>
        </el-alert>
        <div v-if="s.preview.replaced_overrides" class="market-price-rules__hint">将替换或清除 {{ s.preview.replaced_overrides }} 条独立配置，包含所选商品的隐藏规格。</div>
        <div class="market-price-rules__summary">
          涉及 {{ s.preview.total }} 个规格，{{
            s.preview.changed
          }}
          个价格变化<span v-if="s.preview.invalid"
            >，{{ s.preview.invalid }} 个低于进货价，请调整后再保存</span
          >。{{ s.preview.total > 200 ? "下表展示前 200 个规格。" : "" }}
        </div>
        <el-table :data="s.preview.rows" border max-height="320">
          <el-table-column label="商品 / 规格" min-width="170"
            ><template #default="{ row }"
              >{{ row.name }}
              <div class="market-price-rules__hint">
                {{ row.title }}
              </div></template
            ></el-table-column
          >
          <el-table-column label="计费单位" min-width="130"
            ><template #default="{ row }">{{
              unit(row)
            }}</template></el-table-column
          >
          <el-table-column prop="base_price" label="进货单价" min-width="120" />
          <el-table-column prop="before" label="调整前" min-width="120" />
          <el-table-column label="调整后" min-width="120"
            ><template #default="{ row }"
              ><strong :class="{ 'text-danger': !row.valid }">{{
                row.after
              }}</strong></template
            ></el-table-column
          >
        </el-table>
        <div class="market-price-rules__hint mt-3">
          预览有效期 5
          分钟；期间价格或规则变化后需重新预览。进行中的任务及历史账单保持原价格。
        </div>
      </div>
    </div>
    <template #footer>
      <el-button :disabled="locked" @click="flow.close">取消</el-button>
      <el-button
        :loading="s.busy && !s.preview"
        :disabled="locked || !s.ready"
        @click="flow.preview"
        >预览价格</el-button
      >
      <el-button
        :type="restoring ? 'warning' : 'primary'"
        :disabled="s.loading || !s.preview || s.preview.invalid > 0"
        :loading="s.busy && !!s.preview"
        @click="flow.apply"
        >{{ restoring ? "确认恢复价格" : "确认保存价格" }}</el-button
      >
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";

import {
  createPricingWorkflow,
  formatBillingUnit,
  type PriceTarget,
  type PricingApi,
} from "./workflow";
const props = defineProps<{
  owner: "platform" | "tenant";
  api: PricingApi;
  identity: () => string;
  refresh: () => Promise<void>;
}>();
const flow = createPricingWorkflow(props.api, props.refresh, props.identity);
const s = flow.state;
const restoring = computed(() => s.target.action === "restore");
const locked = computed(() => s.busy || s.loading);
const restoreDescription = computed(() =>
  props.owner === "platform"
    ? "将所选范围恢复为当前上游同步价，清除范围内的独立规则和手动售价，平台溢价归零。"
    : "将所选范围恢复为平台当前进货价，清除范围内的独立规则和手动售价，租户溢价归零；平台溢价保留。",
);
const unit = formatBillingUnit;
onBeforeUnmount(flow.dispose);
defineExpose({ open: (target: PriceTarget) => flow.open(target) });
</script>
<style scoped>
.market-price-rules__scope {
  margin: 18px 0;
  font-weight: 600;
}
.market-price-rules__hint {
  width: 100%;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.7;
}
.market-price-rules__summary {
  margin: 16px 0 12px;
  font-weight: 600;
}
</style>
