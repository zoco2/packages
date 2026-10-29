import type { DecorateWidgetDefinition, DecorationFieldSchema } from './index'
import { mobileContentFieldUnit } from './mobile-units'
import { isMobileEntryWidget,MOBILE_ENTRY_ITEM_FIELDS,MOBILE_ICON_OPTIONS } from './mobile-visual'

export interface DecorationContractField {
    key: string
    label: string
    type: string
    value_type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'
    default: unknown
    unit?: string
    min?: number
    max?: number
    max_length?: number
    options?: Array<{ label: string; value: string | number; tags?: string[] }>
    help?: string
    show_if?: { key: string; equals: unknown }
}

export interface MobileWidgetContract {
    schema_version: 1
    name: string
    title: string
    category: string
    terminal: string[]
    channels: string[]
    repeatable: boolean
    content_fields: Record<string, DecorationContractField>
    style_fields: Record<string, DecorationContractField>
    lists: Record<string, { min_items: number; max_items: number | null; limit_scope: 'editor' | 'normalizer' | 'save' | 'unspecified'; initial_items: number; fields: Record<string, DecorationContractField> }>
    source: { default_key: string; allowed_keys: string[]; modes: string[]; params: Record<string, DecorationContractField>; empty_policy: string }
    runtime_notes: string[]
    children: { supported: boolean; max_depth: number }
    compatibility: { unknown_fields: 'preserve'; persisted_shape: 'name/content/styles/children'; required_renderer_components: string[] }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const labels: Record<string, string> = {
    enabled: '是否显示', title: '标题', name: '名称', description: '描述', desc: '描述', sub_title: '副标题',
    image: '图片', cover: '封面', icon: '图标', link: '跳转链接', text: '文字', html: '富文本',
    data: '内容列表', fallback_data: '备用内容', data_mode: '数据模式', source_key: '数据源', source_params: '数据源参数',
    field_map: '字段映射', is_show: '是否显示', tag: '标签', tag_enabled: '显示标签', tag_color: '标签文字颜色', tag_background: '标签背景',
    background: '备用底色', background_color: '组件底色', background_gradient: '背景渐变', background_image: '背景图片',
    color: '文字颜色', border_color: '边框颜色', shadow: '阴影', opacity: '背景透明度', appearance: '组件样式',
    padding_top: '上内边距', padding_bottom: '下内边距', padding_horizontal: '左右内边距',
    margin_top: '上外边距', margin_bottom: '下外边距', margin_horizontal: '左右外边距', item_gap: '图片间距',
    radius_top: '左上圆角', radius_right: '右上圆角', radius_bottom: '右下圆角', radius_left: '左下圆角',
    padding: '旧版内边距', border_radius: '旧版圆角', font_size: '字体大小', icon_size: '图标大小',
    filter_key: '筛选标识', category: '分类标识', app_code: '应用代码', model_name: '模型名称', meta: '案例说明', heart_count: '喜欢数', is_example: '示例数据',
    left: '左位置', top: '上位置', width: '宽度', height: '高度', limit: '显示数量', sort: '排序', terminal: '终端'
}

const commonStyles: Record<string, unknown> = {
    background: 'transparent', background_color: 'rgba(255, 255, 255, 0.88)', color: '#333333', border_color: '',
    background_gradient: '', background_image: '', appearance: 'default', shadow: '',
    item_gap: 0, padding_top: 24, padding_bottom: 24, padding_horizontal: 24,
    margin_horizontal: 24, margin_top: 20, margin_bottom: 0,
    radius_top: 16, radius_right: 16, radius_bottom: 16, radius_left: 16, opacity: 100
}

const sourceDefinitions: Record<string, Record<string, unknown>> = {
    article: { limit: 12, sort: 'new' }, ai_tools: { limit: 12 }, image_cases: { limit: 12 },
    video_cases: { limit: 12 }, digital_human_cases: { limit: 12 }, app_entries: { terminal: 'uniapp' },
    assets: { limit: 12 }, recent_tasks: { limit: 12 }, user_profile: {}, membership_summary: {}, account_summary: {}, user_assets: { limit: 12 }
}

const defaultSources: Record<string, string> = {
    news: 'article', 'case-feed': 'image_cases', 'app-collection': 'app_entries', 'creation-entry-grid': 'ai_tools',
    'recent-tasks': 'recent_tasks', 'user-hero': 'user_profile', 'user-stats': 'user_profile',
    'membership-card': 'membership_summary', 'account-quota': 'account_summary', 'asset-entries': 'user_assets'
}

const listLimits: Record<string, { min: number; max: number; scope: 'editor' | 'normalizer' | 'save' }> = {
    banner: { min: 1, max: 5, scope: 'editor' }, 'middle-banner': { min: 1, max: 5, scope: 'editor' },
    'user-banner': { min: 1, max: 5, scope: 'editor' }, nav: { min: 1, max: 100, scope: 'editor' },
    'my-service': { min: 1, max: 100, scope: 'editor' }, 'button-group': { min: 0, max: 30, scope: 'normalizer' },
    'floating-action': { min: 1, max: 4, scope: 'normalizer' }, 'image-hotspot': { min: 0, max: 30, scope: 'save' }
}

// Source-backed limitations, separate from allowed storage fields. Detailed
// slot/layout guidance lives in MOBILE-CAPABILITIES.md; never advertise an
// ignored historical option merely because it remains safe to preserve.
const runtimeNotes: Record<string, string[]> = {
    search: ['unsupported: show_hotword/show_button; preview is a visual placeholder.'],
    'fixed-search': ['unsupported: fixed_position/show_button; same normal-flow search renderer.'],
    banner: ['unsupported: style/bg_style. Public mixed images/text keeps image swiper; text-only uses first visible row. show_caption=0 hides image captions, 1 enables both clients; absent retains shared caption/public no-caption legacy. Text-only copy is unaffected.'],
    'carousel-search': ['partial: show_search is visual copy, not interactive search; public indicator is fixed.'],
    nav: ['partial: public style paging/link supported; shared preview style paging/link not simulated. Row descriptions/tags are not rendered.'],
    news: ['unsupported: show_click/styles.title_color/styles.text_color. Non-article sources require explicit links; never infer article IDs.'],
    'middle-banner': ['partial: public swiper/links versus shared first-image preview.'],
    'title-bar': ['Optional more_text plus link renders a right-aligned navigation action; empty more_text preserves the original heading.'],
    notice: ['unsupported: icon/icon_mode/data_source. partial: public font_weight; configured font_size requires font_size_mode=configured.'],
    'list-nav': ['partial: public row.desc/link; shared preview omits descriptions/link interaction.'],
    'image-hotspot': ['Single image with transparent percentage click areas. New images use original aspect ratio; legacy height remains fixed in rpx. Editor-only outlines. Area actions: link, back_top, phone, customer_service (WeChat contact; H5 configured fallback link).'],
    'image-showcase': ['partial: shared image ratio 4:3 versus public fixed 210rpx height. image_fit is not a writable field for this component.'],
    divider: ['unsupported: content.height; public line styles.color versus shared theme border.'],
    'user-info': ['partial: shared static account preview; public real user/login and its dedicated configured text colors. No user data mutation.'],
    'my-service': ['partial: shared visual rows versus public navigation; description/tag not rendered.'],
    'user-banner': ['partial: shared first image/name preview versus public image-only swiper.'],
    'customer-service': ['partial: shared title-only preview; public qrcode/mobile/time/remark/actions.'],
    'rich-text': ['source rows do not populate html/text; public rich-text capabilities differ from browser HTML.'],
    spacer: ['source rows/data do not populate height.'],
    'audio-player': ['unsupported: cover. partial: public autoplay is disabled, shared native autoplay is supported.'],
    'button-group': ['icon means legacy literal symbol, not the entry system-glyph enum. page uses horizontal CSS scrolling.'],
    tabs: ['Optional variant=underline. filter_group enables local page filtering: row.filter_key matches category or app_code of case-feed/gallery widgets in the same group. Empty/all/* shows all; without a group clicks retain navigation.'],
    'video-player': ['unsupported: title/aspect_ratio. Source rows do not populate video_url/cover.'],
    'floating-action': ['Uses separate auto/type symbols or icon_image, not entry system-glyph names. Customer service depends on terminal capabilities.'],
    'popup-promo': ['unsupported: trigger/delay/closeable; currently an inline promo card, not a modal lifecycle.'],
    section: ['Source rows/data do not create children.'],
    grid: ['Explicit gap0 is consumed as zero; absent/null/invalid gap keeps legacy8rpx. Children are a 1–12 integer column grid. Each direct child styles.grid_column is integer0–12: Explicit0 spans the full parent row; absent preserves read-only legacy layout/grid/content aliases, or spans the full row if none exist. Positive spans are clamped to the nearest parent columns. Canonical presence wins over aliases. Nested grids do not override their own outer span; no arbitrary layout objects.'],
    stack: ['Children require valid percentage placement. Source rows/data do not create children.'],
    'horizontal-scroll': ['Optional bleed_end enum0/1: 1 extends only this viewport by its own horizontal padding to the shell inner border edge; internal row retains original content width, left start, legacy78%/explicit item widths and gap. 0/absent retains old DOM/CSS. Explicit gap0 is zero; absent/null/invalid keeps legacy8rpx fallback, existing factory gap10 is unchanged. Single-row children container; source rows do not create children. Optional item_width is 0–1500rpx: 0/absent retains legacy78%; positive width affects only direct children, never nested descendants or row image widths.'],
    masonry: ['2–4 column children container, not case-feed row columns.'],
    card: ['Source rows/data do not create children.'],
    'image-nav': ['Row description is not a subtitle fallback; no writable named-glyph slot. Images are square/aspectFill.'],
    'magic-grid': ['Row image_fit is implemented. Undeclared icon is not a system-glyph slot; do not recommend icon names.'],
    'tutorial-carousel': ['Row description is not a subtitle fallback. Shared/public image proportions differ.'],
    'case-feed': ['Optional layout=masonry uses two independent natural-image-height columns with dark copy panels, title/model_name/meta/heart_count. Manual/fallback engagement counts are explicitly labeled examples. Legacy layout remains fixed two columns. filter_group connects page-local tabs.'],
    'app-collection': ['Optional source_graphics list max50 matches live app_entries by app_code+entry_key. First matching record wins; absent/source/invalid retains original. Explicit finite icon overrides source image priority; authorized image is a declared managed image leaf. Never override names/routes/permissions/status or create missing entries. Manual/fallback rows and other widgets ignore this list. Without a valid explicit override, images/app brand assets keep their original precedence over finite system glyphs. show_title/show_sub_title control row copy, not block heading.'],
    'creation-entry-grid': ['show_title/show_sub_title control row copy, not block heading. Finite system glyph or actual image; unknown names are not URLs.'],
    'recent-tasks': ['Generic compact rows, not task progress/cost controls.'],
    'media-card': ['Optional image_text_gap is 0–240rpx and only list consumes it between image and copy; positive values use rpx, 0/absent keeps shared12px/public24rpx. It never changes styles.item_gap, source rows or whole-card links. Optional image_max_width is 0–1500rpx: positive non-list slot width is capped by the parent and centered; 0/absent retains 100%, list ignores it and uses image_width. styles.image_background supports transparent/hex/rgb/rgba pure color only on this image slot; empty retains the old softsurface and preserves image URL. text_align enum empty/left/center/right controls only row title/description copy, never outer heading/source/link/click; empty retains CSS. single/grid/double/scroll and cover/contain are consumed. list is inner left-image/right-copy; list_scroll=1 enables outer horizontal 72%-width cards without changing inner layout. image_width is rpx, only list consumes it; 0 uses160rpx; actual image width is capped at45% of the card width. Row typography: font_size enum0 or10–32px, sub_font_size enum0 or10–24px, font_weight enum0/400/500/600/700/800. Positive sizes are logicalpx; 0 retains shared13/11px/public26/22rpx and each old title weight: shared zero/absent adds no font-weight override; public inherits the old weight. Explicit positive image_height (rpx) matches both clients; 0/absent retains shared4:3/public210rpx legacy defaults.'],
    'user-hero': ['Optional layout=profile maps only real user_profile to avatar/name/mobile and settings/bind links. Guests use default_avatar/guest_name/login_link; no extra default block title. Absent layout retains generic rows.'],
    'membership-card': ['Source-backed entitlement facts; display/navigation only, no membership mutation.'],
    'commerce-entries': ['icon means literal legacy symbol, not entry system-glyph enum; image uses aspectFit.'],
    'user-stats': ['Optional layout=assets displays quota/avatar_count/voice_count from real user_profile in one three-column row. Missing and guest values show an em dash, never static fallback counts. Labels and links are configurable. Absent layout retains generic rows.'],
    'account-quota': ['Compact standard rows; arbitrary account_summary properties are not automatically mapped.'],
    'asset-entries': ['Optional layout=gallery uses natural image cards and a centered empty_image/empty_text/empty_action_name/empty_action_link state. show_title controls the block heading; filter_group connects page-local tabs. Absent layout retains generic rows.'],
    'service-grid': ['show_title/show_sub_title control row copy. Public historical default block heading remains.']
}

const valueType = (value: unknown): DecorationContractField['value_type'] =>
    value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value as DecorationContractField['value_type']

const fieldType = (key: string, value: unknown): string => {
    if (key === 'link' || key.endsWith('_link')) return 'link'
    if (key === 'html') return 'richtext'
    if (['image', 'cover', 'bg', 'background_image', 'icon_image', 'qrcode', 'title_img', 'empty_image', 'default_avatar'].includes(key)) return 'image'
    if (key === 'icon') return 'icon'
    if (/color|background$/.test(key)) return 'color'
    if (/^(enabled|is_show|autoplay|loop|closeable|tag_enabled|show_.*)$/.test(key)) return 'switch'
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) return 'array'
    if (value !== null && typeof value === 'object') return 'object'
    return 'text'
}

const describeField = (key: string, value: unknown, name: string, section: 'content' | 'styles' | 'row', override?: DecorationFieldSchema): DecorationContractField => {
    const type = override?.type || fieldType(key, value)
    const field: DecorationContractField = { key, label: override?.label || labels[key] || key, type, value_type: valueType(value), default: clone(value) }
    if (typeof value === 'number' || ['number', 'stepper', 'slider'].includes(type)) {
        field.unit = override?.unit ?? (section === 'styles'
            ? key === 'opacity' ? '%' : /^(padding|margin|radius|item_gap|border_radius)/.test(key) ? 'rpx' : ''
            : mobileContentFieldUnit(name, key))
    }
    if (section === 'row' && ['left', 'top', 'width', 'height'].includes(key) && name === 'image-hotspot') {
        field.unit = '%'; field.min = 0; field.max = 100
    }
    if (section === 'row' && key === 'type' && name === 'image-hotspot') {
        field.type = 'select'
        field.options = [{ label: '跳转页面', value: 'link' }, { label: '返回顶部', value: 'back_top' }, { label: '联系客服', value: 'customer_service' }, { label: '拨打电话', value: 'phone' }]
    }
    if (override?.min !== undefined) field.min = override.min
    if (override?.max !== undefined) field.max = override.max
    if (override?.options) field.options = clone(override.options)
    if (override?.help !== undefined) field.help = override.help
    if (override?.show_if !== undefined) field.show_if = clone(override.show_if)
    return field
}

const describeFields = (values: Record<string, unknown>, name: string, section: 'content' | 'styles' | 'row', overrides: DecorationFieldSchema[] = []) => {
    const fields: Record<string, DecorationContractField> = {}
    for (const [key, value] of Object.entries(values)) fields[key] = describeField(key, value, name, section, overrides.find((field) => field.key === key))
    for (const field of overrides) {
        if (!fields[field.key]) fields[field.key] = describeField(field.key, field.default ?? '', name, section, field)
    }
    return fields
}

const rowDefaults = (name: string): Record<string, unknown> => {
    if (name === 'tabs') return { id: '', title: '', filter_key: '', link: {}, is_show: '1' }
    if (name === 'case-feed') return { id: '', title: '', image: '', model_name: '', meta: '', heart_count: '', is_example: false, category: '', app_code: '', link: {}, is_show: '1' }
    if (name === 'asset-entries') return { id: '', title: '', image: '', category: '', app_code: '', link: {}, is_show: '1' }
    if (name === 'image-hotspot') return { id: '', name: '热区', left: 0, top: 0, width: 20, height: 20, type: 'link', phone: '', link: {} }
    if (name === 'floating-action') return { id: '', type: 'link', icon_mode: 'system', icon: 'auto', icon_image: '', title: '', show_text: '1', phone: '', link: {}, is_show: '1' }
    if (name === 'button-group') return { id: '', image: '', icon: '●', title: '按钮文字', show_text: 1, tag_enabled: 0, tag: '', tag_background: '#f83287', tag_color: '#ffffff', is_show: '1', link: {} }
    if (name === 'magic-grid') return { row: 0, col: 0, row_span: 1, col_span: 1, image: '', image_fit: 'cover', title: '', sub_title: '', link: {}, is_show: '1' }
    return { id: '', title: '', name: '', image: '', cover: '', description: '', sub_title: '', tag: '', link: {}, is_show: '1' }
}

/** Describe the existing protocol; never sanitize or rewrite a page with this
 * metadata. Historical values outside editor limits remain readable. */
export const createMobileWidgetContract = (definition: DecorateWidgetDefinition, initialStyles?: Record<string, unknown>): MobileWidgetContract => {
    const widget = definition.options()
    const content = widget.content || {}
    const editorFields = definition.editor_groups?.flatMap((group) => group.fields) || []
    const lists: MobileWidgetContract['lists'] = {}
    for (const [key, values] of Object.entries(content)) {
        if (!['data', 'fallback_data', 'areas'].includes(key) || !Array.isArray(values)) continue
        const defaults = Object.assign(rowDefaults(definition.name), isMobileEntryWidget(definition.name) ? { icon: '' } : {}, ...values.filter((row) => row && typeof row === 'object'))
        const limit = key === 'fallback_data' ? undefined : listLimits[definition.name]
        const fields = describeFields(defaults, definition.name, 'row')
        if (definition.name === 'case-feed') {
            Object.assign(fields.heart_count, { type: 'number', value_type: 'number', default: 0, min: 0,
                help: '可选互动数；手动和备用内容明确显示为示例，缺省不显示。真实数值仅来自业务数据源。' })
            fields.is_example.type = 'switch'
        }
        if (isMobileEntryWidget(definition.name)) {
            fields.icon.type = 'select'
            fields.icon.options = clone(MOBILE_ICON_OPTIONS)
            fields.icon.help = 'Public glyph name; existing emoji/image addresses remain readable. Image takes priority.'
        }
        if (definition.name === 'button-group') {
            fields.title.max_length = 10; fields.tag.max_length = 8
            fields.title.show_if = { key: 'show_text', equals: 1 }
            fields.tag.show_if = { key: 'tag_enabled', equals: 1 }
        }
        if (definition.name === 'floating-action') {
            fields.type.type = 'select'
            fields.type.options = [{ label: '链接', value: 'link' }, { label: '返回顶部', value: 'back_top' }, { label: '客服', value: 'customer_service' }, { label: '电话', value: 'phone' }]
            fields.icon_mode.type = 'select'
            fields.icon_mode.options = [{ label: '系统图标', value: 'system' }, { label: '图片', value: 'image' }]
            fields.phone.show_if = { key: 'type', equals: 'phone' }
            fields.icon_image.show_if = { key: 'icon_mode', equals: 'image' }
        }
        lists[key] = { min_items: limit?.min ?? 0, max_items: limit?.max ?? null, limit_scope: limit?.scope ?? 'unspecified', initial_items: values.length, fields }
    }
    const manualOnly = ['button-group', 'floating-action'].includes(definition.name)
    const defaultKey = manualOnly ? '' : String(content.source_key || defaultSources[definition.name] || '')
    const params = describeFields({ ...sourceDefinitions[defaultKey], ...(content.source_params || {}) }, definition.name, 'content')
    if (params.limit) { params.limit.min = 1; params.limit.max = 50 }
    if (params.sort) params.sort.options = [{ label: '最新', value: 'new' }, { label: '热门', value: 'hot' }]
    const contentFields = describeFields(content, definition.name, 'content', editorFields)
    if (definition.name === 'app-collection') {
        contentFields.source_graphics = {
            key: 'source_graphics', label: '应用来源图形', type: 'list', value_type: 'array', default: [],
            help: '可选显示覆盖，最多50项。仅app_entries实际源行按app_code与entry_key精确匹配；不修改源行、名称、链接、权限或状态，不创建入口。重复绑定以首项为准，不要重复添加；无配置保持原图形。'
        }
        lists.source_graphics = { min_items: 0, max_items: 50, limit_scope: 'save', initial_items: 0, fields: {
            app_code: { key: 'app_code', label: '真实应用代码', type: 'text', value_type: 'string', default: '', max_length: 64, help: '从data_sources app_entries返回的实际app_code选择，不使用列表位置或自造代码。' },
            entry_key: { key: 'entry_key', label: '真实入口标识', type: 'text', value_type: 'string', default: '', max_length: 128, help: '与app_code一起匹配真实entry_key；卸载或不存在的入口忽略，不创建行。' },
            mode: { key: 'mode', label: '图形来源', type: 'select', value_type: 'string', default: 'source', options: [{ label: '沿用应用图形', value: 'source' }, { label: '系统语义图标', value: 'icon' }, { label: '授权图片素材', value: 'image' }], help: 'source恢复原图形；icon明确优先于源行所有图片；image只显示本项授权image。只改变图形，不改变真实入口信息。' },
            icon: { key: 'icon', label: '系统图标', type: 'select', value_type: 'string', default: '', options: clone(MOBILE_ICON_OPTIONS), show_if: { key: 'mode', equals: 'icon' }, help: '仅已有14类真实glyph，不接受URL或任意图标名；未知/空值保留源图形。' },
            image: { key: 'image', label: '授权图片', type: 'image', value_type: 'string', default: '', show_if: { key: 'mode', equals: 'image' }, help: '仅mode=image且匹配当前真实源行时渲染；复用授权素材或request_image到此精确leaf，仍需来源授权、托管refs和验收。' }
        } }
    }
    if (definition.name === 'notice') {
        contentFields.font_size_mode = { key: 'font_size_mode', label: '字号兼容模式', type: 'text', value_type: 'string', default: 'legacy-fixed', help: 'Absent mode preserves the historical 26rpx; configured is written only on an explicit font edit.' }
    }
    const styleFields = describeFields({ ...commonStyles, ...(isMobileEntryWidget(definition.name) ? { item_background: '', description_color: '' } : {}), ...(initialStyles || widget.styles || {}) }, definition.name, 'styles')
    styleFields.margin_top.min = -480
    styleFields.margin_top.max = 240
    styleFields.grid_column = describeField('grid_column', 0, definition.name, 'styles', {
        key: 'grid_column', label: '栅格占列', type: 'stepper', default: 0, min: 0, max: 12, unit: '列',
        options: Array.from({ length: 13 }, (_, value) => ({ label: value === 0 ? '自动（占满父栅格）' : `${value}列`, value })),
        help: '整数0–12；仅最近父栅格的直接子组件使用，显式0占满父行，缺字段保留旧别名，无旧配置则占满行；正值不超过父columns。其它容器忽略；子栅格的columns不会覆盖它在外层的占列。'
    })
    if (definition.name === 'media-card') {
        styleFields.image_background = describeField('image_background', '', definition.name, 'styles', {
            key: 'image_background', label: '图片槽底色', type: 'color', help: '仅媒体图片槽：transparent、3/4/6/8位十六进制或rgb/rgba纯色（通道整数0–255，alpha0–1，可写.5）；不支持named色或hsl；空/缺省保留旧softsurface，不改外层组件背景，不接受URL、渐变或CSS变量。'
        })
    }
    if (isMobileEntryWidget(definition.name)) {
        for (const field of MOBILE_ENTRY_ITEM_FIELDS) {
            styleFields[field.key] = describeField(field.key, field.default, definition.name, 'styles', field)
            styleFields[field.key].value_type = 'number'
        }
        styleFields.icon_color = describeField('icon_color', '', definition.name, 'styles', { key: 'icon_color', label: '系统图标颜色', type: 'color', help: '仅系统named glyph，十六进制或rgb/rgba；空继承文字颜色，不影响图片、emoji或入口文字。' })
        styleFields.item_background.type = 'color'; styleFields.item_background.label = '入口卡片底色'
        styleFields.description_color.type = 'color'; styleFields.description_color.label = '入口说明颜色'
        contentFields.show_title.help = 'Controls each row title, not the block heading.'
        contentFields.show_sub_title.help = 'Controls each row description.'
    }
    styleFields.opacity.min = 0; styleFields.opacity.max = 100
    return {
        schema_version: 1, name: definition.name, title: definition.title, category: definition.category,
        terminal: [...definition.terminal], channels: [...(definition.support_channels || [])], repeatable: definition.repeatable !== false,
        content_fields: contentFields, style_fields: styleFields, lists,
        source: { default_key: defaultKey, allowed_keys: manualOnly ? [] : Object.keys(sourceDefinitions), modes: manualOnly ? ['manual'] : ['manual', 'source', 'hybrid'], params,
            empty_policy: 'manual uses data; source uses resolved items; hybrid prefers source then manual then fallback' },
        children: { supported: Boolean(definition.container), max_depth: 4 },
        runtime_notes: [...(runtimeNotes[definition.name] || []), ...(Object.prototype.hasOwnProperty.call(content, 'field_map') ? ['unsupported: field_map has no runtime consumer; do not recommend arbitrary mappings.'] : [])],
        compatibility: { unknown_fields: 'preserve', persisted_shape: 'name/content/styles/children', required_renderer_components: [definition.name] }
    }
}

export const mobileDecorationCatalog = (definitions: DecorateWidgetDefinition[]) => ({
    schema_version: 1,
    storage: { geometry: 'rpx', typography: 'px', unknown_fields: 'preserve' },
    components: definitions.map((definition) => clone(definition.contract || createMobileWidgetContract(definition)))
})
