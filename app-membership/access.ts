export type MembershipAccessState = { key?: string; status?: string; data?: Record<string, any> }
export const SUBSCRIPTION_MESSAGE = '当前会员需订阅包含此应用的套餐后使用'

/** One state machine for PC and UniApp. Identity includes tenant, account and application. */
export function createMembershipAccess(state: MembershipAccessState, load: () => Promise<any>) {
    let sequence = 0
    let pending: Promise<void> | undefined
    const refresh = (key: string, force = false): Promise<void> => {
        if (state.key === key && pending) return pending
        if (state.key === key && state.status === 'ready' && !force) return Promise.resolve()
        const token = ++sequence
        state.key = key
        state.status = 'loading'
        state.data = undefined
        const request = (async () => {
            try {
                const data = await load()
                if (token !== sequence) return
                state.data = data
                state.status = 'ready'
            } catch {
                if (token === sequence) state.status = 'error'
            } finally {
                if (token === sequence) pending = undefined
            }
        })()
        pending = request
        return request
    }
    const blocked = () => state.status !== 'ready' || Number(state.data?.allowed) !== 1
    const message = () => {
        if (!blocked()) return ''
        if (state.status === 'error') return '应用权限获取失败，请重试'
        if (state.status !== 'ready') return '正在确认应用使用权限…'
        if (Number(state.data?.need_login) === 1) return '请登录后使用此应用'
        if (Number(state.data?.available) === 0) return '此应用暂未开放，请联系管理员'
        if (Number(state.data?.need_membership) === 1) return SUBSCRIPTION_MESSAGE
        return '当前账号暂不可使用此应用'
    }
    return { refresh, blocked, message }
}
