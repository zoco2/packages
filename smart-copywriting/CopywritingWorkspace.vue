<template>
  <main class="cw-workspace">
    <p v-if="loadError" class="cw-error" role="alert">
      {{ loadError }}
      <button type="button" class="cw-option" @click="load">重试加载</button>
    </p>
    <p v-if="pending" class="cw-status">
      上次提交的响应未确认。
      <button type="button" class="cw-option" @click="recoverSubmission">
        恢复上次提交
      </button>
    </p>
    <div v-if="loading" class="cw-empty" role="status">正在加载…</div>
    <template v-else-if="code === 'history'">
      <h1>生成记录</h1>
      <p v-if="!history.length" class="cw-empty">暂无生成记录</p>
      <article
        v-for="item in history"
        :key="item.id"
        class="cw-result"
        style="margin-bottom: 16px"
      >
        <div class="cw-result-head">
          <strong>
            {{ item.model?.name }} · {{ statusName(item.status) }}
          </strong>
          <button
            type="button"
            class="cw-option"
            :disabled="!item.result_text"
            @click="copyHistory(item)"
          >
            复制全文
          </button>
        </div>
        <pre class="cw-result-text">{{
          item.result_text || item.error || "正在生成"
        }}</pre>
        <CopywritingTaskTrace :task="item" @copy="copyIdentifier" />
      </article>
      <button
        v-if="history.length < historyCount"
        type="button"
        class="cw-option"
        :disabled="historyLoading"
        @click="moreHistory"
      >
        加载更多
      </button>
    </template>
    <WebDocumentRenderer
      v-else-if="document"
      :document="document"
      :values="values"
      :model-options="models"
      :selected-model="selectedModel"
      :task="task"
      :error="error"
      :tools="config?.tools || []"
      :categories="config?.categories || []"
      :category="category"
      :viewport-width="width"
      :terminal="api.terminal || 'pc'"
      :mode="preview ? 'preview' : 'runtime'"
      @update:values="values = $event"
      @select-model="selectedModel = $event"
      @submit="generate(false)"
      @regenerate="generate(true)"
      @copy="copy"
      @copy-id="copyIdentifier"
      @cancel="cancel"
      @navigate="go"
      @category="category = $event"
    />
    <details v-if="previous.length && code !== 'history'" class="cw-previous">
      <summary>查看之前的结果（{{ previous.length }}）</summary>
      <article v-for="old in previous" :key="old.id" class="cw-result">
        <div class="cw-result-head">
          <span>{{ old.model?.name }}</span>
          <button type="button" class="cw-option" @click="copyHistory(old)">
            复制全文
          </button>
        </div>
        <pre class="cw-result-text">{{ old.result_text }}</pre>
        <CopywritingTaskTrace :task="old" @copy="copyIdentifier" />
      </article>
    </details>
  </main>
</template>
<script setup lang="ts">
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  nextTick,
} from "vue";
import WebDocumentRenderer from "./WebDocumentRenderer.vue";
import CopywritingTaskTrace from "./components/CopywritingTaskTrace.vue";
import {
  parseResult,
  buildRegenerateRequest,
  copyResultText,
} from "./client.mjs";
import { newId } from "./document.mjs";
import { followCopywritingTask } from "./task-follow.mjs";
import { sortModelsOfficialFirst } from "../../shared/model-channel-source";
const props = withDefaults(
  defineProps<{ api: any; code?: string; preview?: boolean }>(),
  { code: "", preview: false },
);
const config = ref<any>(),
  tool = ref<any>(),
  document = ref<any>(),
  values = ref<any>({}),
  models = ref<any[]>([]),
  selectedModel = ref(""),
  task = ref<any>(),
  previous = ref<any[]>([]),
  loading = ref(true),
  error = ref(""),
  loadError = ref(""),
  category = ref(""),
  width = ref(1280),
  history = ref<any[]>([]),
  historyPage = ref(1),
  historyCount = ref(0),
  historyLoading = ref(false);
let follower: ReturnType<typeof followCopywritingTask> | undefined,
  epoch = 0,
  submitting = false;
const pending = ref<any>(null);
const active = computed(() =>
  ["pending", "running"].includes(task.value?.status),
);
function setError(message: string) {
  if (error.value !== message) props.api.notifyError?.(message);
  error.value = message;
}
async function revealResult() {
  await nextTick();
  window.document
    .querySelector('.cw-node[data-cw-node="cw-result"]')
    ?.scrollIntoView({ block: "start", behavior: "auto" });
}
const key = () => `cw:task:${props.api.scope?.() || "current"}:${props.code}`;
const pendingKey = () => key() + ":submission";
function storePending(v: any) {
  pending.value = v;
  props.api.save?.(pendingKey(), v ? JSON.stringify(v) : "");
}
async function recoverSubmission() {
  if (submitting || !pending.value) return;
  submitting = true;
  try {
    const created = await props.api.create(pending.value);
    task.value = created;
    storePending(null);
    saveId(created.id);
    void revealResult();
    void subscribe(epoch);
  } catch (e: any) {
    if (e?.submissionRejected) storePending(null);
    setError(e.message || String(e));
  } finally {
    submitting = false;
  }
}
function saveId(id: number) {
  props.api.save?.(key(), id);
}
function statusName(v: string) {
  return (
    (
      {
        pending: "排队中",
        running: "生成中",
        success: "已完成",
        failed: "失败",
        canceled: "已停止",
      } as any
    )[v] || v
  );
}
function resize() {
  width.value = window.innerWidth;
}
async function moreHistory() {
  if (historyLoading.value) return;
  historyLoading.value = true;
  try {
    const r = await props.api.history(historyPage.value);
    history.value.push(...r.lists);
    historyCount.value = r.count;
    historyPage.value++;
  } catch (e: any) {
    if (e?.submissionRejected) storePending(null);
    loadError.value = e.message || String(e);
  } finally {
    historyLoading.value = false;
  }
}
async function load() {
  const current = ++epoch;
  follower?.stop();
  follower = undefined;
  loading.value = true;
  error.value = "";
  loadError.value = "";
  try {
    pending.value = JSON.parse(props.api.read?.(pendingKey()) || "null");
  } catch {
    pending.value = null;
  }
  task.value = undefined;
  previous.value = [];
  try {
    config.value = await props.api.config();
    if (current !== epoch) return;
    if (props.code === "history") {
      history.value = [];
      historyPage.value = 1;
      await moreHistory();
      return;
    }
    if (!props.code) {
      document.value = config.value.home;
      return;
    }
    tool.value = await props.api.tool(props.code);
    if (current !== epoch) return;
    document.value = tool.value.document;
    values.value = Object.fromEntries(
      (document.value.fields || []).map((f: any) => [f.key, f.default ?? ""]),
    );
    const allowed = document.value.model?.allowed_model_ids || [];
    models.value = sortModelsOfficialFirst(config.value.models.filter(
      (m: any) => !allowed.length || allowed.map(String).includes(String(m.id)),
    ));
    selectedModel.value = String(models.value[0]?.id || "");
    const id = props.api.read?.(key());
    if (id) {
      try {
        const old = await props.api.detail(Number(id));
        if (current !== epoch) return;
        task.value = old;
        values.value = { ...values.value, ...old.values };
        if (models.value.some((m) => String(m.id) === String(old.model?.id)))
          selectedModel.value = String(old.model.id);
        if (["pending", "running"].includes(old.status))
          void subscribe(current);
      } catch {
        /* Stale task cache is not a reason to hide the form. */
      }
    }
  } catch (e: any) {
    if (current === epoch) loadError.value = e.message || String(e);
  } finally {
    if (current === epoch) loading.value = false;
  }
}
async function subscribe(current = epoch) {
  follower?.stop();
  follower = followCopywritingTask({
    current: () => (current === epoch ? task.value : undefined),
    connect: (onSnapshot: any) => {
      const abort = new AbortController();
      return {
        abort: () => abort.abort(),
        done: props.api.stream(
          task.value.id,
          task.value.last_seq || 0,
          onSnapshot,
          abort.signal,
        ),
      };
    },
    detail: props.api.detail,
    update: (snapshot: any) => {
      if (current !== epoch) return;
      task.value = snapshot;
      if (snapshot.error) setError(snapshot.error);
      if (error.value.startsWith("连接暂时中断")) error.value = "";
    },
    onError: () => setError("连接暂时中断，正在查询原任务；请勿重复提交。"),
  });
  await follower.done;
}
async function generate(regenerate: boolean) {
  if (submitting || active.value || props.preview) return;
  if (pending.value) {
    setError("请先恢复上次提交，确认原任务状态。");
    return;
  }
  error.value = "";
  if (!selectedModel.value) {
    setError("请选择模型");
    return;
  }
  submitting = true;
  const current = epoch;
  try {
    const request = regenerate
      ? buildRegenerateRequest(task.value, selectedModel.value, newId())
      : {
          tool_id: tool.value.id,
          version_id: tool.value.version_id,
          values: { ...values.value },
          model_selection: selectedModel.value,
          idempotency_key: newId(),
        };
    storePending(request);
    const created = await props.api.create(request);
    if (current !== epoch) return;
    if (task.value?.result_text) previous.value.unshift(task.value);
    task.value = created;
    storePending(null);
    saveId(created.id);
    void revealResult();
    void subscribe(current);
  } catch (e: any) {
    if (e?.submissionRejected) storePending(null);
    setError(e.message || String(e));
  } finally {
    submitting = false;
  }
}
async function copy(scope = "all") {
  try {
    await copyResultText(
      parseResult(task.value?.result_text, task.value?.result_mode),
      scope,
      props.api.clipboard,
    );
    props.api.notify?.("已复制");
  } catch {
    setError("复制失败，请选中结果文字手动复制。");
  }
}
async function copyHistory(item: any) {
  try {
    await copyResultText(
      parseResult(item.result_text),
      "all",
      props.api.clipboard,
    );
    props.api.notify?.("已复制");
  } catch {
    setError("复制失败，请选中文字手动复制。");
  }
}
async function copyIdentifier(id: string) {
  try {
    await props.api.clipboard(id);
    props.api.notify?.("已复制");
  } catch {
    props.api.notifyError?.("复制失败，请选中编号手动复制。");
  }
}
async function cancel() {
  try {
    task.value = await props.api.cancel(task.value.id);
  } catch (e: any) {
    if (e?.submissionRejected) storePending(null);
    setError(e.message || String(e));
  }
}
function go(code: string) {
  props.api.navigate(code);
}
watch(() => props.code, load);
onMounted(() => {
  resize();
  window.addEventListener("resize", resize);
  void load();
});
onBeforeUnmount(() => {
  epoch++;
  follower?.stop();
  window.removeEventListener("resize", resize);
});
</script>
<style scoped>
.cw-workspace {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px;
  min-height: 70vh;
}
.cw-previous {
  margin-top: 24px;
}
.cw-previous summary {
  cursor: pointer;
  margin-bottom: 12px;
}
.cw-previous article {
  margin-top: 12px;
}
@media (max-width: 767px) {
  .cw-workspace {
    padding: 16px;
  }
}
</style>
