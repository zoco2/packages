export const oemStates = [
    ['tenant_review', '待租户审核'], ['tenant_info', '待补充资料'], ['awaiting_quota', '待采购额度'],
    ['ready_submit', '待提交平台'], ['platform_review', '待平台审核'], ['platform_info', '平台退回待处理'],
    ['opening', '开通中'], ['open_failed', '开通异常'], ['refund_review', '退款审核中'],
    ['refunding', '退款处理中'], ['refund_failed', '退款异常'], ['delivered', '已交付'],
    ['refunded', '已退款'], ['awaiting_payment', '待支付'], ['closed', '已关闭']
] as const
export const oemActions: Record<string, string> = {
    approve: '审核通过', needs_info: '要求补充资料', reject: '拒绝并全额退款', purchase_quota: '按单采购',
    reserve: '预占额度', submit: '提交平台', confirm: '确认开通', return: '退回租户处理', retry: '重试开通',
    approve_refund: '同意全额退款', deny_refund: '拒绝退款申请', retry_refund: '核对并重试退款',
    pay: '继续支付', cancel: '取消订单', supplement: '补充资料', request_refund: '申请退款', renew: '续费', domain: '验证域名'
}
export const oemEventLabels: Record<string, string> = {
    create: '提交申请', payment: '确认付款', approve: '审核通过', needs_info: '要求补充资料', supplement: '补充资料',
    reserve: '预占额度', submit: '提交平台', confirm: '平台确认开通', reject: '审核拒绝', return: '平台退回',
    retry: '重试开通', create_tenant: '创建租户', initialize_admin: '初始化管理员', initialize_brand: '配置品牌',
    initialize_services: '初始化应用', deliver: '完成交付', close: '关闭订单', refund_request: '申请退款',
    refund_approve: '同意退款', refund_deny: '拒绝退款申请', refund_success: '退款完成', remind: '超期提醒',
    request_refund: '申请退款', approve_refund: '同意退款', deny_refund: '拒绝退款申请', retry_refund: '重新核对退款',
    refund_failed: '退款需人工处理', overdue_reminder: '超期跟进提醒', domain_prepare: '提交域名验证', domain_verified: '域名验证通过'
}
export const reserveText = (value: unknown) => ['未预占', '已冻结', '已消耗', '已释放', '已失效'][Number(value)] || '待核对'
export const refundText = (value: unknown) => (({ queued: '待退款', processing: '退款处理中', unknown: '退款结果待核对', failed: '退款失败待处理', manual: '需人工核对', success: '退款成功' } as Record<string,string>)[String(value)] || '待核对')
export const oemDate = (value: unknown) => !value ? '--' : /^\d+$/.test(String(value)) ? new Date(Number(value) * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : String(value)

export const shouldPollOemOrder = (order: any): boolean => Number(order?.flow_version) === 2 ? !['delivered','refunded','closed','open_failed','refund_failed'].includes(order?.workflow_state) : Number(order?.pay_status) === 1 && Number(order?.open_status) === 0 && !order?.closed_time
