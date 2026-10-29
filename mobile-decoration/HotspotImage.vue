<template>
    <div class="hotspot-image" :class="{ 'is-edit': mode === 'edit', 'is-auto': automatic }" :style="frameStyle">
        <img v-if="image" :src="image" alt="" draggable="false" :style="imageStyle" />
        <div v-else class="hotspot-placeholder">请选择热区图片</div>
        <a v-for="(area, index) in areas" :key="area.id || index" class="hotspot-target"
            :style="hotspotAreaStyle(area)" :aria-label="area.name || `热区${index + 1}`"
            :href="mode === 'view' ? hotspotHref(area) || undefined : undefined"
            :role="area.type === 'back_top' ? 'button' : undefined" :tabindex="mode === 'view' ? 0 : -1"
            @click="activate($event, area)" @keydown.enter="keyboard($event, area)" @keydown.space="keyboard($event, area)">
            <span v-if="mode === 'edit'">{{ area.name || `热区${index + 1}` }}</span>
        </a>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { hotspotAreas, hotspotAreaStyle, hotspotCropStyle, hotspotHeightMode, hotspotHref } from '../decoration-core/hotspot'
const props = withDefaults(defineProps<{ content: Record<string, any>; image: string; mode?: 'edit' | 'view' }>(), { mode: 'view' })
const emit = defineEmits<{ (event: 'action', area: Record<string, any>): void }>()
const automatic = computed(() => hotspotHeightMode(props.content) === 'auto')
const areas = computed(() => hotspotAreas(props.content))
const frameStyle = computed(() => automatic.value ? {} : { height: `${Math.max(1, Number(props.content.height) || 180) / 2}px` })
const imageStyle = computed(() => ({ height: automatic.value ? 'auto' : '100%', objectFit: props.content.fit === 'contain' ? 'contain' : props.content.fit === 'fill' ? 'fill' : 'cover', ...hotspotCropStyle(props.content) } as const))
const activate = (event: Event, area: Record<string, any>) => {
    if (props.mode === 'edit' || area.type === 'back_top') event.preventDefault()
    if (props.mode !== 'edit') emit('action', area)
}
const keyboard = (event: KeyboardEvent, area: Record<string, any>) => {
    if (area.type === 'back_top') activate(event, area)
}
</script>
<style scoped>
.hotspot-image { position: relative; width: 100%; overflow: hidden; }
.hotspot-image img { display: block; width: 100%; user-select: none; }
.hotspot-placeholder { display: grid; min-height: 120px; place-items: center; color: #888; }
.hotspot-target { position: absolute; display: block; box-sizing: border-box; border: 0; background: transparent; cursor: pointer; }
.hotspot-target:focus-visible { outline: 2px solid var(--mobile-accent, #4173ff); outline-offset: -2px; }
.is-edit .hotspot-target { display: flex; align-items: center; justify-content: center; border: 1px dashed var(--el-color-primary, #4173ff); background: rgba(65,115,255,.12); color: var(--el-color-primary, #4173ff); font-size: 12px; }
</style>
