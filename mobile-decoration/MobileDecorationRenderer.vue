<template>
    <div
        class="mobile-decoration-renderer"
        :class="{ 'is-edit': mode === 'edit', 'is-dark': isDark, 'is-floating-only-editor': isFloatingOnlyEditor }"
        :style="rendererStyle"
    >
        <template v-for="(widget, index) in renderWidgets" :key="widget.id || `${widget.name}-${index}`">
            <section v-if="widget.name === 'search' || widget.name === 'fixed-search'" class="mobile-widget mobile-search" :style="{ ...blockStyle(widget), height: `${Number(widget.content.height || 35)}px` }">
                <span>{{ widget.content.placeholder || '搜索' }}</span>
            </section>

            <section v-else-if="widget.name === 'banner' || widget.name === 'carousel-search'" class="mobile-widget mobile-banner" :class="{ 'mobile-banner--search': widget.name === 'carousel-search' }" :style="{ ...blockStyle(widget), '--banner-height': `${Math.max(120, Number(widget.content.image_height || 340)) / 2}px` }">
                <div class="mobile-banner__track">
                    <a
                        v-for="(item, bannerIndex) in visibleRows(widget)"
                        :key="item.id || bannerIndex"
                        class="mobile-banner__item"
                        :class="{ active: bannerIndex === carouselIndex(widget), 'is-text': widget.name === 'banner' && !rowImage(item) }"
                        :style="widget.name === 'banner' ? bannerItemStyle(widget, item) : mediaStyle(rowImage(item))"
                        :href="mode === 'view' ? linkHref(item.link) : undefined"
                        @click="handleLinkClick($event, item.link)"
                    >
                        <div v-if="widget.name === 'carousel-search' && widget.content.show_search !== 0" class="mobile-banner__search">{{ widget.content.placeholder || '搜索 AI 工具' }}</div>
                        <div v-else-if="widget.name === 'banner' && !rowImage(item)" class="mobile-banner__copy">
                            <strong>{{ item.title || item.name || '轮播图' }}</strong>
                            <small v-if="item.description || item.sub_title">{{ item.description || item.sub_title }}</small>
                        </div>
                        <strong v-else-if="widget.name !== 'banner' || Number(widget.content.show_caption) !== 0">{{ item.name || item.title || '轮播图' }}</strong>
                    </a>
                </div>
                <div v-if="(widget.content.show_indicator !== 0 || widget.name === 'carousel-search') && visibleRows(widget).length > 1" class="mobile-banner__dots" :style="widget.content.indicator_bottom !== undefined ? { bottom: `${Math.max(0, Number(widget.content.indicator_bottom) || 0) / 2}px` } : undefined">
                    <i v-for="(_, dotIndex) in visibleRows(widget)" :key="dotIndex" :class="{ active: dotIndex === carouselIndex(widget) }"></i>
                </div>
            </section>

            <section v-else-if="widget.name === 'nav'" class="mobile-widget mobile-nav" :style="{ ...blockStyle(widget), '--nav-columns': Math.max(1, Number(widget.content.per_line || 5)) }">
                <div v-for="(item, navIndex) in visibleRows(widget).slice(0, Number(widget.content.per_line || 5) * Number(widget.content.show_line || 2))" :key="navIndex">
                    <span class="mobile-nav__icon" :style="mediaStyle(item.image)"></span>
                    <em>{{ item.name || item.title || '导航' }}</em>
                </div>
            </section>

            <section v-else-if="widget.name === 'news'" class="mobile-widget mobile-news" :style="blockStyle(widget)">
                <div class="mobile-news__title">{{ widget.content.title || '最新资讯' }}</div>
                <div v-for="(item, rowIndex) in visibleRows(widget).slice(0, Number(widget.content.limit || 3))" :key="rowIndex" class="mobile-news__row">
                    <span v-if="widget.content.show_image !== 0 && rowImage(item)" class="mobile-news__image" :style="mediaStyle(rowImage(item))"></span>
                    <div class="mobile-news__copy">
                        <strong>{{ item.title || item.name || '资讯标题' }}</strong>
                        <em v-if="widget.content.show_desc !== 0 && (item.desc || item.abstract || item.description)">{{ item.desc || item.abstract || item.description }}</em>
                    </div>
                    <small v-if="widget.content.show_time !== 0">{{ item.create_time || item.time || '' }}</small>
                </div>
                <div v-if="!visibleRows(widget).length" class="mobile-news__empty">暂无资讯</div>
            </section>

            <section v-else-if="widget.name === 'middle-banner'" class="mobile-widget mobile-middle-banner" :style="blockStyle(widget)">
                <span
                    v-for="(item, bannerIndex) in visibleRows(widget).slice(0, 1)"
                    :key="bannerIndex"
                    :style="mediaStyle(rowImage(item) || widget.content.image)"
                ></span>
            </section>

            <section v-else-if="widget.name === 'title-bar'" class="mobile-widget mobile-title" :class="{ 'has-more': widget.content.more_text && linkHref(widget.content.link) }" :style="{ ...blockStyle(widget), ...mobileTitleTypography(widget.content) }">
                <strong :class="`is-${widget.content.align || 'left'}`">{{ widget.content.title || '标题' }}</strong>
                <a v-if="widget.content.more_text && linkHref(widget.content.link)" class="mobile-title__more" :href="mode === 'view' ? linkHref(widget.content.link) : undefined" @click="handleLinkClick($event, widget.content.link)">{{ widget.content.more_text }} ›</a>
                <small v-if="widget.content.sub_title" :class="`is-${widget.content.align || 'left'}`">{{ widget.content.sub_title }}</small>
            </section>

            <section v-else-if="widget.name === 'notice'" class="mobile-widget mobile-notice" :style="{ ...blockStyle(widget), fontSize: mobileNoticeFontCss(widget.content, 'px'), fontWeight: widget.content.font_weight === 1 ? 700 : 400 }">
                <span></span>
                <em>{{ widget.content.text || '公告内容' }}</em>
            </section>

            <section v-else-if="widget.name === 'list-nav'" class="mobile-widget mobile-list-nav" :style="blockStyle(widget)">
                <div v-for="(item, rowIndex) in visibleRows(widget)" :key="rowIndex">
                    <span v-if="item.image" :style="mediaStyle(item.image)"></span>
                    <strong>{{ item.name || item.title || '列表导航' }}</strong>
                    <i></i>
                </div>
            </section>

            <section
                v-else-if="widget.name === 'image-hotspot'"
                class="mobile-widget mobile-hotspot"
                :style="blockStyle(widget)"
            >
                <HotspotImage :content="widget.content" :image="resolveImage(widget.content.image)" :mode="mode"
                    @action="handleHotspotAction" />
            </section>

            <section v-else-if="widget.name === 'divider'" class="mobile-widget mobile-divider" :style="blockStyle(widget)">
                <span :style="{ borderTopStyle: widget.content.style || 'solid' }"></span>
            </section>

            <section v-else-if="widget.name === 'user-info'" class="mobile-widget mobile-user" :style="blockStyle(widget)">
                <span></span>
                <div>
                    <strong>用户昵称</strong>
                    <small>个人中心</small>
                </div>
            </section>

            <section v-else-if="widget.name === 'my-service'" class="mobile-widget mobile-services" :class="{ 'is-list': Number(widget.content.style || 1) === 2 }" :style="blockStyle(widget)">
                <strong>{{ widget.content.title || '我的服务' }}</strong>
                <div class="mobile-services__grid" :style="{ '--service-columns': Math.max(1, Number(widget.content.per_line || 4)) }">
                    <div v-for="(item, rowIndex) in visibleRows(widget)" :key="rowIndex">
                        <span :style="mediaStyle(item.image)"></span>
                        <em>{{ item.name || item.title || '服务' }}</em>
                    </div>
                </div>
            </section>

            <section v-else-if="widget.name === 'user-banner'" class="mobile-widget mobile-user-banner" :style="blockStyle(widget)">
                <div v-for="(item, rowIndex) in visibleRows(widget).slice(0, 1)" :key="rowIndex" :style="mediaStyle(rowImage(item))">
                    <strong v-if="item.name || item.title">{{ item.name || item.title }}</strong>
                </div>
            </section>

            <section v-else-if="widget.name === 'customer-service'" class="mobile-widget mobile-service" :style="blockStyle(widget)">
                {{ widget.content.title || '客服设置' }}
            </section>

            <section
                v-else-if="widget.name === 'floating-action'"
                class="mobile-floating-actions"
                :class="`is-${widget.content.position || 'right-bottom'}`"
                :style="floatingActionsStyle(widget)"
            >
                <a
                    v-for="(action, actionIndex) in floatingActions(widget)"
                    :key="action.id || `${action.type}-${actionIndex}`"
                    class="mobile-floating-actions__item"
                    :class="[`is-${action.type || 'link'}`, { 'is-image': !!floatingActionImage(action) }]"
                    :href="floatingActionHref(action)"
                    @click="handleFloatingActionClick($event, action)"
                ><img v-if="floatingActionImage(action)" class="mobile-floating-actions__image" :src="floatingActionImage(action)" alt="" /><span v-else-if="floatingActionIcon(action)" class="mobile-floating-actions__icon">{{ floatingActionIcon(action) }}</span><span v-if="floatingActionText(action)" class="mobile-floating-actions__label">{{ floatingActionText(action) }}</span></a>
            </section>

            <section
                v-else-if="isContainer(widget)"
                class="mobile-widget mobile-container"
                :class="[`mobile-container--${widget.name}`, { 'has-item-width': !!mobileHorizontalItemWidth(widget, 'px') }]"
                :style="containerStyle(widget)"
            >
                <div v-if="horizontalBleed(widget).viewport.width" class="mobile-horizontal-viewport" :style="horizontalBleed(widget).viewport">
                    <MobileDecorationRenderer
                        :style="{ ...horizontalBleed(widget).row, '--horizontal-item-width': mobileHorizontalItemWidth(widget, 'px') }"
                        :widgets="widget.children || []"
                        :parent-grid-columns="0"
                        :mode="mode"
                        :visibility-context="visibilityContext"
                        :resolved-sources="resolvedSources"
                        :adapters="adapters"
                        :is-dark="isDark"
                        :mobile-style="mobileStyle"
                    />
                </div>
                <MobileDecorationRenderer
                    v-else
                    :style="{ '--horizontal-item-width': mobileHorizontalItemWidth(widget, 'px') }"
                    :widgets="widget.children || []"
                    :parent-grid-columns="widget.name === 'grid' ? mobileGridColumns(widget.content) : 0"
                    :mode="mode"
                    :visibility-context="visibilityContext"
                    :resolved-sources="resolvedSources"
                    :adapters="adapters"
                    :is-dark="isDark"
                    :mobile-style="mobileStyle"
                />
                <div v-if="mode === 'edit' && !(widget.children || []).length" class="mobile-container__empty">拖入组件</div>
            </section>

            <section
                v-else-if="isGenericWidget(widget)"
                class="mobile-widget mobile-generic"
                :class="`mobile-generic--${widget.name}`"
                :style="blockStyle(widget)"
            >
                <template v-if="widget.name === 'spacer'">
                    <div :style="{ height: `${Math.max(8, Number(widget.content.height || 24)) / 2}px` }"></div>
                </template>
                <template v-else-if="widget.name === 'rich-text'">
                    <div class="mobile-generic__rich" v-html="resolveMobileRichText(widget.content)"></div>
                </template>
                <template v-else-if="widget.name === 'membership-card'">
                    <a class="mobile-commerce-member" :href="mode === 'view' ? linkHref(widget.content.link) : undefined" @click="handleLinkClick($event, widget.content.link)">
                        <span><small>会员权益</small><strong>{{ visibleRows(widget)[0]?.title || '开通会员' }}</strong><small>{{ visibleRows(widget)[0]?.expire_time || '解锁会员应用与专属权益' }}</small></span>
                        <b>{{ visibleRows(widget)[0]?.action_text || '立即开通' }}</b>
                    </a>
                </template>
                <template v-else-if="widget.name === 'commerce-entries'">
                    <div class="mobile-commerce-grid">
                        <a v-for="(item, index) in commerceRows(widget)" :key="item.key || index" :href="mode === 'view' ? linkHref(item.link) : undefined" @click="handleLinkClick($event, item.link)">
                            <span><strong>{{ item.title }}</strong><small>{{ item.sub_title }}</small></span>
                            <b><img v-if="item.image" :src="resolveImage(item.image)" alt="" /><template v-else>{{ item.icon || '↗' }}</template></b>
                        </a>
                    </div>
                </template>
                <template v-else-if="widget.name === 'button-group'">
                    <div
                        class="mobile-button-group"
                        :class="{
                            'is-scroll': buttonGroupDisplayStyle(widget) === 'scroll',
                            'is-page': buttonGroupDisplayStyle(widget) === 'page'
                        }"
                        :style="buttonGroupStyle(widget)"
                    >
                        <a
                            v-for="(item, rowIndex) in buttonGroupRows(widget)"
                            :key="item.id || rowIndex"
                            class="mobile-button-group__button"
                            :class="`is-${widget.content.button_shape || 'rounded'}`"
                            :style="buttonGroupItemStyle(widget, item)"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span
                                v-if="buttonGroupShowsGraphic(widget)"
                                class="mobile-button-group__graphic"
                                :class="{ 'is-icon': widget.content.button_type === 'icon', 'is-placeholder': widget.content.button_type !== 'icon' && !item.image }"
                                :style="widget.content.button_type === 'icon' ? undefined : mediaStyle(item.image)"
                            >{{ widget.content.button_type === 'icon' ? (item.icon || '●') : '' }}</span>
                            <em
                                v-if="Number(item.tag_enabled) === 1 && item.tag"
                                class="mobile-button-group__tag"
                                :style="{ color: item.tag_color || '#ffffff', background: item.tag_background || '#f83287' }"
                            >{{ item.tag }}</em>
                            <strong v-if="buttonGroupShowsText(widget)">{{ item.title || item.name || `按钮${rowIndex + 1}` }}</strong>
                        </a>
                    </div>
                </template>
                <template v-else-if="widget.name === 'image-nav'">
                    <div class="mobile-image-nav" :style="{ '--image-nav-columns': Math.max(1, Number(widget.content.per_line || 4)) }">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget).slice(0, Number(widget.content.per_line || 4) * Number(widget.content.show_line || 99))"
                            :key="item.id || rowIndex"
                            class="mobile-image-nav__item"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span class="mobile-image-nav__image" :style="{ ...mediaStyle(rowImage(item)), backgroundSize: mobileImageFit(widget.content), backgroundRepeat: 'no-repeat' }"></span>
                            <strong v-if="widget.content.show_title !== 0">{{ item.title || item.name || '导航' }}</strong>
                            <small v-if="widget.content.show_sub_title === 1 && (item.sub_title || item.desc)">{{ item.sub_title || item.desc }}</small>
                        </a>
                    </div>
                </template>
                <template v-else-if="['image-showcase', 'media-card'].includes(widget.name)">
                    <div class="mobile-image-showcase" :class="[`is-${widget.content.layout || 'double'}`, { 'is-media-list': widget.name === 'media-card' && widget.content.layout === 'list', 'is-media-list-scroll': widget.name === 'media-card' && widget.content.layout === 'list' && Number(widget.content.list_scroll) === 1 }]" :style="{ '--image-showcase-columns': Math.max(1, Number(widget.content.columns || 2)), ...mobileMediaListStyle(widget, 'px'), ...mobileMediaTypography(widget) }">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget)"
                            :key="item.id || rowIndex"
                            class="mobile-image-showcase__item"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span class="mobile-image-showcase__image" :style="{ ...mediaStyle(rowImage(item)), backgroundSize: mobileImageFit(widget.content), backgroundRepeat: 'no-repeat', ...mobileMediaImageStyle(widget, 'px', !!rowImage(item)) }"></span>
                            <div class="mobile-image-showcase__copy" :style="mobileMediaCopyStyle(widget)"><strong v-if="widget.content.show_title !== 0" :style="mobileMediaTypography(widget)['--media-title-font-weight'] ? { fontWeight: 'var(--media-title-font-weight)' } : undefined">{{ item.title || item.name || '图片标题' }}</strong>
                            <small v-if="widget.content.show_sub_title !== 0 && (item.sub_title || item.desc || item.description)">{{ mobileRowDescription(item) }}</small></div>
                        </a>
                        <div v-if="!visibleRows(widget).length" class="mobile-generic__empty">暂无图片内容</div>
                    </div>
                </template>
                <template v-else-if="widget.name === 'magic-grid'">
                    <div v-if="hasMagicGridLayout(widget)" class="mobile-magic-grid mobile-magic-grid--layout" :style="magicGridStyle(widget)">
                        <a
                            v-for="(item, rowIndex) in magicGridRows(widget)"
                            :key="item.id || rowIndex"
                            class="mobile-magic-grid__item"
                            :style="magicGridLayoutItemStyle(widget, item)"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span class="mobile-magic-grid__image" :style="magicGridImageStyle(item)"></span>
                            <strong v-if="item.title || item.name">{{ item.title || item.name }}</strong>
                            <small v-if="item.sub_title || item.desc">{{ item.sub_title || item.desc }}</small>
                        </a>
                    </div>
                    <div v-else class="mobile-magic-grid">
                        <a
                            v-for="(item, rowIndex) in magicGridItems(widget)"
                            :key="item.id || rowIndex"
                            class="mobile-magic-grid__item"
                            :style="magicGridItemStyle(widget, item)"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span class="mobile-magic-grid__image" :style="magicGridImageStyle(item)"></span>
                            <strong>{{ item.title || item.name || '宫格内容' }}</strong>
                            <small v-if="item.sub_title || item.desc">{{ item.sub_title || item.desc }}</small>
                        </a>
                        <div v-if="mode === 'edit' && !magicGridItems(widget).length" class="mobile-generic__empty">暂无宫格内容</div>
                    </div>
                </template>
                <template v-else-if="widget.name === 'tutorial-carousel'">
                    <div class="mobile-tutorial-carousel">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget)"
                            :key="item.id || rowIndex"
                            class="mobile-tutorial-carousel__item"
                            :style="{ flex: `0 0 ${tutorialCardWidth(widget)}px` }"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleLinkClick($event, item.link)"
                        >
                            <span class="mobile-tutorial-carousel__image" :style="mediaStyle(rowImage(item))"></span>
                            <strong>{{ item.title || item.name || '创作教程' }}</strong>
                            <small v-if="widget.content.show_sub_title !== 0">{{ item.sub_title || item.desc || '' }}</small>
                            <em v-if="widget.content.show_tag !== 0 && item.tag">{{ item.tag }}</em>
                        </a>
                        <div v-if="!visibleRows(widget).length" class="mobile-generic__empty">暂无教程内容</div>
                    </div>
                </template>
                <template v-else-if="widget.name === 'user-hero' && widget.content.layout === 'profile'">
                    <div class="mobile-profile">
                        <a class="mobile-profile__identity" :href="mode === 'view' ? linkHref(profileFor(widget) ? widget.content.link : mobileProfileLink(widget.content, 'login_link')) : undefined" @click="handleLinkClick($event, profileFor(widget) ? widget.content.link : mobileProfileLink(widget.content, 'login_link'))">
                            <img v-if="profileAvatar(widget)" class="mobile-profile__avatar" :src="profileAvatar(widget)" alt="" />
                            <span v-else class="mobile-profile__avatar mobile-profile__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path :d="MOBILE_ICON_PATHS.account" /></svg></span>
                            <strong>{{ mobileProfileName(profileFor(widget), widget.content) }}</strong>
                        </a>
                        <a class="mobile-profile__bind" :href="mode === 'view' ? linkHref(profileFor(widget) ? mobileProfileLink(widget.content, 'bind_link') : mobileProfileLink(widget.content, 'login_link')) : undefined" @click="handleLinkClick($event, profileFor(widget) ? mobileProfileLink(widget.content, 'bind_link') : mobileProfileLink(widget.content, 'login_link'))">{{ mobileProfileMobile(profileFor(widget), widget.content) }}</a>
                        <a class="mobile-profile__settings" aria-label="设置" :href="mode === 'view' ? linkHref(mobileProfileLink(widget.content, 'settings_link')) : undefined" @click="handleLinkClick($event, mobileProfileLink(widget.content, 'settings_link'))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path :d="MOBILE_ICON_PATHS.setting" /></svg></a>
                    </div>
                </template>
                <template v-else-if="widget.name === 'user-stats' && widget.content.layout === 'assets'">
                    <div class="mobile-assets__heading"><strong>{{ widget.content.title || '我的资产' }}</strong><a :href="mode === 'view' ? linkHref(widget.content.detail_link) : undefined" @click="handleLinkClick($event, widget.content.detail_link)">{{ widget.content.detail_label || '资产明细' }} ›</a></div>
                    <div class="mobile-assets__stats"><a v-for="stat in mobileProfileStatRows(profileFor(widget), widget.content)" :key="stat.key" :href="mode === 'view' ? linkHref(stat.link) : undefined" @click="handleLinkClick($event, stat.link)"><strong>{{ stat.value }}</strong><small>{{ stat.label }}</small></a></div>
                </template>
                <template v-else-if="widget.name === 'asset-entries' && widget.content.layout === 'gallery'">
                    <div v-if="Number(widget.content.show_title) !== 0 && widget.content.title" class="mobile-generic__title">{{ widget.content.title }}</div>
                    <div v-if="visibleRows(widget).length" class="mobile-gallery">
                        <a v-for="(item, rowIndex) in visibleRows(widget).slice(0, genericLimit(widget))" :key="item.id || rowIndex" :href="mode === 'view' ? linkHref(item.link || item.path) : undefined" @click="handleLinkClick($event, item.link || item.path)"><img v-if="rowImage(item)" :src="resolveImage(rowImage(item))" alt="" /><strong>{{ item.title || item.name || '' }}</strong></a>
                    </div>
                    <div v-else class="mobile-gallery__empty">
                        <img v-if="widget.content.empty_image" :src="resolveImage(widget.content.empty_image)" alt="" />
                        <small>{{ widget.content.empty_text || '暂无作品' }}</small>
                        <a v-if="widget.content.empty_action_name" :href="mode === 'view' ? linkHref(widget.content.empty_action_link) : undefined" @click="handleLinkClick($event, widget.content.empty_action_link)">{{ widget.content.empty_action_name }}</a>
                    </div>
                </template>
                <template v-else-if="widget.name === 'case-feed' && widget.content.layout === 'masonry'">
                    <div v-if="widget.content.title" class="mobile-generic__title">{{ widget.content.title }}</div>
                    <div class="mobile-case-masonry">
                        <div v-for="(column, columnIndex) in mobileMasonryColumns(visibleRows(widget).slice(0, genericLimit(widget)))" :key="columnIndex" class="mobile-case-masonry__column">
                            <a v-for="(item, rowIndex) in column" :key="item.id || rowIndex" class="mobile-case-masonry__item" :href="mode === 'view' ? linkHref(item.link || item.path) : undefined" @click="handleLinkClick($event, item.link || item.path)">
                                <img v-if="rowImage(item) || item.url" :src="resolveImage(rowImage(item) || item.url)" alt="" />
                                <div class="mobile-case-masonry__copy"><strong>{{ item.title || item.name || '案例' }}</strong><small v-if="item.model_name || item.meta">{{ mobileCaseMeta(item) }}</small><span v-if="caseHeart(widget, item)" class="mobile-case-masonry__heart">喜欢 {{ caseHeart(widget, item) }}</span></div>
                            </a>
                        </div>
                    </div>
                    <div v-if="!visibleRows(widget).length" class="mobile-generic__empty">暂无案例</div>
                </template>
                <template v-else-if="widget.name === 'case-feed'">
                    <div v-if="widget.content.title" class="mobile-generic__title">{{ widget.content.title }}</div>
                    <div class="mobile-case-feed">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget).slice(0, genericLimit(widget))"
                            :key="item.id || rowIndex"
                            class="mobile-case-feed__item"
                            :href="mode === 'view' ? linkHref(item.link || item.path) : undefined"
                            @click="handleLinkClick($event, item.link || item.path)"
                        ><span :style="mediaStyle(rowImage(item) || item.url)"></span><strong>{{ item.title || item.name || '案例' }}</strong></a>
                    </div>
                </template>
                <template v-else-if="widget.name === 'floating-action'">
                    <a class="mobile-generic__floating" :href="mode === 'view' ? linkHref(widget.content.link) : undefined" @click="handleLinkClick($event, widget.content.link)">{{ widget.content.title || '操作' }}</a>
                </template>
                <template v-else-if="widget.name === 'popup-promo'">
                    <a class="mobile-generic__promo" :style="mediaStyle(widget.content.image)" :href="mode === 'view' ? linkHref(widget.content.link) : undefined" @click="handleLinkClick($event, widget.content.link)"><strong>{{ widget.content.title || '活动推广' }}</strong><small>{{ widget.content.desc }}</small></a>
                </template>
                <template v-else-if="widget.name === 'video-player'">
                    <video class="mobile-generic__video" :src="resolveImage(widget.content.video_url)" :poster="resolveImage(widget.content.cover)" :controls="widget.content.show_controls !== 0" :autoplay="widget.content.autoplay === 1" playsinline></video>
                </template>
                <template v-else-if="widget.name === 'audio-player'">
                    <div class="mobile-generic__audio"><strong>{{ widget.content.title || '音频播放' }}</strong><audio :src="resolveImage(widget.content.audio_url)" :autoplay="widget.content.autoplay === 1" :loop="widget.content.loop === 1" controls /></div>
                </template>
                <template v-else>
                    <div v-if="Number(widget.content.show_heading) !== 0 && (widget.content.title || genericTitle(widget))" class="mobile-generic__title">{{ widget.content.title || genericTitle(widget) }}</div>
                    <div v-if="widget.name === 'tabs'" class="mobile-generic__tabs" :class="{ 'is-underline': widget.content.variant === 'underline' }">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget)"
                            :key="item.id || rowIndex"
                            :class="{ active: tabActive(widget, item, rowIndex) }"
                            :href="mode === 'view' ? linkHref(item.link) : undefined"
                            @click="handleTabClick($event, widget, item)"
                        >{{ item.title || item.name || '标签' }}</a>
                    </div>
                    <div v-else class="mobile-generic__rows" :class="genericRowsClass(widget)" :style="isMobileEntryWidget(widget.name) ? mobileVisualStyle(widget, 'px') : undefined">
                        <a
                            v-for="(item, rowIndex) in visibleRows(widget).slice(0, genericLimit(widget))"
                            :key="item.id || rowIndex"
                            class="mobile-generic__row"
                            :href="mode === 'view' ? linkHref(item.link || item.path) : undefined"
                            @click="handleLinkClick($event, item.link || item.path)"
                        >
                            <span v-if="appRowGraphic(widget, item).image" class="mobile-generic__image" :style="mediaStyle(appRowGraphic(widget, item).image)"></span>
                            <span v-else-if="appRowGraphic(widget, item).name || appRowGraphic(widget, item).text" class="mobile-generic__image mobile-row-icon" :style="appRowGraphic(widget, item).name ? { color: mobileIconColor(widget.styles) } : undefined">
                                <svg v-if="appRowGraphic(widget, item).name" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="appRowGraphic(widget, item).path" /></svg>
                                <span v-else>{{ appRowGraphic(widget, item).text }}</span>
                            </span>
                            <span v-else class="mobile-generic__image mobile-generic__image--placeholder"></span>
                            <div class="mobile-generic__copy"><strong v-if="!isMobileEntryWidget(widget.name) || Number(widget.content.show_title) !== 0">{{ item.title || item.name || item.app_name || item.app_code || '内容标题' }}</strong><small v-if="(!isMobileEntryWidget(widget.name) || Number(widget.content.show_sub_title) !== 0) && mobileRowDescription(item)">{{ mobileRowDescription(item) }}</small></div>
                            <em v-if="item.tag">{{ item.tag }}</em>
                        </a>
                        <div v-if="!visibleRows(widget).length" class="mobile-generic__empty">{{ emptyText(widget) }}</div>
                    </div>
                </template>
            </section>

            <section v-else class="mobile-widget mobile-unknown" :style="blockStyle(widget)">
                {{ widget.title || widget.name }}
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, provide, reactive, onBeforeUnmount, onMounted, PropType, ref, watch } from 'vue'
import HotspotImage from './HotspotImage.vue'
import { MOBILE_DECORATION_FILTER_KEY, MOBILE_ICON_PATHS, mobileFilterKey, mobileFilterRows, mobileMasonryColumns, mobileProfileRow, mobileProfileName, mobileProfileLink, mobileCaseMeta, mobileProfileMobile, mobileProfileStatRows, mobileCaseHeartText } from './index'
import type { MobileDecorationFilters } from './index'

import { getDecorationSourceKey, isMobileEntryWidget,mobileButtonMeasurements, mobileContainerGapCss, mobileGridChildStyle, mobileGridColumns, mobileHorizontalBleedStyles, mobileHorizontalItemWidth, mobileIconColor,mobileImageFit, mobileMediaCopyStyle, mobileMediaImageStyle,mobileMediaListStyle,mobileMediaTypography,mobileNoticeFontCss, mobileRowDescription, mobileRowImage, mobileTextStyle,mobileTitleTypography,mobileVisualStyle } from './index'
import { mobileAppSourceGraphic, mobileLoginVisibilityPasses, colorWithOpacity, getMagicGridAreaStyle, getMagicGridImageStyle,getMagicGridLayout, getResolvedSource, isMagicGridContentVisible, mobileWidgetSurfaceColor, normalizeMobileDecorationWidgets, normalizeMobileWidgetStyles, resolveMobileRichText } from './index'

defineOptions({ name: 'MobileDecorationRenderer' })

const props = defineProps({
    widgets: {
        type: Array as PropType<any[]>,
        default: () => []
    },
    mode: {
        type: String as PropType<'view' | 'edit'>,
        default: 'view'
    },
    resolvedSources: {
        type: Object as PropType<Record<string, any>>,
        default: () => ({})
    },
    visibilityContext: { type: Object as PropType<Record<string, any> | null>, default: null },
    adapters: {
        type: Object as PropType<{
            resolveImage?: (value: any) => string
        }>,
        default: () => ({})
    },
    isDark: {
        type: Boolean,
        default: false
    },
    parentGridColumns: {
        type: Number,
        default: 0
    },
    mobileStyle: {
        type: Object as PropType<Record<string, any>>,
        default: () => ({})
    }
})

const pageFilters = inject<MobileDecorationFilters | null>(MOBILE_DECORATION_FILTER_KEY, null) || reactive<MobileDecorationFilters>({})
provide(MOBILE_DECORATION_FILTER_KEY, pageFilters)
const profileFor = (widget: any) => props.visibilityContext?.login_status === 'guest' ? null : mobileProfileRow(getResolvedSource(props.resolvedSources, { ...widget.content, source_key: 'user_profile', source_params: {} }))
const profileAvatar = (widget: any) => resolveImage(profileFor(widget)?.avatar || profileFor(widget)?.image || widget.content.default_avatar)
const caseHeart = (widget: any, row: any) => mobileCaseHeartText(row, widget.content.data_mode !== 'manual' && (getResolvedSource(props.resolvedSources, widget.content)?.items || []).includes(row))
const tabActive = (widget: any, row: any, index: number) => widget.content.filter_group && pageFilters[String(widget.content.filter_group)] !== undefined
    ? pageFilters[String(widget.content.filter_group)] === mobileFilterKey(row) : Number(widget.content.active || 0) === index
const handleTabClick = (event: MouseEvent, widget: any, row: any) => {
    if (widget.content.filter_group) { event.preventDefault(); pageFilters[String(widget.content.filter_group)] = mobileFilterKey(row); return }
    handleLinkClick(event, row.link)
}
const normalizedWidgets = computed(() => normalizeMobileDecorationWidgets(props.widgets))
watch(normalizedWidgets, (widgets) => {
    const visit = (items: any[]) => items.forEach(widget => {
        const group = String(widget.content?.filter_group || '')
        if (widget.name === 'tabs' && group && pageFilters[group] === undefined) pageFilters[group] = mobileFilterKey(visibleRows(widget)[Number(widget.content.active || 0)])
        if (Array.isArray(widget.children)) visit(widget.children)
    })
    visit(widgets)
}, { immediate: true })
const isFloatingOnlyEditor = computed(() =>
    props.mode === 'edit' &&
    normalizedWidgets.value.length === 1 &&
    normalizedWidgets.value[0]?.name === 'floating-action'
)
const rendererStyle = computed(() => {
    const style = props.mobileStyle || {}
    const accent = style.themeColor1 || '#2f80ed'
    const accentEnd = style.themeColor2 || accent
    const isDark = props.isDark
    return {
        '--mobile-accent': accent,
        '--mobile-accent-end': accentEnd,
        '--mobile-surface': isDark ? '#23262d' : '#ffffff',
        '--mobile-soft-surface': isDark ? '#2c3038' : '#f6f7f9',
        '--mobile-text': isDark ? '#eef0f4' : '#111111',
        '--mobile-regular-text': isDark ? '#d5d8df' : '#333333',
        '--mobile-muted-text': isDark ? '#a5aab5' : '#888888',
        '--mobile-border': isDark ? '#3a3f49' : '#f0f1f3',
        '--mobile-icon-surface': isDark ? '#303845' : '#eef2ff',
        '--mobile-notice-surface': isDark ? '#3b3422' : '#fff7e6',
        '--mobile-notice-text': isDark ? '#f2d28c' : '#8a5a00'
    }
})
const renderWidgets = computed(() =>
    normalizedWidgets.value.filter((item: any) => mobileLoginVisibilityPasses(item, props.visibilityContext) && (props.mode === 'edit' ||
        (item?.content?.enabled !== 0 && (item.name !== 'magic-grid' || magicGridItems(item).length > 0))))
)
const carouselIndexes = ref<Record<string, number>>({})
const carouselTimers = new Map<string, ReturnType<typeof setInterval>>()
const widgetKey = (widget: any, index = 0) => String(widget?.id || `${widget?.name || 'carousel'}-${index}`)
const carouselIndex = (widget: any) => carouselIndexes.value[widgetKey(widget)] || 0
const stopCarousel = (key: string) => {
    const timer = carouselTimers.get(key)
    if (timer) clearInterval(timer)
    carouselTimers.delete(key)
}
const startCarousel = (widget: any, index = 0) => {
    const key = widgetKey(widget, index)
    stopCarousel(key)
    const rows = visibleRows(widget)
    if (widget?.content?.autoplay === 0 || rows.length < 2) return
    const interval = Math.max(1, Number(widget?.content?.interval || 3)) * 1000
    carouselTimers.set(key, setInterval(() => {
        const current = carouselIndexes.value[key] || 0
        carouselIndexes.value[key] = (current + 1) % rows.length
    }, interval))
}
const syncCarousels = () => {
    renderWidgets.value.forEach((widget: any, index: number) => {
        if (['banner', 'carousel-search'].includes(widget?.name)) startCarousel(widget, index)
    })
}
onMounted(syncCarousels)
watch(renderWidgets, syncCarousels, { deep: true })
onBeforeUnmount(() => carouselTimers.forEach((_, key) => stopCarousel(key)))
const resolveImage = (value: any) => {
    const url = typeof value === 'object' && value !== null
        ? String(
            /^https?:\/\//i.test(String(value.url || '')) ? value.url
                : /^https?:\/\//i.test(String(value.uri || '')) ? value.uri
                    : value.url || value.uri || value.path || value.image || ''
        )
        : String(value || '')
    if (!url) return ''
    const assetUrls = props.resolvedSources?.__decoration_asset_urls
    if (assetUrls && Object.prototype.hasOwnProperty.call(assetUrls, url) && typeof assetUrls[url] === 'string') {
        return assetUrls[url]
    }
    if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url
    return props.adapters.resolveImage?.(url) || url
}
const appRowGraphic = (widget: any, row: any) => mobileAppSourceGraphic(widget, row, props.resolvedSources)
const rowImage = mobileRowImage
const bannerItemStyle = (widget: any, item: any) => ({
    ...(rowImage(item) ? mediaStyle(rowImage(item)) : { background: 'transparent', color: widget.styles?.color || 'var(--mobile-text)' }),
    ...(widget.content.border_radius !== undefined ? { borderRadius: `${Math.min(100, Math.max(0, Number(widget.content.border_radius) || 0)) / 2}px` } : {})
})
const mediaStyle = (value: any) => {
    const url = resolveImage(value)
    return url ? { backgroundImage: `url(${url})` } : {}
}
const linkHref = (link: any) => {
    if (typeof link === 'string') return link
    return String(link?.path || link?.url || '')
}
const handleLinkClick = (event: MouseEvent, link: any) => {
    if (props.mode === 'edit' || !linkHref(link)) event.preventDefault()
}
const handleHotspotAction = (area: Record<string, any>) => {
    if (area.type === 'back_top' && props.mode !== 'edit') window.scrollTo({ top: 0, behavior: 'smooth' })
}
const floatingActions = (widget: any) => visibleRows(widget).slice(0, 4)
const floatingActionText = (action: any) => {
    if (action?.show_text === '0' || action?.show_text === 0 || action?.show_text === false) return ''
    return String(action?.title ?? '').trim()
}
const floatingActionIcon = (action: any) => {
    const icon = String(action?.icon || 'auto')
    if (icon === 'none') return ''
    const type = icon === 'auto' ? String(action?.type || 'link') : icon
    return ({
        link: '↗',
        back_top: '↑',
        'arrow-up': '↑',
        customer_service: '◉',
        service: '◉',
        phone: '☎',
        home: '⌂',
        star: '★',
        message: '✉'
    } as Record<string, string>)[type] || '↗'
}
const floatingActionImage = (action: any) =>
    action?.icon_mode === 'image' && action?.icon_image ? resolveImage(action.icon_image) : ''
const floatingActionHref = (action: any) => {
    if (props.mode === 'edit') return undefined
    if (action?.type === 'phone' && action?.phone) return `tel:${action.phone}`
    return linkHref(action?.link) || undefined
}
const handleFloatingActionClick = (event: MouseEvent, action: any) => {
    if (props.mode === 'edit') {
        event.preventDefault()
        return
    }
    if (action?.type === 'back_top') {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    if (!floatingActionHref(action)) event.preventDefault()
}
const floatingActionsStyle = (widget: any) => {
    const content = widget?.content || {}
    const styles = normalizeMobileWidgetStyles(widget?.styles)
    const position = String(content.position || 'right-bottom')
    const isLeft = position.startsWith('left')
    const isCenter = position.endsWith('center')
    const offsetRight = Math.max(0, Number(content.offset_right ?? 20)) / 2
    const offsetBottom = Math.max(0, Number(content.offset_bottom ?? 72)) / 2
    const buttonSize = Math.min(80, Math.max(32, Number(content.button_size ?? 84) / 2))
    return {
        [isLeft ? 'left' : 'right']: `${offsetRight}px`,
        bottom: isCenter ? undefined : `${offsetBottom}px`,
        top: isCenter ? '50%' : undefined,
        transform: isCenter ? 'translateY(-50%)' : undefined,
        '--floating-background': colorWithOpacity(styles.background_gradient || styles.background_color || styles.background || '#2f80ed', styles.opacity),
        '--floating-color': styles.color || '#ffffff',
        '--floating-radius': content.button_shape === 'circle'
            ? '50%'
            : `${Math.max(12, Number(styles.border_radius || styles.radius_top || 24) / 2)}px`,
        '--floating-size': `${buttonSize}px`,
        '--floating-gap': `${Math.max(2, Number(content.button_gap ?? 16) / 2)}px`
    }
}
function visibleRows(widget: any) {
    const source = getResolvedSource(props.resolvedSources, widget?.content)
    const content = widget?.content || {}
    const manual = Array.isArray(content.data) ? content.data : []
    const fallback = Array.isArray(content.fallback_data) ? content.fallback_data : []
    const sourceRows = Array.isArray(source?.items) ? source.items : []
    const mode = content.data_mode === 'source' && !getDecorationSourceKey(content)
        ? 'manual'
        : content.data_mode
    const rows = mode === 'manual'
        ? (manual.length ? manual : fallback)
        : mode === 'source'
          ? sourceRows
          : (sourceRows.length ? sourceRows : (manual.length ? manual : fallback))
    const visible = rows.filter((item: any) => item?.is_show !== '0')
    return widget.name === 'case-feed' || (widget.name === 'asset-entries' && content.layout === 'gallery') ? mobileFilterRows(visible, content, pageFilters) : visible
}
const commerceRows = (widget: any) => visibleRows(widget).filter((item: any) =>
    item.key !== 'distribution' || Number((props.resolvedSources as any)?.__features?.distribution_enabled) === 1
)
const buttonGroupRows = (widget: any) => visibleRows(widget).slice(0, 30)
const buttonGroupDisplayStyle = (widget: any) => {
    const configured = String(widget?.content?.display_style || '')
    if (['fixed', 'scroll', 'page'].includes(configured)) return configured
    return widget?.content?.layout === 'scroll' ? 'scroll' : 'fixed'
}
const buttonGroupShowsGraphic = (widget: any) => !['text'].includes(String(widget?.content?.button_style || 'image_text'))
const buttonGroupShowsText = (widget: any) => !['image'].includes(String(widget?.content?.button_style || 'image_text'))
const buttonGroupStyle = (widget: any) => {
    const content = widget?.content || {}
    const styles = normalizeMobileWidgetStyles(widget?.styles)
    const columns = Math.max(1, Math.min(5, Number(content.columns) || 4))
    return {
        '--button-columns': columns,
        ...mobileButtonMeasurements(content, styles, 'px'),
        '--button-text-color': styles.color || '#333333'
    }
}
const buttonGroupItemStyle = (widget: any, item: any) => {
    const style = buttonGroupDisplayStyle(widget)
    const columns = Math.max(1, Math.min(5, Number(widget?.content?.columns) || 4))
    return {
        flexBasis: style === 'fixed' ? undefined : `calc(${100 / columns}% - var(--button-gap))`,
        fontWeight: Number(widget?.content?.font_weight) === 1 ? 700 : 400
    }
}
const magicGridImageStyle = (item: any) =>
    getMagicGridImageStyle(item, resolveImage(rowImage(item) || item.icon))
const magicGridItemStyle = (widget: any, item: any) => {
    const columns = Math.max(2, Number(widget?.content?.columns || 12))
    const span = Math.min(columns, Math.max(1, Number(item?.span || 6)))
    return { width: `calc(${(span / columns) * 100}% - 4px)` }
}
const hasMagicGridLayout = (widget: any) => {
    const rows = magicGridItems(widget)
    return rows.length > 0 && rows.every((item: any) => Number.isFinite(Number(item?.row)) && Number.isFinite(Number(item?.col)))
}
function magicGridItems(widget: any) {
    return props.mode === 'edit' ? visibleRows(widget) : visibleRows(widget).filter(isMagicGridContentVisible)
}
const magicGridRows = (widget: any) => magicGridItems(widget).filter((item: any) =>
    Number.isFinite(Number(item?.row)) && Number.isFinite(Number(item?.col))
)
const magicGridStyle = (widget: any) => {
    const layout = getMagicGridLayout(widget.content, magicGridRows(widget), props.mode === 'edit')
    return { paddingTop: `${layout.heightPercent}%`, '--magic-gap': `${Math.max(0, Number(widget?.content?.gap) || 0) / 2}px` }
}
const magicGridLayoutItemStyle = (widget: any, item: any) => {
    return getMagicGridAreaStyle(getMagicGridLayout(widget.content, magicGridRows(widget), props.mode === 'edit'), item)
}
const tutorialCardWidth = (widget: any) => {
    const configuredWidth = Number(widget?.content?.card_width)
    const width = Number.isFinite(configuredWidth) ? configuredWidth : 280
    return Math.max(180, Math.min(360, width)) / 2
}
const containerNames = new Set(['section', 'grid', 'stack', 'horizontal-scroll', 'masonry', 'card'])
const genericNames = new Set([
    'rich-text', 'spacer', 'button-group', 'tabs', 'floating-action', 'popup-promo',
    'image-nav', 'image-showcase', 'magic-grid', 'tutorial-carousel', 'case-feed', 'app-collection', 'cw-tool-collection',
    'creation-entry-grid', 'recent-tasks', 'media-card', 'user-hero', 'membership-card',
    'user-stats', 'account-quota', 'asset-entries', 'service-grid', 'commerce-entries', 'audio-player', 'video-player'
])
const isContainer = (widget: any) => containerNames.has(String(widget?.name || ''))
const isGenericWidget = (widget: any) => genericNames.has(String(widget?.name || ''))
const genericTitle = (widget: any) => ({
    'button-group': '快捷操作',
    'image-nav': '功能导航',
    'magic-grid': '推荐内容',
    'tutorial-carousel': '创作教程',
    'media-card': '媒体内容',
    'user-hero': '个人中心',
    'membership-card': '会员权益',
    'user-stats': '创作数据',
    'account-quota': '账户额度',
    'asset-entries': '我的资产',
    'service-grid': '常用服务',
    'commerce-entries': '购买入口'
} as Record<string, string>)[widget?.name] || ''
const genericRowsClass = (widget: any) => ({
    'is-entry': isMobileEntryWidget(widget?.name),
    'is-grid': ['button-group', 'image-nav', 'image-showcase', 'magic-grid', 'app-collection', 'cw-tool-collection', 'creation-entry-grid', 'asset-entries', 'service-grid', 'user-stats'].includes(widget?.name),
    'is-horizontal': widget?.name === 'tutorial-carousel',
    'is-masonry': widget?.name === 'case-feed',
    'is-compact': ['recent-tasks', 'media-card', 'membership-card', 'account-quota', 'user-hero'].includes(widget?.name)
})
const genericLimit = (widget: any) => Number(widget?.content?.limit || (widget?.name === 'case-feed' ? 12 : 8))
const emptyText = (widget: any) => widget?.content?.data_mode === 'source' ? '暂无可展示数据' : '请在右侧添加内容'
const horizontalBleed = (widget: any) => mobileHorizontalBleedStyles(widget, normalizeMobileWidgetStyles(widget?.styles), 'px')
const containerStyle = (widget: any) => ({
    ...blockStyle(widget),
    minHeight: widget?.name === 'stack' ? `${Math.max(80, Number(widget?.content?.min_height || 180)) / 2}px` : undefined,
    '--container-columns': mobileGridColumns(widget?.content),
    '--masonry-columns': Math.min(4, Math.max(2, Number(widget?.content?.columns || 2))),
    '--container-gap': mobileContainerGapCss(widget, 'px')
})
const blockStyle = (widget: any) => {
    const styles = normalizeMobileWidgetStyles(widget?.styles)
    const horizontal = `${Number(styles.padding_horizontal) / 2}px`
    const background = styles.background_gradient || styles.background_color || styles.background || 'transparent'
    return {
        background: 'transparent',
        ...mobileTextStyle(widget?.styles),
        ...(isMobileEntryWidget(widget?.name) || ['media-card', 'case-feed'].includes(widget?.name) ? mobileVisualStyle(widget, 'px') : {}),
        '--widget-background': background,
        '--widget-accent-surface': mobileWidgetSurfaceColor(styles, 'linear-gradient(135deg, var(--mobile-accent), var(--mobile-accent-end))'),
        '--mobile-surface': mobileWidgetSurfaceColor(styles, props.isDark ? '#23262d' : '#ffffff'),
        '--mobile-soft-surface': mobileWidgetSurfaceColor(styles, props.isDark ? '#2c3038' : '#f6f7f9'),
        '--mobile-icon-surface': mobileWidgetSurfaceColor(styles, props.isDark ? '#303845' : '#eef2ff'),
        '--mobile-notice-surface': mobileWidgetSurfaceColor(styles, props.isDark ? '#3b3422' : '#fff7e6'),
        '--widget-background-image': styles.background_image ? `url(${resolveImage(styles.background_image)})` : styles.background_gradient || 'none',
        '--widget-background-opacity': Number(styles.opacity) / 100,
        color: styles.color || undefined,
        padding: `${Number(styles.padding_top) / 2}px ${horizontal} ${Number(styles.padding_bottom) / 2}px`,
        marginTop: `${Number(styles.margin_top) / 2}px`,
        marginBottom: `${Number(styles.margin_bottom) / 2}px`,
        marginLeft: `${Number(styles.margin_horizontal) / 2}px`,
        marginRight: `${Number(styles.margin_horizontal) / 2}px`,
        borderRadius: `${Number(styles.radius_top) / 2}px ${Number(styles.radius_right) / 2}px ${Number(styles.radius_bottom) / 2}px ${Number(styles.radius_left) / 2}px`,
        border: styles.appearance === 'border' ? `1px solid ${styles.border_color || '#ededed'}` : (styles.border_color ? `1px solid ${styles.border_color}` : undefined),
        boxShadow: styles.appearance === 'shadow' ? '0 3px 12px rgba(0, 0, 0, .08)' : (styles.shadow || undefined),
        gap: styles.item_gap ? `${Number(styles.item_gap) / 2}px` : undefined,
        '--grid-column': Math.min(12, Math.max(1, Number(styles.layout?.grid_column ?? styles.grid?.column ?? styles.grid_column ?? widget?.content?.grid_column) || 12)),
        ...mobileGridChildStyle(props.parentGridColumns, widget),
        opacity: widget.content?.enabled === 0 ? 0.48 : 1
    }
}
</script>

<style scoped lang="scss">
.mobile-decoration-renderer {
    width: 100%;
    min-height: 100%;
    background: transparent;
}
.mobile-decoration-renderer.is-floating-only-editor {
    height: 0;
    min-height: 0;
    overflow: visible;
    background: transparent;
}
.mobile-floating-actions {
    position: fixed;
    z-index: 80;
    display: flex;
    flex-direction: column;
    gap: var(--floating-gap, 8px);
    pointer-events: auto;
    &__item {
        display: flex;
        width: var(--floating-size, 42px);
        min-height: var(--floating-size, 42px);
        padding: 4px;
        box-sizing: border-box;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: var(--floating-radius);
        color: var(--floating-color);
        background: var(--floating-background);
        box-shadow: 0 5px 14px rgba(25, 49, 94, .22);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        text-align: center;
        text-decoration: none;
        word-break: break-all;
    }
    &__icon { flex: none; font-size: 17px; line-height: 1; }
    &__image { display: block; width: 19px; height: 19px; flex: none; object-fit: contain; }
    &__label { max-width: 100%; overflow: hidden; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
    &__item.is-image {
        position: relative;
        padding: 0;
        background: transparent;
    }
    &__item.is-image &__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    &__item.is-image &__label {
        position: relative;
        z-index: 1;
        align-self: stretch;
        margin-top: auto;
        padding: 5px 2px 3px;
        color: #ffffff;
        background: linear-gradient(transparent, rgba(0, 0, 0, .56));
    }
}
.mobile-decoration-renderer.is-edit .mobile-floating-actions {
    position: absolute;
    z-index: 180;
}
.mobile-widget {
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    overflow: hidden;
}
.mobile-widget::before {
    content: '';
    position: absolute;
    z-index: 0;
    inset: 0;
    border-radius: inherit;
    background: var(--widget-background, transparent);
    background-image: var(--widget-background-image, var(--widget-background, transparent));
    background-size: cover;
    background-position: center;
    opacity: var(--widget-background-opacity, 1);
    pointer-events: none;
}
.mobile-widget > * {
    position: relative;
    z-index: 1;
}
.mobile-search {
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--mobile-soft-surface);
    color: var(--widget-muted-color, var(--mobile-muted-text));
}
.mobile-banner {
    position: relative;
    overflow: hidden;
    &__track { position: relative; min-height: var(--banner-height, 132px); }
    &__item { position: absolute; inset: 0; display: flex; align-items: flex-end; opacity: 0; pointer-events: none; transition: opacity .25s ease; text-decoration: none; }
    &__item.active { position: relative; opacity: 1; pointer-events: auto; }
    &__dots { position: absolute; right: 14px; bottom: 10px; display: flex; gap: 4px; }
    &__dots i { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.65); }
    &__dots i.active { width: 12px; border-radius: 4px; background: #fff; }
    &__search { width: calc(100% - 28px); margin: 0 14px 14px; padding: 10px 13px; border-radius: 999px; color: #999; background: rgba(255,255,255,.94); font-size: 12px; }
}
.mobile-banner__item,
.mobile-middle-banner span,
.mobile-hotspot {
    min-height: var(--banner-height, 132px);
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    border-radius: 10px;
    background: var(--widget-accent-surface);
    background-size: cover;
    background-position: center;
    strong {
        padding: 14px;
        color: #fff;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.28);
    }
}
.mobile-banner__item.is-text {
    align-items: center;
    background: transparent;
    .mobile-banner__copy { padding: 14px; min-width: 0; }
    strong {
        display: block;
        padding: 0;
        color: inherit;
        text-shadow: none;
        font-size: 18px;
        line-height: 1.5;
        overflow-wrap: anywhere;
    }
    small {
        display: block;
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.7;
        overflow-wrap: anywhere;
    }
}
.mobile-nav {
    display: grid;
    grid-template-columns: repeat(var(--nav-columns, 5), minmax(0, 1fr));
    gap: 12px 6px;
    padding: 12px;
    background: var(--mobile-surface);
    div {
        min-width: 0;
        display: grid;
        justify-items: center;
        gap: 6px;
    }
    em {
        max-width: 100%;
        overflow: hidden;
        color: var(--widget-text-color, var(--mobile-regular-text));
        font-size: 12px;
        font-style: normal;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
.mobile-nav__icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--widget-accent-surface);
    background-size: cover;
    background-position: center;
}
.mobile-news {
    margin: 10px 12px;
    padding: 12px 14px;
    background: var(--mobile-surface);
    border-radius: 10px;
    &__title {
        color: var(--widget-text-color, var(--mobile-text));
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 6px;
    }
    &__row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 0;
        border-top: 1px solid var(--mobile-border);
        color: var(--widget-text-color, var(--mobile-regular-text));
        > span { flex: none; width: 58px; height: 46px; border-radius: 7px; background-size: cover; background-position: center; }
        strong, em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        strong { color: var(--widget-text-color, var(--mobile-text)); font-size: 13px; }
        em { margin-top: 3px; color: var(--widget-muted-color, var(--mobile-muted-text)); font-size: 11px; font-style: normal; }
        small { flex: none; color: var(--widget-muted-color, var(--mobile-muted-text)); }
    }
    &__empty { padding: 14px 0; color: var(--widget-muted-color, var(--mobile-muted-text)); text-align: center; }
}
.mobile-news__copy { min-width: 0; flex: 1; }
.mobile-middle-banner {
    span {
        display: block;
        min-height: 96px;
    }
}
.mobile-title {
    padding: 12px 14px;
    background: var(--mobile-surface);
    strong,
    small {
        display: block;
    }
    strong {
        color: var(--widget-text-color, var(--mobile-text));
        font-size: var(--title-font-size, 17px);
        line-height: var(--title-line-height, inherit);
        font-weight: var(--title-font-weight, 700);
    }
    small {
        margin-top: 4px;
        font-size: var(--title-sub-font-size, 12px);
        line-height: var(--title-sub-line-height, inherit);
        color: var(--widget-muted-color, var(--mobile-muted-text));
    }
    .is-center {
        text-align: center;
    }
    .is-right {
        text-align: right;
    }
}
.mobile-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--mobile-notice-surface);
    color: var(--widget-text-color, var(--mobile-notice-text));
    span {
        width: 16px;
        height: 16px;
        border-radius: 99px;
        background: currentColor;
    }
    em {
        min-width: 0;
        overflow: hidden;
        font-style: normal;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
.mobile-list-nav {
    margin: 10px 12px;
    overflow: hidden;
    border-radius: 10px;
    background: var(--mobile-surface);
    div {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        padding: 0 12px;
        & + div {
            border-top: 1px solid var(--mobile-border);
        }
    }
    span {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: var(--mobile-icon-surface);
        background-size: cover;
        background-position: center;
    }
    strong {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        font-size: 14px;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    i {
        width: 8px;
        height: 8px;
        border-right: 1px solid var(--mobile-muted-text);
        border-bottom: 1px solid var(--mobile-muted-text);
        transform: rotate(-45deg);
    }
}
.mobile-hotspot {
    margin: 10px 12px;
    min-height: 0;
    display: block;
    background: transparent;
}
.mobile-divider {
    padding: 8px 14px;
    span {
        display: block;
        border-top: 1px solid var(--mobile-border);
    }
}
.mobile-user {
    display: flex;
    align-items: center;
    gap: 12px;
    span {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--mobile-accent), var(--mobile-accent-end));
    }
    strong,
    small {
        display: block;
    }
    small {
        margin-top: 4px;
        color: inherit;
        opacity: .8;
    }
}
.mobile-services {
    > strong { display: block; margin-bottom: 12px; color: var(--widget-text-color, var(--mobile-text)); }
    &__grid { display: grid; grid-template-columns: repeat(var(--service-columns, 4), minmax(0, 1fr)); gap: 12px 6px; }
    &__grid > div { display: grid; justify-items: center; gap: 5px; min-width: 0; }
    &__grid span { width: 30px; height: 30px; border-radius: 8px; background: var(--mobile-icon-surface); background-size: cover; background-position: center; }
    &__grid em { max-width: 100%; overflow: hidden; color: var(--widget-text-color, var(--mobile-regular-text)); font-size: 12px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
}
.mobile-services.is-list .mobile-services__grid { display: block; }
.mobile-services.is-list .mobile-services__grid > div { display: flex; min-height: 44px; grid-template-columns: none; justify-items: initial; align-items: center; gap: 10px; padding: 8px 0; text-align: left; }
.mobile-services.is-list .mobile-services__grid > div + div { border-top: 1px solid var(--mobile-border); }
.mobile-services.is-list .mobile-services__grid span { flex: none; }
.mobile-services.is-list .mobile-services__grid em { max-width: none; text-align: left; }
.mobile-user-banner {
    div { min-height: 90px; display: flex; align-items: flex-end; padding: 12px; border-radius: 10px; background: var(--widget-accent-surface); background-size: cover; background-position: center; }
    strong { color: #fff; text-shadow: 0 1px 8px rgba(0, 0, 0, .28); }
}
.mobile-container {
    margin: 10px 12px;
    overflow: hidden;
    .mobile-decoration-renderer { background: transparent; }
    &__empty { padding: 24px 12px; color: var(--widget-muted-color, var(--mobile-muted-text)); text-align: center; border: 1px dashed var(--mobile-border); }
    &--grid > .mobile-decoration-renderer { display: grid; grid-template-columns: repeat(var(--container-columns), minmax(0, 1fr)); gap: var(--container-gap); }
    &--grid > .mobile-decoration-renderer > :deep(.mobile-widget) { grid-column: span var(--grid-column, 12); margin: 0 !important; }
    &--horizontal-scroll > .mobile-decoration-renderer { display: flex; gap: var(--container-gap); overflow-x: auto; scrollbar-width: none; }
    &--horizontal-scroll > .mobile-horizontal-viewport { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
    &--horizontal-scroll :deep(.mobile-widget) { flex: 0 0 78%; margin: 0 !important; }
    &--horizontal-scroll.has-item-width > .mobile-decoration-renderer > :deep(.mobile-widget),
    &--horizontal-scroll.has-item-width > .mobile-horizontal-viewport > .mobile-decoration-renderer > :deep(.mobile-widget) { flex: 0 0 var(--horizontal-item-width); min-width: 0; }
    &--masonry > .mobile-decoration-renderer { column-count: var(--masonry-columns, 2); column-gap: var(--container-gap); }
    &--masonry :deep(.mobile-widget) { break-inside: avoid; margin: 0 0 var(--container-gap) !important; }
    &--stack { position: relative; }
    &--stack > .mobile-decoration-renderer { position: relative; min-height: inherit; }
    &--stack :deep(.mobile-widget) { position: relative; margin: 0 !important; }
}
.mobile-generic {
    color: inherit;
    &__title { margin-bottom: 10px; color: var(--widget-text-color, var(--entry-text-color, var(--mobile-text))); font-weight: 700; font-size: 16px; }
    &__rich { line-height: 1.7; word-break: break-word; }
    &__rows { display: grid; gap: 10px; }
    &__rows.is-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 8px; }
    &__rows.is-entry { grid-template-columns: repeat(var(--entry-columns, 4), minmax(0, 1fr)); }
    &__rows.is-entry .mobile-generic__row { padding: var(--entry-item-padding, 8px); border-radius: var(--entry-item-radius, 8px); min-height: var(--entry-item-min-height, 0px); box-sizing: border-box; background: var(--entry-card-background); color: var(--entry-text-color); }
    &__rows.is-entry .mobile-generic__image { width: min(var(--entry-icon-size), 100%); height: auto; aspect-ratio: 1; background-size: var(--entry-image-fit); background-repeat: no-repeat; }
    &__rows.is-entry .mobile-generic__copy strong { color: inherit; font-size: var(--entry-font-size); }
    &__rows.is-entry .mobile-generic__copy small { color: var(--entry-description-color); }
    &__rows.is-entry .mobile-generic__image--placeholder { background: var(--entry-card-background); }
    &__rows.is-horizontal { display: flex; overflow-x: auto; scrollbar-width: none; }
    &__rows.is-horizontal .mobile-generic__row { flex: 0 0 70%; }
    &__rows.is-masonry { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    &__rows.is-grid .mobile-generic__row { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; text-align: center; }
    &__rows.is-grid .mobile-generic__copy { width: 100%; max-width: 100%; min-width: 0; }
    &__rows.is-grid .mobile-generic__copy small { white-space: normal; overflow-wrap: anywhere; word-break: break-word; line-height: 1.5; }
    &__row { display: flex; min-width: 0; align-items: center; gap: 9px; padding: 8px; border-radius: 8px; color: inherit; background: var(--mobile-soft-surface); text-decoration: none; }
    &__image { flex: none; width: 42px; height: 42px; border-radius: 8px; background-size: cover; background-position: center; }
    &__image--placeholder { background: linear-gradient(135deg, var(--mobile-accent), var(--mobile-accent-end)); }
    .mobile-row-icon { display: grid; place-items: center; color: inherit; font-size: var(--entry-icon-size, 32px); }
    .mobile-row-icon svg { width: 75%; height: 75%; }
    &__copy { min-width: 0; flex: 1; }
    &__copy strong, &__copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &__copy strong { color: var(--widget-text-color, var(--mobile-text)); font-size: 13px; }
    &__copy small { margin-top: 3px; color: var(--widget-muted-color, var(--entry-description-color, var(--mobile-muted-text))); font-size: 11px; }
    &__row > em { flex: none; padding: 2px 5px; color: var(--mobile-accent); font-size: 10px; font-style: normal; border-radius: 4px; background: color-mix(in srgb, var(--mobile-accent) 12%, transparent); }
    &__empty { grid-column: 1 / -1; width: 100%; box-sizing: border-box; padding: 16px 0; color: var(--widget-muted-color, var(--mobile-muted-text)); text-align: center; font-size: 12px; }
    &__tabs { display: flex; gap: 18px; overflow-x: auto; }
    &__tabs a { flex: none; color: var(--widget-muted-color, var(--mobile-muted-text)); font-size: 13px; text-decoration: none; }
    &__tabs .active { color: var(--mobile-accent); font-weight: 700; }
    &__promo { min-height: 108px; display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; border-radius: 10px; color: #fff; background: var(--widget-accent-surface); background-size: cover; background-position: center; }
    &__promo small { margin-top: 4px; opacity: .85; }
    &__floating { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 16px; color: inherit; border-radius: 999px; }
    &__video { display: block; width: 100%; min-height: 180px; border-radius: inherit; background: #101114; object-fit: cover; }
    &__audio { display: grid; gap: 10px; padding: 12px; border-radius: 10px; background: var(--mobile-soft-surface); }
    &__audio audio { width: 100%; height: 32px; }
    &--floating-action { position: relative; margin-left: auto; width: max-content; }
}
.mobile-button-group {
    display: grid;
    grid-template-columns: repeat(var(--button-columns, 2), minmax(0, 1fr));
    gap: var(--button-gap, 8px);
    &.is-scroll,
    &.is-page {
        display: flex;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
        scroll-snap-type: x proximity;
    }
    &.is-page { scroll-snap-type: x mandatory; }
    &__button {
        position: relative;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        color: var(--button-text-color, var(--mobile-text));
        background: transparent;
        text-decoration: none;
        font-size: var(--button-font-size, 13px);
        text-align: center;
        scroll-snap-align: start;
    }
    &__button.is-square .mobile-button-group__graphic { border-radius: 0; }
    &__button.is-rounded .mobile-button-group__graphic { border-radius: 10px; }
    &__button.is-circle .mobile-button-group__graphic { border-radius: 50%; }
    &__graphic {
        display: flex;
        width: var(--button-icon-size, 22px);
        height: var(--button-icon-size, 22px);
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background-color: var(--mobile-icon-surface);
        background-position: center;
        background-size: cover;
        color: var(--mobile-accent);
        font-size: calc(var(--button-icon-size, 22px) * .56);
        line-height: 1;
    }
    &__graphic.is-placeholder { background-image: linear-gradient(135deg, var(--mobile-accent), var(--mobile-accent-end)); }
    &__graphic.is-icon { background: color-mix(in srgb, var(--mobile-accent) 12%, transparent); }
    &__button strong {
        display: block;
        max-width: 100%;
        overflow: hidden;
        color: inherit;
        font: inherit;
        line-height: 1.35;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    &__tag {
        position: absolute;
        top: -4px;
        left: 50%;
        z-index: 1;
        max-width: 80%;
        overflow: hidden;
        padding: 1px 5px;
        border-radius: 8px;
        font-size: 9px;
        font-style: normal;
        line-height: 1.35;
        text-overflow: ellipsis;
        transform: translateX(-10%);
        white-space: nowrap;
    }
}
.mobile-image-nav {
    display: grid;
    grid-template-columns: repeat(var(--image-nav-columns), minmax(0, 1fr));
    gap: 14px 8px;
    &__item { min-width: 0; display: grid; justify-items: center; gap: 5px; color: inherit; text-decoration: none; }
    &__image { width: 42px; height: 42px; border-radius: 12px; background: var(--mobile-icon-surface); background-size: cover; background-position: center; }
    strong, small { max-width: 100%; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
    strong { color: var(--widget-text-color, var(--mobile-text)); font-size: 13px; font-weight: 500; }
    small { color: var(--widget-muted-color, var(--mobile-muted-text)); font-size: 11px; }
}
.mobile-image-showcase {
    display: grid;
    gap: 10px;
    &.is-double, &.is-grid { grid-template-columns: repeat(var(--image-showcase-columns, 2), minmax(0, 1fr)); }
    &.is-single { grid-template-columns: 1fr; }
    &.is-horizontal, &.is-scroll { display: flex; overflow-x: auto; scrollbar-width: none; }
    &.is-horizontal .mobile-image-showcase__item, &.is-scroll .mobile-image-showcase__item { flex: 0 0 72%; }
    &__item { min-width: 0; color: inherit; text-decoration: none; }
    &__image { display: block; width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; background: var(--mobile-soft-surface); background-size: cover; background-position: center; }
    strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    strong { margin-top: var(--media-title-gap, 7px); color: var(--widget-text-color, var(--entry-text-color, var(--mobile-text))); font-size: var(--media-title-font-size, 13px); line-height: var(--media-title-line-height, inherit); }
    small { margin-top: var(--media-sub-gap, 3px); color: var(--widget-muted-color, var(--entry-description-color, var(--mobile-muted-text))); font-size: var(--media-sub-font-size, 11px); line-height: var(--media-sub-line-height, inherit); }
}
.mobile-image-showcase.is-media-list { grid-template-columns: minmax(0, 1fr); }
.mobile-image-showcase.is-media-list .mobile-image-showcase__item { display: flex; align-items: center; gap: var(--media-image-text-gap, 12px); }
.mobile-image-showcase.is-media-list .mobile-image-showcase__image { flex: none; width: min(var(--media-list-image-width, 80px), 45%); max-width: 45%; }
.mobile-image-showcase.is-media-list .mobile-image-showcase__copy { flex: 1; min-width: 0; }
.mobile-image-showcase.is-media-list strong, .mobile-image-showcase.is-media-list small { white-space: normal; overflow-wrap: anywhere; }
.mobile-image-showcase.is-media-list strong { margin-top: 0; }
.mobile-image-showcase.is-media-list-scroll { display: flex; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.mobile-image-showcase.is-media-list-scroll .mobile-image-showcase__item { flex: 0 0 72%; box-sizing: border-box; }
.mobile-magic-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    &--layout {
        position: relative;
        display: block;
        width: 100%;
        height: 0;
        box-sizing: border-box;
        overflow: hidden;
        .mobile-magic-grid__item { position: absolute; display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; padding: 0; border-radius: 0; background: var(--mobile-soft-surface); }
        .mobile-magic-grid__image { flex: 1; min-height: 0; aspect-ratio: auto; border-radius: 0; }
        strong, small { padding: 0 6px; }
        small { padding-bottom: 5px; }
    }
    &__item { box-sizing: border-box; min-width: 0; padding: 8px; border-radius: 8px; color: inherit; background: var(--mobile-soft-surface); text-decoration: none; }
    &__image { display: block; width: 100%; aspect-ratio: 1 / 1; border-radius: 6px; background: var(--mobile-icon-surface); background-size: cover; background-position: center; }
    strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    strong { margin-top: 6px; color: var(--widget-text-color, var(--mobile-text)); font-size: 13px; }
    small { margin-top: 2px; color: var(--widget-muted-color, var(--mobile-muted-text)); font-size: 11px; }
}
.mobile-tutorial-carousel {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar { display: none; }
    &__item { min-width: 0; display: block; color: inherit; scroll-snap-align: start; text-decoration: none; }
    &__image { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 8px; background: var(--mobile-soft-surface); background-size: cover; background-position: center; }
    strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    strong { margin-top: 7px; color: var(--widget-text-color, var(--entry-text-color, var(--mobile-text))); font-size: 13px; }
    small { margin-top: 3px; color: var(--widget-muted-color, var(--entry-description-color, var(--mobile-muted-text))); font-size: 11px; }
    em { display: inline-block; margin-top: 4px; padding: 2px 5px; border-radius: 4px; color: var(--mobile-accent); background: color-mix(in srgb, var(--mobile-accent) 12%, transparent); font-size: 10px; font-style: normal; }
}
.mobile-case-feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    &__item { min-width: 0; color: inherit; text-decoration: none; }
    span { display: block; width: 100%; aspect-ratio: 1 / 1.15; border-radius: 8px; background: var(--mobile-soft-surface); background-size: cover; background-position: center; }
    strong { display: block; margin-top: 6px; overflow: hidden; color: var(--widget-text-color, var(--entry-text-color, var(--mobile-text))); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
}
.mobile-service,
.mobile-unknown {
    margin: 10px 12px;
    padding: 16px;
    border-radius: 10px;
    background: var(--mobile-surface);
    color: var(--widget-text-color, var(--mobile-regular-text));
}
.mobile-commerce-member { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 58px; color: #fff; text-decoration: none; }
.mobile-commerce-member span { display: grid; gap: 4px; }
.mobile-commerce-member strong { font-size: 17px; }
.mobile-commerce-member small { font-size: 11px; opacity: .75; }
.mobile-commerce-member b { flex: none; padding: 8px 10px; border-radius: 20px; background: #fff; color: #222; font-size: 11px; }
.mobile-commerce-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.mobile-commerce-grid a { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 58px; padding: 9px; border-radius: 8px; background: var(--mobile-surface); text-decoration: none; }
.mobile-commerce-grid span { display: grid; min-width: 0; gap: 4px; }
.mobile-commerce-grid strong { color: #222; font-size: 13px; }
.mobile-commerce-grid small { overflow: hidden; color: #999; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.mobile-commerce-grid b { display: flex; flex: none; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: #edf4ff; color: var(--color-primary); }
.mobile-commerce-grid b img { display: block; width: 20px; height: 20px; object-fit: contain; }

.mobile-profile { display: grid; grid-template-columns: minmax(0, 1fr) 30px; align-items: center; column-gap: 12px; }
.mobile-title.has-more { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; }
.mobile-title.has-more > small { grid-column: 1 / -1; }
.mobile-title__more { color: inherit; opacity: .6; font-size: 11px; text-decoration: none; white-space: nowrap; }
.mobile-profile a { color: inherit; text-decoration: none; }
.mobile-profile__identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mobile-profile__identity strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 19px; }
.mobile-profile__avatar { width: 54px; height: 54px; flex: none; border-radius: 50%; object-fit: cover; }
.mobile-profile__placeholder { display: flex; align-items: center; justify-content: center; background: #22292b; color: #a7b5b6; }
.mobile-profile__placeholder svg { width: 30px; height: 30px; }
.mobile-profile__bind { grid-column: 1; margin-left: 66px; margin-top: -13px; color: #159476 !important; font-size: 11px; }
.mobile-profile__settings { grid-column: 2; grid-row: 1 / 3; display: flex; justify-content: center; }
.mobile-profile__settings svg { width: 23px; height: 23px; }
.mobile-assets__heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mobile-assets__heading strong { font-size: 17px; }
.mobile-assets__heading a { color: inherit; opacity: .6; font-size: 11px; text-decoration: none; }
.mobile-assets__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 22px; }
.mobile-assets__stats a { min-width: 0; display: grid; gap: 9px; color: inherit; text-align: center; text-decoration: none; }
.mobile-assets__stats strong { font-size: 24px; font-weight: 600; }
.mobile-assets__stats small { font-size: 12px; opacity: .6; }
.mobile-gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.mobile-gallery a { min-width: 0; color: inherit; text-decoration: none; }
.mobile-gallery img { display: block; width: 100%; height: auto; border-radius: 8px; }
.mobile-gallery strong { display: block; font-size: 12px; margin-top: 6px; }
.mobile-gallery__empty { min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 22px 0; }
.mobile-gallery__empty img { display: block; width: 110px; height: 90px; object-fit: contain; }
.mobile-gallery__empty small { font-size: 12px; opacity: .5; }
.mobile-gallery__empty a { display: block; padding: 9px 26px; border-radius: 5px; color: #151515; background: #8ef1af; font-size: 13px; text-decoration: none; }
.mobile-case-masonry { display: flex; gap: 10px; align-items: flex-start; }
.mobile-case-masonry__column { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 10px; }
.mobile-case-masonry__item { display: block; overflow: hidden; color: #fff; background: #18191b; border-radius: 8px; text-decoration: none; }
.mobile-case-masonry__item img { display: block; width: 100%; height: auto; }
.mobile-case-masonry__copy { padding: 9px; }
.mobile-case-masonry__copy strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 13px; line-height: 1.45; }
.mobile-case-masonry__copy small { display: block; margin-top: 8px; color: #a1a1a6; font-size: 10px; }
.mobile-case-masonry__heart { display: block; margin-top: 8px; color: #a1a1a6; font-size: 10px; }
.mobile-generic__tabs.is-underline { gap: 24px; }
.mobile-generic__tabs.is-underline a { position: relative; padding: 3px 0 12px; font-size: 16px; }
.mobile-generic__tabs.is-underline a.active { color: inherit; }
.mobile-generic__tabs.is-underline a.active::after { content: ''; position: absolute; bottom: 0; left: 50%; width: 18px; height: 3px; border-radius: 3px; transform: translateX(-50%); background: #8ef1af; }
</style>
