/** Optional mobile layouts only. Legacy widgets keep their original rendering. */
export const MOBILE_DECORATION_FILTER_KEY = 'mobile-decoration-filters'
export type MobileDecorationFilters = Record<string, string>

export const mobileFilterKey = (row: any) => String(row?.filter_key ?? '').trim()
export const mobileFilterRows = (rows: any[], content: any, filters: MobileDecorationFilters) => {
    const group = String(content?.filter_group || '').trim()
    const key = group ? filters[group] : ''
    if (!key || key === '*' || key === 'all') return rows
    return rows.filter(row => [row?.category, row?.app_code].some(value =>
        Array.isArray(value) ? value.map(String).includes(key) : String(value ?? '') === key))
}

/** Independent column flow preserves each image's natural height on every terminal. */
export const mobileMasonryColumns = (rows: any[]) => [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 2 === 1)]

export const mobileProfileRow = (source: any) => {
    const row = Array.isArray(source?.items) ? source.items[0] : undefined
    return row && typeof row === 'object' ? row : null
}
export const mobileProfileName = (profile: any, content: any) =>
    String(profile?.nickname || profile?.title || profile?.name || content?.guest_name || '点击登录')
export const mobileProfileLink = (content: any, key: string) => content?.[key] ?? ({
    login_link: { path: '/pages/login/login' },
    settings_link: { path: '/pages/user_set/user_set' },
    bind_link: { path: '/pages/bind_mobile/bind_mobile' }
} as Record<string, any>)[key]
export const mobileCaseMeta = (row: any) => [row?.model_name, row?.meta].filter(Boolean).join(' · ')
export const mobileProfileMobile = (profile: any, content: any) =>
    profile?.masked_mobile || profile?.mobile || profile?.phone
        ? `${content?.bound_label || '已绑定手机号'} ${profile.masked_mobile || profile.mobile || profile.phone}`
        : String(content?.bind_label || '绑定手机号')
export const mobileProfileStatRows = (profile: any, content: any) => [
    { key: 'quota', label: content?.quota_label || '可用点数', link: content?.quota_link },
    { key: 'avatar_count', label: content?.avatar_label || '我的形象', link: content?.avatar_link },
    { key: 'voice_count', label: content?.voice_label || '我的声音', link: content?.voice_link }
].map(row => ({ ...row, value: profile?.[row.key] !== undefined && profile?.[row.key] !== null && profile?.[row.key] !== '' ? String(profile[row.key]) : '—' }))

/** Manual/fallback example engagement is never presented as live business data. */
export const mobileCaseHeartText = (row: any, isLive: boolean) => {
    if (row?.heart_count === undefined || row?.heart_count === null || row?.heart_count === '') return ''
    const count = Number(row.heart_count)
    if (!Number.isFinite(count) || count < 0) return ''
    return `${isLive && !row?.is_example ? '' : '示例 '}${count}`
}
