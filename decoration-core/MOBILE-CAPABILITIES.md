# 移动装修参数与渲染能力审计

审计日期：2026-10-15。覆盖当前注册表的 **46** 个组件。依据：`index.ts` 的注册/编辑字段、`mobile-contract.ts` 导出契约、共享 `MobileDecorationRenderer.vue`、公共 `diy-render.vue` / `diy-node.vue` 及 `components/widgets`。这是源代码能力矩阵，不是46个组件已完成浏览器验收的声明。`c1141945` 的 compiled template 回归验证入口、媒体、素材地址映射等链路；其他行是静态控制路径审阅。

## 通用解释规则

- 以导出 contract 的字段、类型、默认值、单位、枚举、范围、条件为写入边界。不得从组件名称猜字段。`help/show_if` 现在能从编辑字段完整导出；它们描述条件，不能凭空创造渲染能力。
- 保存几何值使用 750 设计尺度的 rpx；字号使用逻辑 px。375px 预览将 rpx 减半，字号保持 px。列数/开关无长度单位。热区坐标为百分比。时间字段以秒计。
- `enabled`、padding/margin/radius、边框/阴影、外壳背景/渐变/背景图及背景透明度有共享实现。背景透明度不降低文字/图片透明度。**外壳样式存在不代表内卡、标题和说明均继承**。
- `data_mode/source_key/source_params/data/fallback_data` 仅在组件使用列表时提供数据。容器和媒体播放器也因通用工厂带这些字段，但不会把 source rows 自动变成子组件/播放器内容。
- **`field_map` 当前无运行时消费者**：不推荐、不承诺任意映射。保留旧字段，未来应明确标为 unsupported，或实现有界且两端一致的类型适配。
- 通用 row metadata 目前比实际渲染字段宽：`description/sub_title/tag/cover` 等不是所有组件都展示。未在本表确认消费的字段不得向模型承诺。
- 图片来源优先 `image → cover → cover_url`；视频 `media_url` 不能冒充图片。共享预览精确查询 server-owned `resolvedSources.__decoration_asset_urls`，只替换渲染地址，不修改保存地址。
- 系统图标是 `mobile-visual.ts` 的14个有限 uView glyph 名称，选项包含中文 label/tags；共享端使用安全 SVG，公共端使用同名 bundled glyph。入口图片优先；旧 emoji/真实图片地址兼容读取。未知英文 token 不请求图片，不把 `el-icon-*` 当移动 glyph。
- app source 的应用图标是应用标识：27个当前 manifest 使用同一真实 `resource/image/common/menu_generator.png`。不应为了视觉差异擅自替换商标；手工创作入口可明确选择系统图标。

## 46组件矩阵

“缺口”表示当前未消费或两端不一致，应在 Agent 知识中标 unsupported / partial；不是建议用假页面数据绕过。

| 组件 | 已有实际参数/用途 | 图片槽与布局语义 | 确认缺口/边界 |
|---|---|---|---|
| search | placeholder、height；公共端整体导航 | 无图片槽；height逻辑px | show_hotword/show_button未消费；共享预览仅占位文字、未模拟输入/导航 |
| fixed-search | 与search同一控制路径 | 无图片槽 | fixed_position未消费，当前并不固定定位；通用source字段不驱动搜索 |
| banner | autoplay/interval/show_indicator/image_height；row image/name；无图title/description | image_height rpx，轮播封面；无图文字背景继承 | style/bg_style旧字段未消费；公共端mixed images/text保留图片swiper、无图仅首行文字，不能宣称多文本轮播 |
| carousel-search | autoplay/interval/placeholder/show_search；source rows | 固定轮播高度默认340rpx，cover图片 | 公共端indicator固定开启、未支持indicator参数；搜索是展示文案，未实现搜索动作 |
| nav | per_line/show_line/style；row image/name/link（公共端） | 公共82rpx图，预览40px；宫格/分页 | 共享端style不切换分页、row link未模拟点击；description/sub_title/tag不展示 |
| news | title/limit/show_image/show_desc/show_time；真实cover字段；公共合法来源导航 | 公共180×120rpx封面aspectFill；预览固定缩略图 | show_click及styles.title_color/text_color未消费；共享点击未模拟；非article无显式link不能按文章ID导航 |
| middle-banner | rows image/link（公共端） | 公共200rpx swiper，widthFix；预览单图 | 预览仅首图、未模拟公共自动轮播；name/description等无文字展示 |
| title-bar | title/sub_title/align；font_size10–48px/sub_font_size10–24px/font_weight0/400/500/600/700/800 | 无图片槽 | content.link两端未消费；styles.color供实际标题文字token；字号显式px，两端一致；font_weight=0/缺省保留shared700/public600，不用h1标签推断字号 |
| notice | text；配置字号模式；共享font_weight；公共link | 公共固定bell glyph；无自定义图片槽 | icon/icon_mode/data_source未消费；public font_weight未消费；不要承诺自定义公告图标/读取公告源 |
| list-nav | row image/name/link（公共端），公共desc | 公共56rpx图、列表 | 共享不展示desc、不模拟跳转；通用sub_title/description/tag未消费 |
| image-hotspot | image/height/areas.left/top/width/height/link | 主图cover，热区百分比 | content.mode/fit未消费；声明fit不能改变主图裁剪 |
| image-showcase | layout/columns/show_title/show_sub_title；row image/title/sub_title/description/link | single/grid/double/scroll；共享4:3，公共高210rpx | 两端图片比例不同；image_fit非该组件写入字段，仍固定cover/aspectFill；不应借media-card新增字段扩散 |
| divider | content.style（solid等），公共styles.color | 无图片；1px线 | content.height未消费；共享线色使用固定theme边框token |
| user-info | 公共真实user/isLogin，跳转个人页；共享静态昵称示意 | 公共avatar；不是手工用户数据源 | 共享未模拟真实账号；不能通过通用row修改用户信息 |
| my-service | title/style/per_line、row image/name/link（公共端） | 公共grid60rpx、list48rpx；共享不同缩略尺寸 | 共享不模拟link；通用副标题/tag无消费者 |
| user-banner | row image/link（公共端） | 公共200rpx swiper widthFix；共享首图+可选name | 公共无name/description文字；预览不模拟轮播 |
| customer-service | 公共title/time/mobile/qrcode/remark，联系/电话/二维码动作 | qrcode aspectFit | 共享仅标题文字；source/data等不驱动客服详情 |
| rich-text | html优先、text转义换行；两端内容相同 | HTML自带图像另受富文本组件支持 | data/source/fallback_data不生成富文本；公共富文本与浏览器HTML功能集合不同 |
| spacer | height rpx | 无图片；正常流空白 | 列表/source字段不参与渲染 |
| audio-player | title/audio_url/loop；公共点击播放/暂停；共享native controls | cover字段虽有编辑器但不展示 | cover两端未消费；公共autoplay主动设false，不能承诺自动播放 |
| button-group | button_style/button_shape/button_type/display_style/font_size/font_weight/icon_size/columns；row show_text/tag配置 | 图片固定square aspectFill；图文/纯图/纯文；fixed/scroll/page | icon现是旧字面符号文本，不是新增入口glyph系统；未知图标名字不得推荐；page为CSS单行滑动而非独立分页状态 |
| tabs | active；row title/name/link | 横排标签 | 点击是导航，未修改本页内容选中状态；图片/描述/tag字段不展示 |
| video-player | video_url/cover/show_controls/autoplay | 原生video poster cover | title/aspect_ratio未消费；容器高度/比例固定CSS |
| floating-action | position/offset_right/offset_bottom/button_size/button_gap/button_shape；row type/link/icon_mode/icon_image/show_text/phone | 图片square；type支持链接/回顶/客服/电话；固定层 | 采用独立auto/type符号系统，不等同14类入口glyph；contact依赖端能力；不是普通文档流 |
| popup-promo | image/title/desc/link | 当前是文档流内推广卡背景cover | trigger/delay/closeable未消费；**没有弹窗生命周期**，不可承诺首次/延迟/关闭行为 |
| section | children、外壳样式 | 正常流容器 | 列表/source不自动创建children |
| grid | columns/gap、children；child styles.grid_column | 父columns为1–12列；子span为整数0–12，显式0占满父行，正值限制到最近父columns | 仅直接子组件消费占列；子栅格自身columns不覆盖外层占列；显式canonical0清除旧span别名，缺字段仍兼容旧layout/grid/content别名，没有旧配置才占满行；不允许任意layout对象 |
| stack | min_height、children | 百分比/叠层布局，共享/公共child布局辅助 | 默认布局需显式合法child定位配置；data/source非children；位置字段写入边界需单独导出 |
| horizontal-scroll | gap、children、item_width | 单行横滑组件容器；item_width为0–1500rpx，正值指定直接子项宽度 | 0/未填写保留原78%宽度及CSS级联；显式宽度不传给嵌套后代，不修改图片行；source rows不会转换为子组件 |
| masonry | columns/gap、children | 2–4 CSS columns的容器 | 这是子组件瀑布流；不是case-feed的图片列表列数开关 |
| card | children、外壳样式 | 正常流卡片容器 | source/data不会创建内部children |
| image-nav | per_line/show_line/show_title/show_sub_title；row image/title/sub_title/link | 方形84rpx/aspectFill，宫格 | description未用于副标题回退；无命名glyph选择；文字主色/说明色已消费common color，图标底色仍保留原默认 |
| magic-grid | grid.columns/rows、gap、row row/col/spans/image_fit/title/sub_title/link；历史自由polygon | 行列区域百分比，image_fit cover/contain/fill/auto/repeat实际消费 | 通用row description/tag不展示；icon未声明且当前会被当图片值，不能推荐glyph |
| tutorial-carousel | card_width/show_tag/show_sub_title，row image/title/sub_title/tag/link | 卡片宽180–360rpx，公共图高158rpx；共享图片比例不同 | row.description不回退说明；文字已消费common color；背景/accent仍有默认，不能承诺任意内卡样式参数 |
| case-feed | content.title实际区块标题；source image_cases等；row image/cover/cover_url/title/link/path | 固定2列、封面高宽比1.15、cover | 无columns字段；row description/tag不展示；title空不添加默认区块标题；视频无封面留空 |
| app-collection | title、columns/font_size/icon_size/show_title/show_sub_title/image_fit；styles.item_padding/item_radius/item_min_height/icon_color；row image/icon/title/description/link | 1–5列入口，图标32–160rpx；图片cover/contain；真实应用源 | 新增item_background/description_color/styles.color被两端消费；来源品牌图片优先，不能强行替换 |
| creation-entry-grid | 同上；ai_tools或手工入口 | 同上；14类finite glyph带label/tags | show_title指row标题，不是区块title；show_sub_title指row说明；未知token不作图像URL |
| recent-tasks | title、source recent_tasks、row image/title/description/link | 固定紧凑列表，图84rpx方形 | 不显示任务专属进度/成本组件；通用row只显示可用文字，没有任务状态机专用呈现 |
| media-card | layout/columns/show_title/show_sub_title/image_fit/image_height/image_width/list_scroll/font_size/sub_font_size/font_weight；row image/title/description/link | 复用showcase single/grid/double/scroll；cover或contain | image_height为0–1200rpx，正值使两端图片高度一致；0/未配置保留共享4:3/公共210rpx；通用tag不展示 |
| user-hero | user_profile source；通用row title/image/description | 当前通用紧凑列表，不是特别的hero布局 | 专属用户字段（昵称/avatar等）必须由源提供可用标准row，否则不自动映射；无真实profile编辑能力 |
| membership-card | source title/expire_time/action_text、content.link | 专门会员权益卡；公共状态文案/回跳 | 不能通过通用data任意改会员权益事实；只展示/导航；字段超出默认row契约需要源适配说明 |
| commerce-entries | row key/title/sub_title/image/icon/link；白字购买卡 | 图片aspectFit；默认icon为literal符号 | 命名glyph不消费，不能把14入口glyph直接推荐给该icon槽 |
| user-stats | source rows，固定4列通用row | 方形缩略图/标题/description | 不会自动渲染profile对象的任意数值；需实际source标准rows；无columns/font参数 |
| account-quota | source rows，紧凑通用row | 方形缩略图/标题/description | 不会自动把任意account_summary键转指标；不改变余额/隐私事实 |
| asset-entries | user_assets rows，固定4列；整行空态 | 方形缩略图/标题/description | 无入口columns/font设置；无素材库操作按钮/状态机；游客空源保留合法空态 |
| service-grid | columns/font_size/icon_size/show_title/show_sub_title/image_fit；styles.item_padding/item_radius/item_min_height/icon_color；row image/icon/title/description/link | 与creation-entry相同；合法服务链接 | 新内卡/文字样式被两端消费；content无title默认，公共仍保留历史常用服务标题 |

## 已确认的能力缺口清单与导出建议

1. 全部带 `field_map` 的组件：unsupported，不推荐写入映射。
2. `notice.icon/icon_mode/data_source`、`news.show_click/styles.title_color/styles.text_color`、`image-hotspot.mode/fit`、`divider.height`、`video-player.title/aspect_ratio`、`audio-player.cover`、`popup-promo.trigger/delay/closeable`：当前允许但未消费。公共audio.autoplay、notice.font_weight也是端差异。
3. `search.show_hotword/show_button`、`fixed-search.fixed_position`、`title-bar.link`：允许但无对应完整控制路径。
4. 部分内卡背景/控件accent仍有固定色；文字主色/说明色已由统一widget tokens消费。button-group/commerce-entries字面icon、magic-grid把未声明icon当图像：不能混同已修入口的能力。
5. 通用source allowed_keys过宽，播放器/容器/公告等字段绑定不能自动把数据映射为专属内容。Agent应从本组件的实际imageslot/row消费者选择源。
6. 合法参数有条件才适用：列数只用于grid/double；图片与icon槽优先级；show开关只作用row文本；样式透明度只影响背景。建议把以上支持/partial/unsupported和理由加入动态contract能力指南，而不是依据字段存在性生成“全面支持”的帮助。

## 下一步验收边界

本slice完成实际入口/媒体能力断点；整页审美、46组件完整参数知识、素材语义匹配与生图仍需要后台动态full contract/素材目录支持，并由父任务进行真实375/390 H5验收。不得把固定测试页面布局当成生成能力。

第二slice补充：common styles.color通过统一 `--widget-text-color/--widget-muted-color` 供共享文字、公共generic/media及直接legacy新闻/列表使用。颜色是否配置用不可序列化的Symbol渲染元数据保留，经过Vue代理/重复normalizer仍保留旧缺字段fallback，JSON/storage/factory不增字段。专属用户信息组件已读取自身styles.color；交互按钮刻意保留白底黑字对比。内部背景与accent不是全部继承，以上partial边界仍有效。动态contract新增只读runtime_notes承载各组件unsupported/partial事实，不是新增持久化字段。

入口内卡尺寸仅creation-entry-grid/service-grid/app-collection消费：item_padding与item_radius为0–120rpx，未配置保留shared8px/8px和public14rpx/12rpx；item_min_height为0–800rpx，0自然内容高度。icon_color仅有限named glyph，hex/rgb/rgba安全色；空继承文字颜色，不给图片/emoji染色，不改变入口文字。所有新增字段只在显式编辑时写入，不改变46组件factory默认快照。

轮播有图文案通过show_caption显式0隐藏、1开启，两端未配置分别保留shared有caption/public无caption，纯文字主视觉不受此开关影响。media-card专属layout=list使卡内左图右文，image_width为0–600rpx（0用160rpx且上限45%卡宽），list_scroll为0/1，0外部纵排，1外部横滑、卡宽72%容器；这与scroll模式的上图下文不同，不能扩散到image-showcase。预览页背景层跟随整页内容高度，不再止于568px；导航、视频、浮动组件保留原控制路径。

media-card行文字：font_size枚举0或10–32px，sub_font_size枚举0或10–24px，font_weight枚举0/400/500/600/700/800；正值字号是逻辑px。0/未配置保留共享13/11px与原CSS字重级联（不新增字重覆盖），公开26/22rpx与继承字重。仅media-card消费，image-showcase与factory快照不变，不使用styles.font_size伪称支持。


媒体卡片新增可选槽位参数（不加入factory默认）：`content.image_max_width`为0–1500rpx，仅非list图片槽消费，正值取不超过父卡宽的最大宽度并居中，0/缺省保留100%；list继续使用原image_width。`styles.image_background`只改该图片槽的底色，支持transparent/3、4、6、8位十六进制/rgb/rgba（RGB整数0–255、alpha0–1，可写.5或0.5；不支持named色或hsl），空/缺省保留旧softsurface，图片URL保留；不接受URL、渐变或CSS变量。`content.text_align`可选空/left/center/right，只对该卡的每条标题与说明生效，不改变外层标题、source、链接或整卡点击。图片展播和其它组件忽略这些字段；缺省不增加新的CSS声明。

媒体list内部图文距离：`content.image_text_gap`可选0–240rpx，仅media-card的list行消费；正值设置图片与copy之间gap，0/缺省保留共享12px/公开24rpx，非list与其它组件忽略。它不改变styles.item_gap、列表卡之间的距离、source rows或整卡点击；factory默认不新增该字段。

横滑可选`content.bleed_end`枚举0/1：开启仅将自身横滑viewport按自身实际水平padding向右延伸至自身border内边界；内部布局行仍保持原内容宽，因此旧78%卡宽、显式item_width、起点与gap不变。0/缺省保留原DOM/CSS；不越过自身margin/border、不传给嵌套子容器、非横滑忽略。grid和horizontal-scroll的合法显式gap=0消费为0；absent/null/invalid保留8rpx fallback，既有factory横滑gap10不变，其它container fallback未调整。

### 应用源图形与游客预览

`app-collection.content.source_graphics` 是可选、最多50项的展示覆盖列表，缺省不写入factory或编辑器被动保存。记录仅有真实 `app_code`、`entry_key`、`mode`（`source`/`icon`/`image`）、有限14类 `icon`、授权 `image`；没有名称、链接、权限或状态覆盖。仅匹配当前 `app_entries` 实际源行，重复tuple首项优先，不要重复添加；不匹配/卸载、手工数据、其它组件忽略。`source`沿用原图形，`icon`优先于源行旧图片，`image`仅显示该项授权图片，未知/空图形回退原图形。`content.source_graphics.N.image` 是声明的图片leaf，仍通过managed refs、真实来源授权、生成槽和重新验收；不是任意field_map，也不改变源行或原URL。

只读候选预览显式使用游客 `login_status=guest`，逐层消费单条 `operator:eq` 的登录可见性（root `visibility` 优先于 `content.visibility`）。编辑画布保持可编辑。复杂旧规则在预览保持原显示，不伪造会员/路径/分桶或登录数据；实际公开端全部可见性及数据权限仍由服务器按真实用户判断，预览不证明登录或权限通过。

新列表手工选图使用租户素材记录的 `id` 与稳定 `uri`，不保存临时 `url`。原MaterialPicker的v-model/change不变，新增可选picked-items身份事件；该表单以一次带页面/组件上下文的事件同时提交image与fileclaim，由服务端正常保存权威校验。root refs仅声明`kind:file/id/expected_value`，不是客户端授权。删除/重排只迁移相同tuple与原image未改的既有proof，改图/移除清除旧proof；保留同URI的既有slot身份。素材选择器的可选预览resolver消费后端精确签名map；新选ADMIN素材的url仅在页面/组件上下文校验后补入当前内存预览map，不进入rawpayload、hash或ref，切页/新读取时替换。不改变稳定模型值或文件身份。

显式字号的跨宿主排版：`title-bar` 的主副字号大于0时使用共享1.5行高；`media-card` 同样绑定1.5行高，显式主副字号分别使用7px/3px文字上距。预览与公共渲染共同消费 `mobileTitleTypography` / `mobileMediaTypography` 的CSS变量，避免后台preflight和H5 normal字框累积偏移。未设置/0字号仍保留各端旧行高及间距，图片展播等非媒体卡不注入这些变量；全局字体与主题不变。
