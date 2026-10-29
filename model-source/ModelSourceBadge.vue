<template>
    <span v-if="source !== 'unknown'" class="model-source-badge" :class="{ 'is-compact': compact }" :data-channel-source="source" :title="text.title" :aria-label="text.title">{{ compact ? text.compact : text.label }}</span>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { modelChannelSource, modelSourceText } from '../../shared/model-channel-source'
const props = defineProps<{ model?: Record<string, any> | null; compact?: boolean }>()
const source = computed(() => modelChannelSource(props.model))
const text = computed(() => modelSourceText(props.model))
</script>
<style scoped>
.model-source-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    box-sizing: border-box;
    padding: 1px 6px;
    margin-inline-start: 6px;
    border: 0;
    border-radius: 999px;
    background: var(--ia-hover, var(--pc-theme-surface-soft, var(--el-fill-color-light, transparent)));
    color: var(--ia-text, var(--pc-theme-text, var(--el-text-color-regular, inherit)));
    font-family: inherit;
    font-size: 10px;
    font-weight: 500;
    line-height: 16px;
    letter-spacing: .02em;
    white-space: nowrap;
    vertical-align: middle;
}
.model-source-badge[data-channel-source='official'] {
    background: var(--ia-accent-soft, var(--pc-theme-primary-soft, var(--el-color-primary-light-9, transparent)));
    color: var(--ia-accent-text, var(--pc-theme-primary, var(--el-text-color-primary, inherit)));
}
/* Authored skins can use pastel accents, so small labels need the readable text tone. */
html[data-pc-skin] .model-source-badge[data-channel-source='official'] {
    color: color-mix(in srgb, var(--ia-text) 85%, var(--ia-accent-text));
}
.model-source-badge.is-compact {
    padding: 1px 4px;
    margin: 0;
    font-size: 9px;
    line-height: 12px;
}
</style>
