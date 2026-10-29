<template>
  <section class="point-alert-page" :aria-busy="loading || busy">
    <el-alert
      :title="`当${audience}的可用${unit}降至指定档位时，向其发送提醒。`"
      type="info"
      :closable="false"
      show-icon
    />
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
      class="pa-gap"
      ><el-button :disabled="busy" @click="load">重新加载</el-button></el-alert
    >
    <el-card shadow="never" class="pa-gap">
      <el-tabs v-model="tab" @tab-change="onTab">
        <el-tab-pane label="预警规则" name="rules">
          <el-empty
            v-if="!form && !loading"
            description="规则加载失败，请重新加载"
          />
          <el-form
            v-if="form"
            :model="form"
            label-width="160px"
            novalidate
            :disabled="busy || !canWrite || loading"
          >
            <el-form-item label="自动预警"
              ><el-switch
                v-model="form.enabled"
                active-text="开启"
                inactive-text="关闭"
            /></el-form-item>
            <h3>提醒档位</h3>
            <p>
              降至档位及以下时提醒；一次跨过多档只发送最紧急的一条。站内信为基础渠道。
            </p>
            <el-table :data="form.tiers">
              <el-table-column :label="`提醒档位（${unit}）`" min-width="200"
                ><template #default="{ row, $index }"
                  ><el-input
                    v-model="row.points"
                    :aria-label="`第${$index + 1}档提醒点数`"
                    inputmode="decimal"
                    maxlength="13" /></template
              ></el-table-column>
              <el-table-column label="通知渠道" min-width="300"
                ><template #default="{ row, $index }"
                  ><el-checkbox-group
                    v-model="row.channels"
                    :aria-label="`第${$index + 1}档通知渠道`"
                    ><el-checkbox label="in_app" disabled>站内信</el-checkbox
                    ><el-checkbox label="sms" :disabled="!snapshot?.sms_ready"
                      >短信</el-checkbox
                    ><el-checkbox label="email" disabled
                      >邮件（未配置）</el-checkbox
                    ></el-checkbox-group
                  ></template
                ></el-table-column
              >
              <el-table-column label="操作" width="90"
                ><template #default="{ $index }"
                  ><el-button
                    link
                    type="danger"
                    :disabled="form.tiers.length <= 1 || !canWrite"
                    @click="form.tiers.splice($index, 1)"
                    >删除</el-button
                  ></template
                ></el-table-column
              >
            </el-table>
            <el-button
              class="pa-gap"
              :disabled="form.tiers.length >= 10 || !canWrite"
              @click="form.tiers.push({ points: '', channels: ['in_app'] })"
              >添加档位</el-button
            >
            <h3>次数与频率</h3>
            <el-form-item label="单轮最多提醒"
              ><el-input-number
                v-model="form.max_cycle"
                :min="1"
                :max="1000"
                :precision="0"
              /><span class="pa-unit">次</span></el-form-item
            >
            <el-form-item label="每天最多提醒"
              ><el-input-number
                v-model="form.max_daily"
                :min="1"
                :max="1000"
                :precision="0"
              /><span class="pa-unit">次，按北京时间计算</span></el-form-item
            >
            <el-form-item label="最短提醒间隔"
              ><el-input-number
                v-model="form.min_interval_minutes"
                :min="1"
                :max="10080"
                :precision="0"
              /><span class="pa-unit">分钟</span></el-form-item
            >
            <el-form-item label="持续低余额重复提醒"
              ><el-switch v-model="form.repeat_enabled"
            /></el-form-item>
            <el-form-item v-if="form.repeat_enabled" label="重复提醒间隔"
              ><el-input-number
                v-model="form.repeat_hours"
                :min="1"
                :max="1000"
                :precision="0"
              /><span class="pa-unit"
                >小时，仍受次数上限限制</span
              ></el-form-item
            >
            <el-alert
              title="从进入预警到余额恢复正常为一轮。小额充值不重置次数；各渠道同时发送算一次。次数按发起轮次计，失败或取消不自动追加发送。达到上限后保留页面提示。"
              type="info"
              :closable="false"
            />
            <h3>短信通道</h3>
            <p>
              {{
                snapshot?.sms_ready
                  ? "已配置短信服务，复用当前后台短信签名。"
                  : "短信尚未配置，请先在“消息管理 → 短信设置”配置后刷新本页。"
              }}
            </p>
            <el-form-item label="提醒短信模板编号"
              ><el-input
                v-model="form.sms_template_id"
                maxlength="100"
                placeholder="填写短信服务商审核通过的模板编号"
            /></el-form-item>
            <el-form-item label="短信模板变量"
              ><el-checkbox-group v-model="form.sms_variables"
                ><el-checkbox
                  v-for="item in variableOptions"
                  :key="item.value"
                  :label="item.value"
                  >{{ item.label }}</el-checkbox
                ></el-checkbox-group
              ></el-form-item
            >
            <p>
              模板变量名：name（名称）、points（余额）、threshold（档位）、unit（点数单位）。腾讯云按上面列出的变量顺序传递。邮件将在通道配置完成后开放。
            </p>
          </el-form>
          <div class="pa-actions" v-if="form">
            <el-button
              type="primary"
              :loading="busy"
              :disabled="!canWrite || !dirty || loading"
              @click="save"
              >保存设置</el-button
            ><el-button
              :disabled="busy || dirty || !snapshot?.rules.enabled || !canCheck"
              @click="prepareCheck"
              >检查当前余额</el-button
            ><span>{{
              dirty ? "有未保存修改，请先保存" : "已加载当前配置"
            }}</span>
          </div>
        </el-tab-pane>
        <el-tab-pane label="预警记录" name="records">
          <div class="pa-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索账户名称或编号"
              clearable
              @keyup.enter="search"
            /><el-select
              v-model="query.status"
              clearable
              placeholder="全部发送状态"
              aria-label="发送状态"
              ><el-option
                v-for="key in recordStatuses"
                :key="key"
                :label="statusLabels[key]"
                :value="key" /></el-select
            ><el-button @click="search">查询</el-button>
          </div>
          <el-alert
            v-if="recordError"
            :title="recordError"
            type="error"
            :closable="false"
          />
          <el-table
            :data="records"
            v-loading="recordsLoading"
            empty-text="暂无预警记录"
          >
            <el-table-column label="接收对象" min-width="190"
              ><template #default="{ row }"
                >{{ row.content.split("，")[0]
                }}<small class="pa-id"
                  >租户 {{ row.tenant_id
                  }}<template v-if="row.user_id">
                    · 用户 {{ row.user_id }}</template
                  ></small
                ></template
              ></el-table-column
            >
            <el-table-column
              label="触发时点数"
              prop="balance"
              min-width="120"
            /><el-table-column
              label="提醒档位"
              prop="threshold"
              min-width="120"
            />
            <el-table-column label="发送状态" min-width="140"
              ><template #default="{ row }">{{
                statusLabels[row.status] || row.status
              }}</template></el-table-column
            >
            <el-table-column label="触发时间" min-width="170"
              ><template #default="{ row }">{{
                date(row.create_time)
              }}</template></el-table-column
            >
            <el-table-column label="操作" width="100"
              ><template #default="{ row }"
                ><el-button link type="primary" @click="openDetail(row.id)"
                  >查看详情</el-button
                ></template
              ></el-table-column
            > </el-table
          ><el-pagination
            class="pa-gap"
            v-model:current-page="query.page_no"
            :page-size="20"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="loadRecords"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
    <el-dialog
      v-model="previewOpen"
      title="确认检查范围"
      width="min(560px,94vw)"
      :close-on-click-modal="!busy"
      :close-on-press-escape="!busy"
      :show-close="!busy"
    >
      <el-alert
        v-if="checkError"
        :title="checkError"
        type="error"
        :closable="false"
        role="alert"
      />
      <p>
        当前有 <strong>{{ preview?.matching_accounts || 0 }}</strong> 个{{
          audience
        }}处于所选提醒范围。
      </p>
      <p>
        检查会分批进行，实际发送会再次核对余额、接收设置、次数及间隔。不会给同一账户重复发送。
      </p>
      <template #footer
        ><el-button :disabled="busy" @click="previewOpen = false"
          >取消</el-button
        ><el-button v-if="checkError" :disabled="busy" @click="prepareCheck"
          >重新预览</el-button
        ><el-button
          type="primary"
          :loading="busy"
          :disabled="!!checkError"
          @click="confirmCheck"
          >确认分批检查</el-button
        ></template
      >
    </el-dialog>
    <el-drawer v-model="detailOpen" title="预警详情" size="min(620px,94vw)">
      <el-alert
        v-if="detailError"
        :title="detailError"
        type="error"
        :closable="false"
      />
      <div v-loading="detailLoading">
        <template v-if="detail"
          ><p>{{ detail.content }}</p>
          <p>当前可用点数：{{ detail.current_balance ?? "账户不可用" }}</p>
          <p v-if="detail.budget">
            本轮已提醒 {{ detail.budget.cycle_count || 0 }} /
            {{ detail.limits.max_cycle }} 次 · 计数日期
            {{ detail.budget.day_key || "—" }} · 当日
            {{ detail.budget.day_count || 0 }} /
            {{ detail.limits.max_daily }} 次
          </p>
          <p>
            当前余额{{
              Number(detail.current_balance) > Number(detail.threshold)
                ? "已高于本次提醒档位"
                : "仍未高于本次提醒档位"
            }}。发送成功不代表余额已恢复。
          </p>
          <el-table :data="detail.deliveries"
            ><el-table-column label="渠道"
              ><template #default="{ row }">{{
                channelNames[row.channel]
              }}</template></el-table-column
            ><el-table-column label="状态"
              ><template #default="{ row }">{{
                statusLabels[row.status]
              }}</template></el-table-column
            ><el-table-column
              label="结果说明"
              prop="result"
              min-width="220" /></el-table
        ></template>
      </div>
    </el-drawer>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import {
  ElAlert,
  ElEmpty,
  ElButton,
  ElCard,
  ElTabs,
  ElTabPane,
  ElForm,
  ElFormItem,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElInput,
  ElInputNumber,
  ElCheckbox,
  ElCheckboxGroup,
  ElSelect,
  ElOption,
  ElPagination,
  ElDialog,
  ElDrawer,
  ElMessage,
  ElMessageBox,
} from "element-plus";
import { onBeforeRouteLeave } from "vue-router";
import { toForm, toRules, statusLabels } from "./rules.mjs";
const props = defineProps<{
  api: any;
  audience: string;
  canWrite: boolean;
  canCheck: boolean;
}>();
const form = ref<any>(null),
  snapshot = ref<any>(null),
  baseline = ref(""),
  unit = computed(() => snapshot.value?.unit || "点"),
  tab = ref("rules"),
  loading = ref(false),
  busy = ref(false),
  error = ref("");
const records = ref<any[]>([]),
  total = ref(0),
  recordsLoading = ref(false),
  recordError = ref(""),
  query = ref({ keyword: "", status: "", page_no: 1, page_size: 20 });
const detail = ref<any>(null),
  detailOpen = ref(false),
  detailError = ref(""),
  detailLoading = ref(false),
  preview = ref<any>(null),
  previewOpen = ref(false),
  checkError = ref("");
const dirty = computed(
  () => form.value && JSON.stringify(form.value) !== baseline.value,
);
const recordStatuses = [
    "pending",
    "sent",
    "partial",
    "failed",
    "unknown",
    "cancelled",
  ],
  channelNames: any = { in_app: "站内信", sms: "短信", email: "邮件" };
const variableOptions = [
  { value: "name", label: "名称" },
  { value: "points", label: "余额" },
  { value: "threshold", label: "档位" },
  { value: "unit", label: "单位" },
];
let active = true,
  seq = 0,
  detailSeq = 0;
onBeforeUnmount(() => {
  active = false;
  seq++;
  detailSeq++;
});
const message = (e: any, fallback: string) =>
  typeof e === "string" ? e : fallback;
function accept(data: any) {
  snapshot.value = data;
  form.value = toForm(data);
  baseline.value = JSON.stringify(form.value);
}
async function load() {
  if (busy.value) return;
  if (dirty.value) {
    try {
      await ElMessageBox.confirm(
        "重新加载会替换尚未保存的修改，是否继续？",
        "重新加载",
      );
    } catch {
      return;
    }
  }
  loading.value = true;
  error.value = "";
  try {
    const data = await props.api.rules();
    if (active) accept(data);
  } catch (e) {
    if (active) error.value = message(e, "规则加载失败，请重试");
  } finally {
    if (active) loading.value = false;
  }
}
async function save() {
  if (busy.value || !props.canWrite) return;
  error.value = "";
  let rules;
  try {
    rules = toRules(form.value);
  } catch (e: any) {
    error.value = e.message;
    return;
  }
  busy.value = true;
  try {
    if (rules.enabled && !snapshot.value.rules.enabled) {
      let p;
      try {
        p = await props.api.preview({ rules });
      } catch (e) {
        if (active) error.value = message(e, "启用预览失败，请重试");
        return;
      }
      if (!active) return;
      try {
        await ElMessageBox.confirm(
          `启用后将分批检查，当前约 ${p.matching_accounts} 个${props.audience}处于提醒范围。实际发送仍受次数和间隔限制。`,
          "启用点数预警",
        );
      } catch {
        return;
      }
    }
    if (!active) return;
    const data = await props.api.save({
      rules,
      revision: snapshot.value.revision,
    });
    if (active) {
      accept(data);
      ElMessage.success("预警设置已保存");
    }
  } catch (e) {
    if (active) error.value = message(e, "保存失败，请保留当前修改并重试");
  } finally {
    if (active) busy.value = false;
  }
}
async function prepareCheck() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const p = await props.api.preview({});
    if (active) {
      checkError.value = "";
      preview.value = p;
      previewOpen.value = true;
    }
  } catch (e) {
    if (active) {
      error.value = message(e, "检查预览失败，请重试");
      if (previewOpen.value) checkError.value = error.value;
    }
  } finally {
    if (active) busy.value = false;
  }
}
async function confirmCheck() {
  if (busy.value || checkError.value) return;
  busy.value = true;
  try {
    await props.api.check({ token: preview.value.token });
    if (active) {
      previewOpen.value = false;
      ElMessage.success("已提交分批检查，请稍后查看预警记录");
    }
  } catch (e) {
    if (active) checkError.value = message(e, "检查提交失败，请重新预览");
  } finally {
    if (active) busy.value = false;
  }
}
async function loadRecords() {
  const request = ++seq;
  recordsLoading.value = true;
  recordError.value = "";
  try {
    const data = await props.api.records({ ...query.value });
    if (active && request === seq) {
      records.value = data.lists;
      total.value = data.count;
    }
  } catch (e) {
    if (active && request === seq)
      recordError.value = message(e, "记录加载失败，请重试");
  } finally {
    if (active && request === seq) recordsLoading.value = false;
  }
}
function search() {
  query.value.page_no = 1;
  void loadRecords();
}
function onTab(value: string | number) {
  if (value === "records") void loadRecords();
}
async function openDetail(id: number) {
  const request = ++detailSeq;
  detail.value = null;
  detailError.value = "";
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    const data = await props.api.detail({ id });
    if (active && request === detailSeq) detail.value = data;
  } catch (e) {
    if (active && request === detailSeq)
      detailError.value = message(e, "详情加载失败，请关闭后重试");
  } finally {
    if (active && request === detailSeq) detailLoading.value = false;
  }
}
const date = (n: number) =>
  new Date(n * 1000).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
onBeforeRouteLeave(async () => {
  if (busy.value) return false;
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm("预警设置尚未保存，是否离开？", "保留修改", {
      confirmButtonText: "离开",
      cancelButtonText: "继续编辑",
    });
    return true;
  } catch {
    return false;
  }
});
onMounted(load);
</script>
<style scoped>
.point-alert-page {
  color: var(--el-text-color-primary);
}
.pa-gap {
  margin-top: 16px;
}
.pa-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 20px 0;
}
.pa-actions > .el-input,
.pa-actions > .el-select {
  width: 220px;
}
.pa-actions > span,
p {
  color: var(--el-text-color-regular);
  line-height: 1.7;
  font-size: 13px;
}
h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 28px 0 16px;
}
.pa-unit {
  margin-left: 10px;
}
.pa-id {
  display: block;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.el-form :deep(.el-input) {
  max-width: 480px;
}
@media (max-width: 650px) {
  .el-form :deep(.el-form-item) {
    display: block;
  }
  .el-form :deep(.el-form-item__label) {
    justify-content: flex-start;
    width: auto !important;
  }
  .el-form :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
