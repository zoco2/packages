<template>
  <div v-if="task?.id" class="cw-task-trace">
    <div v-if="task.provider_request_id" class="cw-trace-row">
      <span>上游请求 ID</span>
      <code :title="String(task.provider_request_id)" data-i18n-skip>{{ task.provider_request_id }}</code>
      <button type="button" class="cw-option" aria-label="复制上游请求 ID" @click.stop="$emit('copy', String(task.provider_request_id))">复制</button>
    </div>
    <details>
      <summary>平台任务 ID</summary>
      <div class="cw-trace-row">
        <code data-i18n-skip>{{ task.id }}</code>
        <button type="button" class="cw-option" aria-label="复制平台任务 ID" @click.stop="$emit('copy', String(task.id))">复制</button>
      </div>
    </details>
  </div>
</template>
<script setup lang="ts">
defineProps<{ task?: any }>();
defineEmits<{ (event: 'copy', id: string): void }>();
</script>
<style scoped>
.cw-task-trace { min-width: 0; margin-top: 12px; color: var(--cw-muted, var(--el-text-color-secondary)); font-size: 12px; }
.cw-trace-row { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 4px 0; }
.cw-trace-row > span { flex: none; }
.cw-trace-row code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text; font: inherit; }
.cw-trace-row button { flex: none; padding: 2px 8px; min-height: 28px; }
summary { cursor: pointer; }
</style>
