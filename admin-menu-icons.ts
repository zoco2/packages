import type { RouteRecordRaw } from 'vue-router'

const defaultIcons = new Map([
    ['网站设置', 'el-icon-Basketball'],
    ['网站信息', 'el-icon-Document'],
    ['存储设置', 'el-icon-FolderOpened'],
    ['消息管理', 'el-icon-ChatDotRound'],
    ['点数预警', 'el-icon-Bell'],
    ['通知设置', 'el-icon-Notification'],
    ['短信设置', 'el-icon-ChatLineSquare'],
    ['系统维护', 'el-icon-SetUp'],
    ['定时任务', 'el-icon-Clock'],
    ['系统日志', 'el-icon-Tickets'],
    ['系统缓存', 'el-icon-Box'],
    ['系统环境', 'el-icon-Monitor']
])

// Only enrich the sidebar projection; retain registered routes and configured icons.
export const withAdminMenuIcons = (routes: RouteRecordRaw[]): RouteRecordRaw[] =>
    routes.map((route) => ({
        ...route,
        meta: {
            ...route.meta,
            icon: String(route.meta?.icon || '').trim() ||
                defaultIcons.get(String(route.meta?.title || '')) ||
                ((route.children || []).some((child) => !child.meta?.hidden)
                    ? 'el-icon-Folder'
                    : 'el-icon-Document')
        },
        ...(route.children ? { children: withAdminMenuIcons(route.children) } : {})
    }))
