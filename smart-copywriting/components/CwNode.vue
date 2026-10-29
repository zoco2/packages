<template>
  <div
    class="cw-node"
    :data-cw-node="node.name"
    :class="node.content?.class_names"
    :style="node.name === 'cw-tools' ? {} : styles.root"
    :data-selected="ctx.mode === 'edit' && ctx.selectedNode === node.id"
    :draggable="ctx.mode === 'edit'"
    @dragstart.stop="drag"
    @dragover.prevent
    @drop.stop.prevent="drop"
    @click.stop="selectNode"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <template v-if="node.name === 'cw-container'">
      <CwNode
        v-for="child in node.children || []"
        :key="child.id"
        :node="child"
      />
    </template>
    <div v-else-if="node.name === 'cw-text'">{{ node.content?.text }}</div>
    <img
      v-else-if="node.name === 'cw-image'"
      :src="node.content?.src"
      :alt="node.content?.alt || ''"
      style="max-width: 100%"
    />
    <div
      v-else-if="node.name === 'cw-field' && field && visible"
      class="cw-field"
      @focusin="focus = true"
      @focusout="focus = false"
    >
      <label class="cw-label" :for="node.id" :style="styles.label">
        {{ field.label }}
        <span v-if="field.required" aria-label="必填">*</span>
      </label>
      <textarea
        v-if="field.type === 'textarea'"
        :id="node.id"
        class="cw-control cw-textarea resize-none"
        :style="styles.control"
        :value="value"
        :placeholder="field.placeholder || '请输入' + field.label"
        :rows="field.rows || 6"
        @input="update(($event.target as HTMLTextAreaElement).value)"
      />
      <input
        v-else-if="['text', 'number', 'date'].includes(field.type)"
        :id="node.id"
        class="cw-control"
        :style="styles.control"
        :type="field.type === 'text' ? 'text' : field.type"
        :min="field.min"
        :max="field.max"
        :step="field.step || 1"
        :value="value"
        :placeholder="field.placeholder || '请输入' + field.label"
        @input="
          update(
            field.type === 'number'
              ? Number(($event.target as HTMLInputElement).value)
              : ($event.target as HTMLInputElement).value,
          )
        "
      />
      <div
        v-else-if="field.type === 'select'"
        class="cw-control cw-select"
        :style="styles.control"
        @pointerdown.capture="selectNode"
      >
        <ElSelect
          :id="node.id"
          :model-value="value"
          :aria-label="field.label"
          :clearable="!field.required"
          placeholder="请选择"
          no-data-text="暂无选项"
          popper-class="cw-select-popper"
          @update:model-value="update($event ?? '')"
        >
          <ElOption
            v-for="option in field.options || []"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </ElSelect>
      </div>
      <input
        v-else-if="field.type === 'switch'"
        :id="node.id"
        type="checkbox"
        :checked="!!value"
        :style="styles.control"
        @change="update(($event.target as HTMLInputElement).checked)"
      />
      <div v-else class="cw-options" :style="styles.control">
        <button
          v-for="option in field.options || []"
          :key="option.value"
          type="button"
          class="cw-option"
          :aria-pressed="chosen(option.value)"
          :style="optionStyle(option.value)"
          @click.stop="toggle(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="cw-help" :style="styles.help">
        <span>
          {{
            field.help ||
            (field.min_length
              ? "至少输入" + field.min_length + "个非空白字符"
              : "")
          }}
        </span>
        <span
          v-if="['textarea', 'text'].includes(field.type)"
          :style="styles.counter"
        >
          {{ String(value ?? "").replace(/\s/g, "").length }}
          <template v-if="field.max_length">/ {{ field.max_length }}</template>
        </span>
      </div>
    </div>
    <div v-else-if="node.name === 'cw-model'" class="cw-field">
      <label class="cw-label" :for="node.id" :style="styles.label">
        {{ node.content?.label || "选择模型" }}
      </label>
      <div
        class="cw-control cw-select"
        :style="styles.control"
        @pointerdown.capture="selectNode"
      >
        <ElSelect
          :id="node.id"
          :model-value="ctx.selectedModel"
          :aria-label="node.content?.label || '选择模型'"
          :disabled="!ctx.models.length"
          filterable
          placeholder="请选择模型"
          no-data-text="暂无可用文本模型"
          no-match-text="没有匹配的模型"
          popper-class="cw-select-popper"
          @update:model-value="ctx.event('select-model', String($event ?? ''))"
        >
          <ElOption v-for="m in ctx.models" :key="m.id" :value="String(m.id)" :label="m.name">
            <span class="cw-model-option"><span>{{ m.name }}</span><ModelSourceBadge :model="m" /></span>
          </ElOption>
        </ElSelect>
      </div>
      <div v-if="!ctx.models.length" class="cw-help">暂无可用文本模型</div>
    </div>
    <div v-else-if="node.name === 'cw-cost'" class="cw-help">
      {{ modelPrice }}
    </div>
    <div v-else-if="node.name === 'cw-submit'" class="cw-submit-block">
      <button
        type="button"
        class="cw-button"
        :style="styles.control"
        :disabled="busy || !ctx.selectedModel || ctx.mode !== 'runtime'"
        @click.stop="ctx.event('submit')"
      >
        {{ busy ? "正在生成…" : node.content?.text || "开始生成" }}
      </button>
      <p v-if="ctx.error" class="cw-error cw-submit-error" role="alert">
        {{ ctx.error }}
      </p>
    </div>
    <div v-else-if="node.name === 'cw-result'" class="cw-result">
      <div class="cw-result-head" :style="styles.label">
        <strong>生成结果</strong>
        <span class="cw-status" role="status">{{ statusText }}</span>
        <div class="cw-result-tools">
          <button
            type="button"
            class="cw-icon-button"
            :style="styles.copy"
            :disabled="!ctx.task?.result_text"
            :aria-label="busy ? '复制已生成内容' : '复制全文'"
            title="复制全文"
            @click.stop="ctx.event('copy', 'all')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="12" height="13" rx="2" />
              <path
                d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"
              />
            </svg>
          </button>
          <button
            type="button"
            class="cw-icon-button"
            :style="styles.regenerate"
            :disabled="busy || !ctx.task?.id"
            aria-label="重新生成"
            title="重新生成"
            @click.stop="ctx.event('regenerate')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"
              />
            </svg>
          </button>
          <button
            v-if="busy"
            type="button"
            class="cw-icon-button"
            :disabled="!!ctx.task?.cancel_requested"
            aria-label="停止生成"
            title="停止生成"
            @click.stop="ctx.event('cancel')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      </div>
      <div v-if="!ctx.task?.result_text" class="cw-empty">
        {{ busy ? "正在等待模型输出正文…" : "填写内容并选择模型，开始创作" }}
      </div>
      <pre
        v-else
        ref="textRef"
        class="cw-result-text"
        aria-live="polite"
        aria-atomic="false"
        :style="styles.control"
        @scroll="trackScroll"
        >{{ ctx.task.result_text }}</pre
      >
      <div v-if="!follow && busy" class="cw-actions">
        <button type="button" class="cw-option" @click.stop="toBottom">
          回到底部
        </button>
      </div>
      <div
        v-if="ctx.task?.error"
        class="cw-error"
        role="alert"
        :style="styles.error"
      >
        {{ ctx.task.error }}
      </div>
      <div v-if="ctx.task?.billing_state === 'pending_usage'" class="cw-status">
        费用待核对，重连将查询原任务。
      </div>
      <div v-if="!busy && result.sections.length">
        <div
          v-for="item in result.sections"
          :key="item.id"
          class="cw-candidate"
        >
          <p>{{ item.text }}</p>
          <button
            type="button"
            class="cw-option"
            @click.stop="ctx.event('copy', item.id)"
          >
            复制这一条
          </button>
        </div>
      </div>
      <CopywritingTaskTrace :task="ctx.task" @copy="ctx.event('copy-id', $event)" />
    </div>
    <div v-else-if="node.name === 'cw-categories'" class="cw-category-nav">
      <button
        type="button"
        class="cw-option"
        :aria-pressed="!ctx.category"
        @click.stop="ctx.event('category', '')"
      >
        全部
      </button>
      <button
        v-for="c in ctx.categories.filter((c: any) => c.is_visible !== 0)"
        :key="c.id"
        type="button"
        class="cw-option"
        :style="categoryStyle(c.code)"
        :aria-pressed="ctx.category === c.code"
        @click.stop="ctx.event('category', c.code)"
      >
        {{ c.name }}
      </button>
    </div>
    <div v-else-if="node.name === 'cw-tools'">
      <section v-for="group in groups" :key="group.id">
        <h2 class="cw-category-heading" :style="styles.label">
          {{ group.name }}
        </h2>
        <div :style="styles.root">
          <button
            v-for="tool in group.tools"
            :key="tool.id"
            type="button"
            class="cw-tool-card"
            :style="styles.option"
            @click.stop="
              ctx.mode === 'runtime' && ctx.event('navigate', tool.tool_code)
            "
          >
            <span class="cw-tool-icon" :style="styles.icon">
              <img
                v-if="tool.icon && !brokenIcons[tool.id]"
                :src="iconUrl(tool.icon)"
                alt=""
                @error="brokenIcons[tool.id] = true"
              />
              <template v-else>{{ glyphs[tool.tool_code] || "文" }}</template>
            </span>
            <span>
              <strong :style="styles.optionLabel">{{ tool.name }}</strong>
              <small :style="styles.help">{{ tool.description }}</small>
            </span>
          </button>
        </div>
      </section>
      <div v-if="!groups.length" class="cw-empty">当前分类暂无已发布功能</div>
    </div>
    <button
      v-else-if="node.name === 'cw-history'"
      type="button"
      class="cw-option"
      @click.stop="ctx.event('navigate', 'history')"
    >
      生成记录
    </button>
    <div v-else-if="node.name === 'cw-status'" role="status">
      {{ statusText }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch, nextTick } from "vue";
import { ElSelect, ElOption } from "element-plus";
import ModelSourceBadge from "../../model-source/ModelSourceBadge.vue";
import CopywritingTaskTrace from "./CopywritingTaskTrace.vue";
import { resolveNodeStyles } from "../styles.mjs";
import { visibleField } from "../document.mjs";
import {
  parseResult,
  buildCategoryView,
  nodeInteractionStates,
  copywritingIconUrl,
} from "../client.mjs";
const props = defineProps<{ node: any }>();
const brokenIcons = ref<Record<string, boolean>>({});
const iconUrl = (url: string) =>
  copywritingIconUrl(
    url,
    typeof window === "undefined" ? "" : window.location.origin,
  );
const ctx = inject<any>("cw");
const focus = ref(false),
  hover = ref(false),
  textRef = ref<HTMLElement>(),
  follow = ref(true);
const context = computed(() => ({
  viewportWidth: ctx.viewportWidth,
  terminal: ctx.terminal || "h5",
  states: nodeInteractionStates(props.node.name, {
    focus: focus.value,
    hover: hover.value,
    busy: ["pending", "running"].includes(ctx.task?.status),
    hasModel: !!ctx.selectedModel,
    preview: ctx.mode !== "runtime",
    error: !!ctx.task?.error || !!ctx.error,
  }),
}));
const styles = computed(() => resolveNodeStyles(props.node, context.value));
const field = computed(() =>
  ctx.document.fields?.find((f: any) => f.id === props.node.content?.field_id),
);
const value = computed(
  () => ctx.values[field.value?.key] ?? field.value?.default ?? "",
);
const visible = computed(
  () => !field.value || visibleField(field.value, ctx.values),
);
const busy = computed(() => ["pending", "running"].includes(ctx.task?.status));
const result = computed(() =>
  parseResult(
    ctx.task?.result_text || "",
    ctx.task?.result_mode || ctx.document.result?.mode,
  ),
);
const statusText = computed(
  () =>
    ({
      pending: "排队中",
      running: ctx.task?.submission_state === "uncertain" ? "待核对" : "生成中",
      success: "已完成",
      failed: "生成失败",
      canceled: "已停止",
    })[ctx.task?.status] || "",
);
const groups = computed(() =>
  buildCategoryView(ctx.categories, ctx.tools, ctx.category),
);
const glyphs: Record<string, string> = {
  copy_rewrite: "改",
  risk_optimize: "盾",
  original_rewrite: "创",
  typo_check: "校",
  smart_write: "写",
  sales_copy: "购",
  spoken_script: "声",
  video_title: "题",
  copy_create: "笔",
  xiaohongshu_article: "红",
  wechat_article: "文",
  copy_extract: "摘",
};
const modelPrice = computed(() => {
  const m = ctx.models.find(
    (v: any) => String(v.id) === String(ctx.selectedModel),
  );
  return m
    ? `按实际用量结算 · 输入 ${m.tenant_input_unit_price ?? "—"} / 输出 ${m.tenant_output_unit_price ?? "—"} 点 / ${m.billing_unit_size || 1000000} Token`
    : "请选择模型查看计价规则";
});
function update(v: any) {
  ctx.update(field.value.key, v);
}
function chosen(v: any) {
  return field.value?.type === "checkbox"
    ? Array.isArray(value.value) && value.value.includes(v)
    : value.value === v;
}
function toggle(v: any) {
  if (field.value.type !== "checkbox") update(v);
  else {
    const a = Array.isArray(value.value) ? [...value.value] : [];
    const i = a.indexOf(v);
    if (i >= 0) a.splice(i, 1);
    else a.push(v);
    update(a);
  }
}
function optionStyle(v: any) {
  return resolveNodeStyles(props.node, {
    ...context.value,
    states: [...context.value.states, ...(chosen(v) ? ["selected"] : [])],
  }).option;
}
function categoryStyle(v: string) {
  return resolveNodeStyles(props.node, {
    ...context.value,
    states: ctx.category === v ? ["selected"] : [],
  }).option;
}
function selectNode() {
  if (ctx.mode === "edit") ctx.event("select-node", props.node.id);
}
function drag(e: DragEvent) {
  if (ctx.mode === "edit")
    e.dataTransfer?.setData("text/cw-node", props.node.id);
}
function drop(e: DragEvent) {
  if (ctx.mode === "edit")
    ctx.event("drop-node", {
      id: e.dataTransfer?.getData("text/cw-node"),
      parentId: props.node.name === "cw-container" ? props.node.id : undefined,
    });
}
function trackScroll() {
  const e = textRef.value;
  if (e) follow.value = e.scrollHeight - e.scrollTop - e.clientHeight < 50;
}
function toBottom() {
  follow.value = true;
  if (textRef.value) textRef.value.scrollTop = textRef.value.scrollHeight;
}
watch(
  () => ctx.task?.result_text,
  () => {
    if (follow.value) nextTick(toBottom);
  },
);
</script>
