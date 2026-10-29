<template>
    <section v-if="profile?.fields?.length" class="model-capabilities">
        <div class="capability-heading">
            <strong>模型能力</strong>
            <el-button v-if="editable" :loading="saving" type="primary" plain @click="save">
                保存能力校正
            </el-button>
        </div>
        <p class="capability-hint">
            未提供表示上游未声明，不等于不支持。平台校正会影响应用选模和参数限制，并保留至下次主动修改。
            生成仍受供应商接口、应用已实现的适配和上架规格限制。
        </p>
        <el-table :data="profile.fields" size="small" border max-height="480">
            <el-table-column prop="label" label="能力" min-width="160" />
            <el-table-column label="当前生效" min-width="140">
                <template #default="{ row }">{{ display(row.value) }}</template>
            </el-table-column>
            <el-table-column label="来源" width="110">
                <template #default="{ row }">{{ sourceLabels[row.source] || '未提供' }}</template>
            </el-table-column>
            <el-table-column label="上游声明" min-width="140">
                <template #default="{ row }">{{ display(row.upstream_value) }}</template>
            </el-table-column>
            <el-table-column v-if="editable" label="平台校正（空值跟随上游/实测）" min-width="245">
                <template #default="{ row }">
                    <el-select v-if="row.type === 'bool'" v-model="draft[row.key]" clearable placeholder="自动" @clear="draft[row.key] = null">
                        <el-option label="支持" :value="true" />
                        <el-option label="不支持" :value="false" />
                    </el-select>
                    <el-input-number v-else-if="row.type === 'int'" v-model="draft[row.key]" :min="1" :max="100000000" :precision="0" controls-position="right" placeholder="自动" />
                    <el-input v-else v-model="draft[row.key]" clearable placeholder="自动；多个值用逗号分隔" />
                    <el-button v-if="draft[row.key] !== null && draft[row.key] !== undefined && draft[row.key] !== ''" link @click="draft[row.key] = null">恢复自动</el-button>
                </template>
            </el-table-column>
        </el-table>
        <div v-if="profile.protocols?.length" class="capability-hint">接口协议：{{ profile.protocols.join('、') }}</div>
        <el-collapse>
            <el-collapse-item v-if="profile.parameters?.length" title="上游接口参数" name="parameters">
                <el-table :data="profile.parameters" size="small" max-height="320">
                    <el-table-column prop="name" label="参数" min-width="150" />
                    <el-table-column prop="type" label="类型" width="130" />
                    <el-table-column prop="description" label="说明" min-width="240" />
                </el-table>
            </el-collapse-item>
            <el-collapse-item v-if="Object.keys(profile.extra || {}).length" title="其他上游能力" name="extra">
                <div v-for="(value, key) in profile.extra" :key="key" class="capability-extra">{{ key }}：{{ display(value) }}</div>
            </el-collapse-item>
        </el-collapse>
    </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ profile?: any; editable?: boolean; saving?: boolean }>()
const emit = defineEmits<{ (e: 'save', value: Record<string, any>): void }>()
const draft = ref<Record<string, any>>({})
const sourceLabels: Record<string, string> = { upstream: '上游声明', schema: '接口参数', verified: '实际验证', manual: '平台校正', unknown: '未提供' }
const display = (value: any): string => value === null || value === undefined ? '未提供' : typeof value === 'boolean' ? (value ? '支持' : '不支持') : Array.isArray(value) ? (value.join('、') || '无') : typeof value === 'object' ? JSON.stringify(value) : String(value)
watch(() => props.profile, (profile) => {
    draft.value = Object.fromEntries((profile?.fields || []).map((field: any) => [field.key, Array.isArray(field.override) ? field.override.join(', ') : field.override]))
}, { immediate: true, deep: true })
const save = () => {
    const values: Record<string, any> = {}
    for (const field of props.profile?.fields || []) {
        const value = draft.value[field.key]
        if (value === null || value === undefined || value === '') continue
        values[field.key] = field.type === 'list' ? String(value).split(/[,，]/).map((item) => item.trim()).filter(Boolean) : value
    }
    emit('save', values)
}
</script>

<style scoped>
.model-capabilities { margin-bottom: 24px; }
.capability-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.capability-hint { color: var(--el-text-color-secondary); font-size: 13px; margin: 12px 0; }
.capability-extra { overflow-wrap: anywhere; padding: 4px 0; }
</style>
