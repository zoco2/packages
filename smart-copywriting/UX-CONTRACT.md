# 智能文案交互约定

表单和选择器由WebDocumentRenderer及UniDocumentRenderer适配；编辑器使用Element Plus和现有MaterialPicker。通知沿用各端现有feedback/原生toast，复制成功以clipboard回调为准。

创建保存留在当前流程，错误保留输入；草稿保存用revision检测冲突，发布不修改旧版本。拖拽提供图层选择与上移/下移替代。生成请求只由用户动作触发，同一动作保留幂等键；重连和订阅不能生成。

真实增量正文立即显示；用户上翻时不抢滚动。复制正文不包括费用与系统提示。重新生成保留原结果并使用原字段/当前模型。主题与状态说明遵守DESIGN.md。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | CwNode复用Element Plus ElSelect/ElOption；UniNode原生picker | 共享字段契约与DESIGN.md；Web展开菜单由当前主题及Element Plus浮层管理 | Web authored；UniApp native | renderer回归、实际页面、选项打开与键盘选择 |
| Form | WebDocumentRenderer/UniDocumentRenderer | document.mjs与服务端CopywritingPromptService | runtime/preview/edit | document与client行为测试 |
| Date | CwNode与UniNode原生日期控件 | 共享字段契约 | native | 字段契约与构建 |
| Scrollbar | PC主题全局样式；原生移动滚动 | 既有PC主题及DESIGN.md | 页面滚动/结果局部滚动 | 页面实际滚动 |
| Toast | PC/租户feedback；UniApp原生toast | 各端既有通知实现 | success/error | clipboard成功/失败回调 |
| CRUD | 租户智能文案管理与版本服务 | 服务端CopywritingToolService/PageService；租户隔离 | 保存留在当前页；显式发布 | lifecycle、publishing、presentation回归 |
| Navigation | InspirationWorkspacePage、AiWorkspaceChrome；UniApp系统导航 | 当前租户pc_home_style与code参数 | PC主题容器/移动原生导航 | PC主题与移动直达链接验收 |


导航与主题的标准实现为pc/components/ai-workspace/InspirationWorkspacePage.vue、chrome.vue及usePcWorkspaceStyle；智能文案只提供业务页容器，不重新实现皮肤系统。移动系统导航拥有返回/标题，功能路由参数code由onLoad读完后才挂载创作组件，防止先加载首页。图标设置复用tenant/components/material/picker.vue，图标及简介由租户工具API持久化；复制功能保留图标。内置视觉升级只匹配未修改的旧首页快照，以新不可变版本发布，租户自定义草稿与图标保持原值。
