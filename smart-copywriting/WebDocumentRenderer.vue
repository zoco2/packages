<template>
  <div class="cw-root" :style="rootStyle" :data-cw-mode="mode">
    <CwNode
      v-for="node in document.page?.nodes || []"
      :key="node.id"
      :node="node"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, provide, reactive } from "vue";
import CwNode from "./components/CwNode.vue";
import { resolveNodeStyles } from "./styles.mjs";
const props = withDefaults(
  defineProps<{
    document: any;
    values?: any;
    modelOptions?: any[];
    selectedModel?: string;
    task?: any;
    error?: string;
    tools?: any[];
    categories?: any[];
    category?: string;
    mode?: string;
    viewportWidth?: number;
    selectedNode?: string;
    terminal?: string;
  }>(),
  {
    error: "",
    values: () => ({}),
    modelOptions: () => [],
    tools: () => [],
    categories: () => [],
    mode: "runtime",
    viewportWidth: 1280,
    category: "",
    terminal: "h5",
  },
);
const emit = defineEmits([
  "update:values",
  "select-model",
  "submit",
  "cancel",
  "copy",
  "copy-id",
  "regenerate",
  "navigate",
  "category",
  "select-node",
  "drop-node",
]);
const ctx = reactive({
  get document() {
    return props.document;
  },
  get values() {
    return props.values;
  },
  get models() {
    return props.modelOptions;
  },
  get selectedModel() {
    return props.selectedModel;
  },
  get error() {
    return props.error;
  },
  get task() {
    return props.task;
  },
  get tools() {
    return props.tools;
  },
  get categories() {
    return props.categories;
  },
  get category() {
    return props.category;
  },
  get mode() {
    return props.mode;
  },
  get selectedNode() {
    return props.selectedNode;
  },
  get viewportWidth() {
    return props.viewportWidth;
  },
  get terminal() {
    return props.terminal;
  },
  update: (key: string, value: any) =>
    emit("update:values", { ...props.values, [key]: value }),
  event: (name: string, value?: any) => emit(name as any, value),
});
provide("cw", ctx);
const rootStyle = computed(() => ({
  "--cw-primary":
    "var(--skin-accent, var(--ia-accent, var(--tool-primary, var(--el-color-primary, var(--pc-theme-primary, #5965e9)))))",
  ...resolveNodeStyles(
    { styles: props.document.page?.styles || {} },
    { viewportWidth: props.viewportWidth, terminal: props.terminal },
  ).root,
}));
</script>
<style>
.cw-root {
  color: var(
    --cw-text,
    var(--pc-theme-text, var(--el-text-color-primary, #24272f))
  );
  font-family: inherit;
  line-height: 1.6;
  min-width: 0;
}
.cw-root * {
  box-sizing: border-box;
}
.cw-node {
  min-width: 0;
}
.cw-node[data-selected="true"] {
  outline: 2px solid var(--cw-primary);
  outline-offset: 3px;
}
.cw-field {
  margin-bottom: 16px;
}
.cw-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
.cw-help {
  display: flex;
  justify-content: space-between;
  color: var(--cw-muted, var(--el-text-color-secondary, #7c8291));
  font-size: 12px;
  margin-top: 6px;
}
.cw-control {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--cw-border, var(--el-border-color, #dfe2e8));
  border-radius: 10px;
  background: var(
    --cw-surface,
    var(--pc-theme-surface, var(--el-bg-color, #fff))
  );
  color: inherit;
  font: inherit;
  min-width: 0;
}
.cw-control:focus {
  outline: 2px solid var(--cw-primary);
  outline-offset: 2px;
}
.cw-control:disabled {
  opacity: 0.55;
}
.cw-select {
  padding: 0;
}
.cw-select:focus-within {
  border-color: var(--cw-primary);
  outline: 2px solid color-mix(in srgb, var(--cw-primary) 24%, transparent);
  outline-offset: 2px;
}
.cw-select .el-select {
  display: block;
  width: 100%;
  --el-input-bg-color: transparent;
  --el-input-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-input-focus-border-color: transparent;
  --el-input-text-color: currentColor;
}
.cw-select :is(.el-input__wrapper, .el-select__wrapper) {
  min-height: 44px;
  padding: 0 14px;
  border-radius: inherit;
  background: transparent;
  box-shadow: none !important;
}
.cw-select :is(.el-input__inner, .el-select__selected-item) {
  color: inherit;
  font: inherit;
}
.cw-model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cw-model-option > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}
.cw-select-popper .el-select-dropdown__item {
  height: auto;
  min-height: 40px;
  padding: 4px 14px;
  line-height: 32px;
}
.cw-select-popper .el-select-dropdown__list {
  padding: 6px;
}
.cw-select-popper .el-select-dropdown__item {
  border-radius: 8px;
}
.cw-textarea {
  min-height: 180px;
  resize: none;
}
.cw-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cw-option {
  border: 1px solid var(--cw-border, var(--el-border-color, #dfe2e8));
  padding: 8px 14px;
  border-radius: 8px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font: inherit;
}
.cw-option[aria-pressed="true"] {
  border-color: var(--cw-primary);
  color: var(--cw-primary);
  background: color-mix(in srgb, var(--cw-primary) 9%, transparent);
}
.cw-button {
  border: 0;
  background: var(--cw-primary);
  color: var(--cw-on-primary, var(--tool-on-primary, #fff));
  border-radius: 10px;
  min-height: 44px;
  padding: 10px 20px;
  font: inherit;
  cursor: pointer;
}
.cw-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.cw-button-secondary {
  background: transparent;
  color: inherit;
  border: 1px solid var(--cw-border, var(--el-border-color, #dfe2e8));
}
.cw-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.cw-node[data-cw-node="cw-result"] {
  display: flex;
  flex-direction: column;
}
.cw-node[data-cw-node="cw-result"] > .cw-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cw-node[data-cw-node="cw-result"] > .cw-result > .cw-empty {
  flex: 1;
  display: grid;
  place-items: center;
}
.cw-result {
  padding: 22px;
  border: 1px solid var(--cw-border, var(--el-border-color, #e2e5ed));
  background: var(
    --cw-surface,
    var(--pc-theme-surface, var(--el-bg-color, #fff))
  );
  border-radius: 14px;
  min-width: 0;
}
.cw-result-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}
.cw-result-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  margin: 0;
  max-height: 65vh;
  overflow: auto;
}
.cw-empty {
  padding: 48px 12px;
  color: var(--cw-muted, var(--el-text-color-secondary, #858b98));
  text-align: center;
}
.cw-error {
  color: var(--el-color-danger, #dc5252);
  font-size: 13px;
  margin: 8px 0;
}
.cw-category-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
}
.cw-category-heading {
  font-size: 20px;
  font-weight: 650;
  margin: 32px 0 16px;
}
.cw-tool-card {
  text-align: left;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 20px;
  border: 1px solid var(--cw-border, var(--el-border-color, #e8eaf0));
  border-radius: 14px;
  background: var(
    --cw-surface,
    var(--pc-theme-surface, var(--el-bg-color, #fff))
  );
  color: inherit;
  cursor: pointer;
  font: inherit;
  min-height: 100px;
}
.cw-tool-card:hover {
  border-color: var(--cw-primary);
}
.cw-tool-card strong {
  display: block;
  font-size: 16px;
}
.cw-tool-card small {
  color: var(--cw-muted, var(--el-text-color-secondary, #858b98));
}
.cw-tool-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cw-primary) 10%, transparent);
  color: var(--cw-primary);
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}
.cw-candidate {
  padding: 12px 0;
  border-bottom: 1px solid var(--cw-border, var(--el-border-color, #e8eaf0));
}
.cw-status {
  font-size: 12px;
  color: var(--cw-muted, var(--el-text-color-secondary, #858b98));
}
@media (prefers-reduced-motion: reduce) {
  .cw-root * {
    scroll-behavior: auto !important;
  }
}
</style>

<style>
.cw-tool-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>

<style>
.cw-node[data-cw-node="cw-result"] {
  scroll-margin-top: 16px;
}
.cw-result-head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: inherit;
  padding-block: 4px 12px;
}
.cw-result-head > strong {
  flex: 1;
}
.cw-result-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cw-icon-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 8px;
  border: 1px solid var(--cw-border, #dfe2e8);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.cw-icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cw-icon-button:hover:enabled {
  color: var(--cw-primary);
  border-color: var(--cw-primary);
}
.cw-icon-button:focus-visible {
  outline: 2px solid var(--cw-primary);
  outline-offset: 2px;
}
.cw-icon-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cw-submit-error {
  margin-top: 12px;
}
</style>
