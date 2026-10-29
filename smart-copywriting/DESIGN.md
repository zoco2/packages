# 智能文案设计约定

沿用租户 Element Plus、PC 工作台和移动租户主题。用户首页采用分类标题与简洁功能卡片；详情突出主要输入、用户选模型和实时结果。租户设计器使用三栏布局，样式自由度来自配置，不改变后台主题。

颜色来源：PC --pc-theme-*、后台 --el-*、移动 --tool-*，共享运行组件适配为 --cw-*；租户节点样式可覆盖。字体沿用中文系统字体。按钮44px起，正文14至16px；默认边距16/24px，卡片14px圆角，均可DIY。

Element Plus拥有管理页表单、列表、选择器和弹窗；反馈复用feedback。共享WebDocumentRenderer拥有用户字段和结果语义；对应Uni适配器使用原生控件。任务状态和副作用归共享客户端控制层，不通过动画伪造输出。详见UX-CONTRACT.md。

2026-10-29：Web端字段和模型下拉统一复用Element Plus ElSelect/ElOption，避免系统原生菜单脱离主题。控件保留44px最小高度，浮层复用PC全局弹层/后台Element主题，支持键盘和模型搜索；模型选项复用ModelSourceBadge渠道标识。UniApp仍使用原生picker。


2026-10-28 参考图纠正：PC的所有智能文案路由使用blank布局，由CopywritingPageShell接入既有AiWorkspaceChrome与InspirationWorkspacePage。当前租户pc_home_style=likeadmin经usePcWorkspaceStyle解析，复用同一个皮肤、侧栏、账户操作及主题。颜色映射为--ia-text/surface/border/muted、--skin-accent与--ia-on-accent，缺省回落--pc-theme-*；禁止单独使用旧站页眉页脚。

移动端按用户明确要求使用浅色参考稿：保留系统原生导航，移除额外“智能文案/生成记录”工具栏；默认首页隐藏重复标题和分类筛选条，按分类标题排列双列横向卡片，图标28px、主标题13px、副标题9px。默认图标为12个独立PNG，租户可用现有素材选择器替换。节点内部样式仍由DIY parts/terminals覆盖。12功能全部保留，因此创作输出还含文案创作，另有内容提取分类。页面路径使用code参数，可通过首页或独立tool页直接创作。

移动创作页由导航栏展示功能标题，正文不再重复渲染与页面标题相同的内置 heading 节点；其他 DIY 文本保持原样，PC 标题不受影响。

2026-10-28 第二轮校正：PC内容区不再额外渲染智能文案/生成记录工具栏。主题头部固定占高，剩余内容独立纵向滚动；结果组件外壳随Grid行拉伸，结果卡片填满同一行，复制操作放在底部。租户图标只提供现有图库选择和预览/更换/移除，不再提供裸地址输入。移动装修链接选择器每次打开刷新应用页面，使用后台主题背景令牌以兼容深色主题。
