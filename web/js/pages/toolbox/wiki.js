// Wiki 文档页面组件
const WikiPage = {
    name: 'WikiPage',

    data() {
        return {
            activeSection: 'strm_format',
            sections: [
                { id: 'strm_format', title: 'STRM 格式说明', icon: 'mdi-file-video-outline' },
                { id: 'path_replacement', title: '路径替换格式', icon: 'mdi-swap-horizontal' },
                { id: 'open_api', title: 'Open API 说明', icon: 'mdi-api' },
                { id: 'subscribe_logic', title: '订阅逻辑', icon: 'mdi-rss' },
                { id: 'tracking_folder', title: '追更文件添加文件夹', icon: 'mdi-folder-plus' },
                { id: 'ffprobe_info', title: '媒体信息提取', icon: 'mdi-movie-search' },
                { id: 'custom_identifiers', title: '自定义识别词', icon: 'mdi-tag-text-outline' },
                { id: 'custom_release_groups', title: '自定义制作组', icon: 'mdi-account-group-outline' },
                { id: 'custom_captures', title: '自定义捕获词', icon: 'mdi-crosshairs-gps' },
                { id: 'post_render_words', title: '渲染后处理词', icon: 'mdi-auto-fix' },
            ]
        }
    },

    computed: {
        isDark() {
            try {
                return this.$vuetify.theme.global.current.dark;
            } catch {
                return true;
            }
        },
        // 主题适配色
        colors() {
            const dark = this.isDark;
            return {
                cardBg: dark ? 'rgba(var(--v-theme-on-surface),0.04)' : 'rgba(0,0,0,0.02)',
                cardBorder: dark ? 'rgba(var(--v-theme-on-surface),0.08)' : 'rgba(0,0,0,0.08)',
                text: dark ? 'rgba(var(--v-theme-on-surface),0.87)' : 'rgba(0,0,0,0.87)',
                textSecondary: dark ? 'rgba(var(--v-theme-on-surface),0.6)' : 'rgba(0,0,0,0.6)',
                textMuted: dark ? 'rgba(var(--v-theme-on-surface),0.4)' : 'rgba(0,0,0,0.38)',
                codeBg: dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)',
                codeText: dark ? '#e0e0e0' : '#333333',
                tipBg: dark ? 'rgba(61,111,213,0.1)' : 'rgba(61,111,213,0.06)',
                tipBorder: dark ? 'rgba(61,111,213,0.3)' : 'rgba(61,111,213,0.2)',
                warnBg: dark ? 'rgba(255,180,0,0.1)' : 'rgba(255,180,0,0.06)',
                warnBorder: dark ? 'rgba(255,180,0,0.3)' : 'rgba(255,180,0,0.2)',
                errorBg: dark ? 'rgba(255,76,81,0.1)' : 'rgba(255,76,81,0.06)',
                errorBorder: dark ? 'rgba(255,76,81,0.3)' : 'rgba(255,76,81,0.2)',
                successBg: dark ? 'rgba(86,202,0,0.1)' : 'rgba(86,202,0,0.06)',
                successBorder: dark ? 'rgba(86,202,0,0.3)' : 'rgba(86,202,0,0.2)',
                tableBg: dark ? 'rgba(var(--v-theme-on-surface),0.03)' : 'rgba(0,0,0,0.02)',
                tableHeaderBg: dark ? 'rgba(61,111,213,0.15)' : 'rgba(61,111,213,0.08)',
                tableRowAlt: dark ? 'rgba(var(--v-theme-on-surface),0.02)' : 'rgba(0,0,0,0.015)',
                tableBorder: dark ? 'rgba(var(--v-theme-on-surface),0.08)' : 'rgba(0,0,0,0.08)',
                divider: dark ? 'rgba(var(--v-theme-on-surface),0.08)' : 'rgba(0,0,0,0.08)',
                sectionActiveBg: dark ? 'rgba(61,111,213,0.15)' : 'rgba(61,111,213,0.1)',
                sectionActiveText: '#3D6FD5',
            };
        },
        thStyle() {
            return {
                padding: '10px 14px',
                textAlign: 'left',
                fontWeight: 600,
                color: this.colors.text,
                borderBottom: '2px solid ' + this.colors.tableBorder,
                whiteSpace: 'nowrap',
                fontSize: '13px'
            };
        },
        tdStyle() {
            return {
                padding: '10px 14px',
                color: this.colors.textSecondary,
                borderBottom: '1px solid ' + this.colors.tableBorder,
                verticalAlign: 'top',
                lineHeight: '1.6'
            };
        },
        codeStyle() {
            return {
                background: this.colors.codeBg,
                color: this.colors.codeText,
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'Consolas, Monaco, monospace',
                wordBreak: 'break-all'
            };
        },
        codeBlockStyle() {
            return {
                background: this.colors.codeBg,
                color: this.colors.codeText,
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontFamily: 'Consolas, Monaco, monospace',
                wordBreak: 'break-all',
                lineHeight: '1.5'
            };
        }
    },

    methods: {
        scrollToSection(id) {
            this.activeSection = id;
            const el = this.$refs[id];
            if (el) {
                const target = Array.isArray(el) ? el[0] : el;
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },

    template: `
        <div>
            <div style="margin-bottom: 20px;">
                <h2 :style="{ color: colors.text, fontSize: '28px', fontWeight: 450, margin: 0 }">
                    <v-icon color="info" size="28" style="margin-right: 6px;">mdi-book-open-page-variant</v-icon>
                    Wiki 文档
                </h2>
                <div :style="{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }">
                    Emby 助手 / 秒传播放 / 订阅 / 词表 参考文档
                </div>
                <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,191,165,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
            </div>

            <!-- 导航标签（移动端友好） -->
            <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                <v-chip
                    v-for="sec in sections"
                    :key="sec.id"
                    :color="activeSection === sec.id ? 'primary' : undefined"
                    :variant="activeSection === sec.id ? 'flat' : 'tonal'"
                    @click="scrollToSection(sec.id)"
                    style="cursor: pointer;"
                >
                    <v-icon start size="18">{{ sec.icon }}</v-icon>
                    {{ sec.title }}
                </v-chip>
            </div>

            <!-- ============ 1. STRM 格式说明 ============ -->
            <div :ref="'strm_format'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="info" size="22">mdi-file-video-outline</v-icon>
                    STRM 格式与工作模式匹配
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    Emby 助手和秒传播放都通过检测 STRM 文件中的 URL 参数来匹配对应的工作模式。<br>
                    多个模式同时开启时，按下方表格中的优先级<strong>从上到下</strong>顺序匹配，命中即停止。
                </div>

                <!-- 匹配规则表格 -->
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '680px' }">
                        <thead>
                            <tr :style="{ background: colors.tableHeaderBg }">
                                <th :style="thStyle">工作模式</th>
                                <th :style="thStyle">匹配条件（STRM 内容特征）</th>
                                <th :style="thStyle">示例 STRM 内容</th>
                                <th :style="thStyle">来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle">
                                    <v-chip color="success" size="x-small" variant="flat">分享模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    URL 中同时包含 <code :style="codeStyle">share_code</code>、<code :style="codeStyle">receive_code</code>、<code :style="codeStyle">id</code> 三个参数
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://host:port/api/?share_code=xxx&receive_code=xxx&id=12345&name=电影.mkv</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">115 分享 STRM 生成</span><br>
                                    <span :style="{ color: colors.sectionActiveText, fontSize: '11px' }">✔ 本项目生成的分享 STRM 符合此格式</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableRowAlt }">
                                <td :style="tdStyle">
                                    <v-chip color="primary" size="x-small" variant="flat">路径替换模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    路径<strong>不以 http 开头</strong>（本地路径），或虽然是 HTTP URL 但匹配了路径替换规则
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">/CloudNAS/CloudDrive/115open/电影/test.mkv</div>
                                    <div :style="{ ...codeBlockStyle, marginTop: '4px' }">https://alist.example.com/d/115/电影/test.mkv</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">CloudDrive / Alist 等挂载目录</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle">
                                    <v-chip color="warning" size="x-small" variant="flat">Pickcode 模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    URL 中包含 <code :style="codeStyle">pickcode=xxx</code> 参数（字母数字混合），或路径为 <code :style="codeStyle">/d/{pickcode}</code> 或 <code :style="codeStyle">/play115/{pickcode}/...</code> 格式
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://host:port/api/?pickcode=abcdef123&name=电影.mkv</div>
                                    <div :style="{ ...codeBlockStyle, marginTop: '4px' }">http://host:port/d/abchrb6gnrw0hhh80</div>
                                    <div :style="{ ...codeBlockStyle, marginTop: '4px' }">http://host:port/d/abchrb6gnrw0hhh80?/电影.mkv</div>
                                    <div :style="{ ...codeBlockStyle, marginTop: '4px' }">http://host:port/play115/{pickcode}/{file_id}/{sha1}/{file_size}/电影.mp4</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">自行构造 / 第三方工具</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableRowAlt }">
                                <td :style="tdStyle">
                                    <v-chip color="cyan" size="x-small" variant="flat">FileId 模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    URL 中包含 <code :style="codeStyle">fileId=纯数字</code> 参数（115 文件数字 ID，10位以上），自动通过 115 API 转为 pickcode 再获取直链
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://host:port/shareVideoPlayUrl?fileId=3312677223653037366&account=xxx</div>
                                    <div :style="{ ...codeBlockStyle, marginTop: '4px' }">http://host:port/videoPlayUrl?fileId=3312677223653037366&account=xxx</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">p115strm / Symedia 等工具生成</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle">
                                    <v-chip color="deep-purple" size="x-small" variant="flat">123 STRM 模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    URL 中包含 <code :style="codeStyle">redirect123</code> 关键字，以及 <code :style="codeStyle">size</code>、<code :style="codeStyle">md5</code>、<code :style="codeStyle">s3_key_flag</code> 参数
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://host:port/api/?redirect123&size=123456&md5=abc&s3_key_flag=xxx&name=电影.mkv</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">123 STRM 生成</span><br>
                                    <span :style="{ color: colors.sectionActiveText, fontSize: '11px' }">✔ 本项目生成的 123 STRM 符合此格式</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle">
                                    <v-chip color="pink" size="x-small" variant="flat">ed2k 模式</v-chip>
                                </td>
                                <td :style="tdStyle">
                                    URL 中包含 <code :style="codeStyle">ed2k_strm</code> 关键字，以及 <code :style="codeStyle">hash</code>、<code :style="codeStyle">size</code> 参数
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://host:port/api/ed2k_strm?hash=ABC123&size=123456&name=电影.mkv</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">ed2k STRM 生成</span><br>
                                    <span :style="{ color: colors.sectionActiveText, fontSize: '11px' }">✔ 本项目生成的 ed2k STRM 符合此格式</span>
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableRowAlt }">
                                <td :style="tdStyle">
                                    <v-chip color="orange" size="x-small" variant="flat">HTTP 回退</v-chip>
                                    <div :style="{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }">仅 Emby 助手</div>
                                </td>
                                <td :style="tdStyle">
                                    源文件地址以 <code :style="codeStyle">http://</code> 或 <code :style="codeStyle">https://</code> 开头，且不匹配上述任何模式
                                </td>
                                <td :style="tdStyle">
                                    <div :style="codeBlockStyle">http://some-service/path/to/file.mkv</div>
                                </td>
                                <td :style="tdStyle">
                                    <span :style="{ color: colors.textSecondary }">任意 HTTP 直链</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Emby 助手 vs 秒传播放 差异 -->
                <div :style="{ marginTop: '20px', padding: '16px', background: colors.tipBg, borderRadius: '12px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.text, fontSize: '14px', fontWeight: 500, marginBottom: '8px' }">
                        <v-icon size="18" color="info">mdi-information</v-icon>
                        Emby 助手 vs 秒传播放 差异
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • <strong>匹配规则完全一致</strong>：两者使用相同的 STRM 参数检测逻辑来判断工作模式<br>
                        • <strong>Emby 助手</strong>：直接从源账号获取直链播放（分享模式使用分享接口下载、路径模式使用网盘文件接口）<br>
                        • <strong>秒传播放</strong>：先从源账号获取文件信息，然后秒传到目标账号，再从目标账号获取直链播放<br>
                        • <strong>HTTP 回退</strong>仅在 Emby 助手中可用，秒传播放不支持此模式<br>
                        • <strong>123 STRM 模式</strong>：Emby 助手需在工作模式中选择一个 123 配置；秒传播放则使用目标 123 账号直接获取直链
                    </div>
                </div>
            </div>

            <!-- ============ 2. 路径替换格式 ============ -->
            <div :ref="'path_replacement'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="primary" size="22">mdi-swap-horizontal</v-icon>
                    路径替换格式
                </h3>

                <!-- Emby 助手路径替换 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-filmstrip</v-icon>
                        Emby 助手 路径替换
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.7', marginBottom: '12px' }">
                        格式：<code :style="codeStyle">路径前缀 => 配置名称 或 HTTP URL</code>，一行一个，按顺序匹配。
                    </div>

                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">右侧目标类型</th>
                                    <th :style="thStyle">行为</th>
                                    <th :style="thStyle">示例</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="primary" variant="flat">115 配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀剥离，剩余部分作为网盘路径，通过 115 接口获取直链，<strong>支持同播复制</strong>
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/115open => 115一号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="deep-purple" variant="flat">123 配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀剥离，剩余部分作为网盘路径，通过 123 接口获取直链
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/123云盘 => 123二号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="deep-purple-accent-2" variant="flat">夸克配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀剥离，剩余部分作为网盘路径，通过夸克接口获取直链，<strong>不支持同播复制</strong>（同播直接获取新链接）
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/夸克网盘 => 夸克一号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="teal" variant="flat">天翼配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀剥离，剩余部分作为网盘路径，通过天翼云盘接口获取直链，<strong>不支持同播复制</strong>（同播直接获取新链接）
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/天翼云盘 => 天翼一号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="orange" variant="flat">HTTP URL</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀替换为 HTTP URL 前缀，302 重定向到拼接后的 URL。<strong>固定缓存 600 秒，不支持同播复制</strong><br>
                                        支持本地路径和 HTTP URL 作为左侧前缀（即 URL→URL 替换）
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/volume2/cloudnas/天翼云盘 => http://172.17.0.1:8515/d</div>
                                        <div :style="{ ...codeBlockStyle, marginTop: '4px' }">http://10.0.0.194:5678/d => http://10.0.0.194:5244/d/小雅网盘</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div :style="{ marginTop: '12px', padding: '12px', background: colors.tipBg, borderRadius: '8px', border: '1px solid ' + colors.tipBorder }">
                        <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                            <v-icon size="14" color="info">mdi-lightbulb-outline</v-icon>
                            <strong>说明：</strong><code :style="codeStyle">=></code> 前后都有空格，一行一个，按顺序匹配。<br>
                            • 支持 <strong>Linux 路径</strong>、<strong>Windows 路径</strong>（反斜杠 <code :style="codeStyle">\\</code> 会自动转为 <code :style="codeStyle">/</code>）和 <strong>HTTP/HTTPS URL</strong> 前缀<br>
                            • HTTP URL 前缀会自动 URL 解码后再匹配<br>
                            • 优先匹配 115 配置，115 未命中再匹配 123 配置，然后尝试夸克配置，再尝试天翼配置，最后匹配 HTTP URL 目标
                        </div>
                    </div>
                </div>

                <v-divider :style="{ borderColor: colors.divider, margin: '20px 0' }"></v-divider>

                <!-- 秒传播放路径替换 -->
                <div>
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="purple">mdi-flash-triangle</v-icon>
                        秒传播放 路径替换
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.7', marginBottom: '12px' }">
                        格式：<code :style="codeStyle">路径前缀 => 源账号名称 或 HTTP URL</code>，一行一个，按顺序匹配。
                    </div>

                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">右侧目标类型</th>
                                    <th :style="thStyle">行为</th>
                                    <th :style="thStyle">示例</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="primary" variant="flat">115 配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        右边填写的是<strong>源账号</strong>的配置名。匹配后，使用该源账号获取文件信息，再秒传到目标账号
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/115open => 115一号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="deep-purple" variant="flat">123 配置名</v-chip></td>
                                    <td :style="tdStyle">
                                        右边填写的是<strong>源账号</strong>的 123 配置名。匹配后，使用该账号获取文件信息秒传
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">/CloudNAS/CloudDrive/123云盘 => 123二号</div>
                                    </td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="orange" variant="flat">HTTP URL</v-chip></td>
                                    <td :style="tdStyle">
                                        将路径前缀替换为 HTTP URL 前缀，302 重定向到拼接后的 URL，<strong>跳过秒传逻辑</strong>
                                    </td>
                                    <td :style="tdStyle">
                                        <div :style="codeBlockStyle">http://10.0.0.194:5678/d => http://10.0.0.194:5244/d/小雅网盘</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div :style="{ marginTop: '12px', padding: '12px', background: colors.warnBg, borderRadius: '8px', border: '1px solid ' + colors.warnBorder }">
                        <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                            <v-icon size="14" color="warning">mdi-alert-outline</v-icon>
                            <strong>区别：</strong>秒传播放的路径替换<strong>不支持</strong>夸克配置和天翼配置作为目标（会被跳过）。<br>
                            • 右边填写 115/123 <strong>源账号</strong>配置名称时，仅用于从该账号获取文件信息以进行秒传，而非直接获取直链<br>
                            • 右边填写 <strong>HTTP URL</strong> 时，直接将路径前缀替换后 302 重定向，跳过秒传逻辑<br>
                            • 同样支持 Linux 路径、Windows 路径和 HTTP/HTTPS URL 作为<strong>左侧前缀</strong>，Windows 反斜杠会自动转换
                        </div>
                    </div>
                </div>

                <v-divider :style="{ borderColor: colors.divider, margin: '20px 0' }"></v-divider>

                <!-- 路径替换示例对比 -->
                <div :style="{ padding: '16px', background: colors.successBg, borderRadius: '12px', border: '1px solid ' + colors.successBorder }">
                    <div :style="{ color: colors.text, fontSize: '14px', fontWeight: 500, marginBottom: '10px' }">
                        <v-icon size="18" color="success">mdi-check-decagram</v-icon>
                        路径转换示例
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '2' }">
                        <strong>① Linux 路径</strong><br>
                        <strong>规则：</strong><code :style="codeStyle">/CloudNAS/CloudDrive/115open => 115一号</code><br>
                        <strong>Emby 源文件：</strong><code :style="codeStyle">/CloudNAS/CloudDrive/115open/电影/test.mkv</code><br>
                        <strong>转换后网盘路径：</strong><code :style="codeStyle">/电影/test.mkv</code><br><br>
                        <strong>② Windows 路径</strong><br>
                        <strong>规则：</strong><code :style="codeStyle">G:/115 => 115一号</code><br>
                        <strong>Emby 源文件：</strong><code :style="codeStyle">G:\\115\\电影\\test.mkv</code> 或 <code :style="codeStyle">G:/115/电影/test.mkv</code><br>
                        <strong>转换后网盘路径：</strong><code :style="codeStyle">/电影/test.mkv</code><br>
                        <span :style="{ color: colors.textMuted }">（规则中用正斜杠 / 书写，源文件中的反斜杠 \\ 会自动转换后匹配）</span><br><br>
                        <strong>③ HTTP URL 目标替换（本地路径→URL）</strong><br>
                        <strong>规则：</strong><code :style="codeStyle">/volume2/cloudnas/天翼云盘 => http://172.17.0.1:8515/d</code><br>
                        <strong>Emby 源文件：</strong><code :style="codeStyle">/volume2/cloudnas/天翼云盘/movies/test.mkv</code><br>
                        <strong>重定向到：</strong><code :style="codeStyle">http://172.17.0.1:8515/d/movies/test.mkv</code><br><br>
                        <strong>④ URL→URL 替换</strong><br>
                        <strong>规则：</strong><code :style="codeStyle">http://10.0.0.194:5678/d => http://10.0.0.194:5244/d/小雅网盘</code><br>
                        <strong>Emby 源文件：</strong><code :style="codeStyle">http://10.0.0.194:5678/d/movies/test.mkv</code><br>
                        <strong>重定向到：</strong><code :style="codeStyle">http://10.0.0.194:5244/d/小雅网盘/movies/test.mkv</code><br><br>
                        <strong>⑤ HTTP URL 前缀</strong><br>
                        <strong>规则：</strong><code :style="codeStyle">https://alist.example.com/d/115 => 115二号</code><br>
                        <strong>Emby 源文件：</strong><code :style="codeStyle">https://alist.example.com/d/115/电影/test.mkv</code><br>
                        <strong>转换后网盘路径：</strong><code :style="codeStyle">/电影/test.mkv</code><br><br>
                    </div>
                </div>
            </div>

            <!-- ============ 3. Open API 说明 ============ -->
            <div :ref="'open_api'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="teal" size="22">mdi-api</v-icon>
                    开启 Open API 的影响
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.7', marginBottom: '16px' }">
                    Emby 助手和秒传播放都支持开启 115 Open API。开启后，路径替换、Pickcode 等模式的 115 操作将通过 Open API 进行。<br>
                    但两者在分享模式上有差异：
                </div>

                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '550px' }">
                        <thead>
                            <tr :style="{ background: colors.tableHeaderBg }">
                                <th :style="thStyle">项目</th>
                                <th :style="thStyle">未开启 Open API</th>
                                <th :style="thStyle">开启 Open API</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle"><strong>获取直链</strong></td>
                                <td :style="tdStyle">通过 Cookie 调用接口</td>
                                <td :style="tdStyle">通过 Open Token 调用接口</td>
                            </tr>
                            <tr :style="{ background: colors.tableRowAlt }">
                                <td :style="tdStyle"><strong>同播复制</strong></td>
                                <td :style="tdStyle">通过 Cookie</td>
                                <td :style="tdStyle">通过 Open Token</td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle"><strong>秒传</strong></td>
                                <td :style="tdStyle">通过 Cookie</td>
                                <td :style="tdStyle">通过 Open Token</td>
                            </tr>
                            <tr :style="{ background: colors.tableRowAlt }">
                                <td :style="tdStyle">
                                    <strong>分享模式</strong><br>
                                    <span :style="{ fontSize: '11px', color: colors.textMuted }">(Emby 助手)</span>
                                </td>
                                <td :style="tdStyle">
                                    <v-chip size="x-small" color="success" variant="flat">可用</v-chip>
                                    通过 Cookie 调用分享下载接口
                                </td>
                                <td :style="tdStyle">
                                    <v-chip size="x-small" color="success" variant="flat">可用</v-chip>
                                    分享模式有独立的账号配置，始终通过 Cookie 调用分享接口，不受 Open API 影响
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle">
                                    <strong>分享模式</strong><br>
                                    <span :style="{ fontSize: '11px', color: colors.textMuted }">(秒传播放)</span>
                                </td>
                                <td :style="tdStyle">
                                    <v-chip size="x-small" color="success" variant="flat">可用</v-chip>
                                    通过 Cookie 调用分享下载接口
                                </td>
                                <td :style="tdStyle">
                                    <v-chip size="x-small" color="error" variant="flat">不可用</v-chip>
                                    Open API 不支持分享下载接口，分享模式将被自动禁用
                                </td>
                            </tr>
                            <tr :style="{ background: colors.tableBg }">
                                <td :style="tdStyle"><strong>账号要求</strong></td>
                                <td :style="tdStyle">必须有 Cookie</td>
                                <td :style="tdStyle">必须有 Open Token（在 115 助手中通过扫码获取）</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div :style="{ marginTop: '16px', padding: '14px', background: colors.errorBg, borderRadius: '10px', border: '1px solid ' + colors.errorBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="error">mdi-alert-circle</v-icon>
                        重要提醒
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • <strong>Emby 助手</strong>：分享模式有独立的账号选择，开启 Open API 后分享模式<strong>仍然可用</strong>，它会使用单独配置的 Cookie 账号调用分享接口<br>
                        • <strong>秒传播放</strong>：开启 Open API 后分享模式<strong>会被强制禁用</strong>，因为秒传播放的源/目标账号统一走 Open API，而 Open API 不支持分享下载接口<br>
                        • 115 配置中必须已绑定 Open Token，否则 Open API 相关操作将失败
                    </div>
                </div>

                <div :style="{ marginTop: '16px', padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="info">mdi-lightbulb-outline</v-icon>
                        推荐场景
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • <strong>Emby 助手</strong>：可以放心开启 Open API，分享模式会用独立配置的 Cookie 账号，其他模式走 Open Token<br>
                        • <strong>秒传播放 + 路径/Pickcode/FileId 模式</strong>：可以开启 Open API<br>
                        • <strong>秒传播放 + 分享模式</strong>：<strong>不能</strong>开启 Open API，否则分享模式被禁用<br>
                        • <strong>秒传播放混合使用</strong>：如果同时需要分享模式和路径模式，不要开启 Open API
                    </div>
                </div>
            </div>

            <!-- ============ 4. 订阅逻辑 ============ -->
            <div :ref="'subscribe_logic'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="deep-orange" size="22">mdi-rss</v-icon>
                    订阅执行逻辑
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    订阅引擎按定时任务周期执行（默认每 2 小时），也支持手动触发单个或批量执行。
                </div>

                <!-- 整体流程 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="info">mdi-chart-timeline-variant</v-icon>
                        整体流程
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '13px', lineHeight: '2' }">
                        <strong>1. 搜索资源</strong> — 根据订阅配置的搜索来源（影巢 / 频道搜索）搜索匹配资源<br>
                        <strong>2. 获取链接</strong> — 为所有搜索结果获取 115 分享链接（影巢资源自动解锁获取），按分享码去重<br>
                        <strong>3. 扫描分享文件</strong> — 用 115 Cookie 扫描每个分享链接的实际视频文件（支持 4 种解析模式）<br>
                        <strong>4. 名称识别验证</strong> — 用扫描到的真实文件名进行 TMDB 识别，确认与订阅的媒体一致<br>
                        <strong>5. 媒体信息提取</strong>（可选）— 文件名识别缺少分辨率/特效/编码时，通过 ffprobe 提取补全<br>
                        <strong>6. 条件筛选</strong> — 按订阅设定的分辨率、特效、来源、制作组、流媒体平台筛选<br>
                        <strong>7. 执行操作</strong> — 根据模式执行 STRM 生成 或 115 转存
                    </div>
                </div>

                <v-divider :style="{ borderColor: colors.divider, margin: '16px 0' }"></v-divider>

                <!-- 电影 vs 剧集 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="purple">mdi-movie-open</v-icon>
                        电影 vs 剧集
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '550px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">项目</th>
                                    <th :style="thStyle">电影</th>
                                    <th :style="thStyle">剧集</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><strong>识别方式</strong></td>
                                    <td :style="tdStyle">扫描分享 → 用第一个视频文件名识别 TMDB → 匹配订阅</td>
                                    <td :style="tdStyle">扫描分享 → 逐个视频文件识别 → 提取季号/集号 → 按缺集匹配</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><strong>集数追踪</strong></td>
                                    <td :style="tdStyle">无，成功即标记完成</td>
                                    <td :style="tdStyle">自动维护缺集列表（lack_episode），每集完成后更新</td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><strong>选取策略</strong></td>
                                    <td :style="tdStyle">多个匹配时随机选一个（或全部处理）</td>
                                    <td :style="tdStyle">按集分组，每集选一个（或全部）；按分享链接分组处理</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><strong>完成条件</strong></td>
                                    <td :style="tdStyle">成功一次即标记 completed</td>
                                    <td :style="tdStyle">当前季所有集完成后标记 completed</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <v-divider :style="{ borderColor: colors.divider, margin: '16px 0' }"></v-divider>

                <!-- 两种模式 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-swap-vertical-bold</v-icon>
                        订阅模式
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '550px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">模式</th>
                                    <th :style="thStyle">行为</th>
                                    <th :style="thStyle">需要配置</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip color="primary" size="x-small" variant="flat">分享 STRM</v-chip></td>
                                    <td :style="tdStyle">获取 115 分享链接后直接生成 STRM 文件，Emby 扫库即可播放</td>
                                    <td :style="tdStyle">115 分享 STRM 配置（账号 + STRM 输出目录）</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip color="warning" size="x-small" variant="flat">转存</v-chip></td>
                                    <td :style="tdStyle">按文件转存到 115 指定目录，适合需要本地保存的场景</td>
                                    <td :style="tdStyle">115 账号 + 转存目标文件夹</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 转存再分享 -->
                <div :style="{ padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder, marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        转存再分享模式
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        分享 STRM 模式下可开启「转存再分享」，订阅引擎会先将资源转存到自己的 115 账号，再用自己的分享链接生成 STRM。<br>
                        优势：分享链接更稳定，不依赖原始分享者是否取消分享。<br>
                        剧集会按集使用单文件转存，多个订阅的链接会先收集再统一批量处理。
                    </div>
                </div>

                <!-- 解析模式 -->
                <div :style="{ padding: '14px', background: colors.warnBg, borderRadius: '10px', border: '1px solid ' + colors.warnBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="warning">mdi-speedometer</v-icon>
                        解析模式（扫描分享文件）
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • <strong>最快模式 (0)</strong>：仅列出根目录文件，速度最快，适合简单分享结构<br>
                        • <strong>大包模式 (1)</strong>：适合单层大包分享<br>
                        • <strong>线程递归 (2)</strong>：多线程递归扫描所有子目录<br>
                        • <strong>葵花宝典 (3)</strong>：异步递归扫描，识别阶段用最快模式，最快且最完整
                    </div>
                </div>
            </div>

            <!-- ============ 5. 追更文件添加文件夹 ============ -->
            <div :ref="'tracking_folder'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="teal" size="22">mdi-folder-plus</v-icon>
                    追更文件添加文件夹
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    开启后，订阅追更执行转存或生成 STRM 时，会在目标目录下自动创建以媒体信息命名的子文件夹，方便按影视分类管理文件。
                </div>

                <div :style="{ padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder, marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        自动创建
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        追更时<strong>自动</strong>在转存/STRM目录下创建媒体文件夹，无需手动开启。
                    </div>
                </div>

                <div :style="{ padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder, marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="teal">mdi-folder-text</v-icon>
                        命名规则
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        <strong>媒体文件夹</strong>：<code :style="codeStyle">名称 (年份) {tmdbid-ID}</code><br>
                        <strong>示例</strong>：<code :style="codeStyle">侏罗纪世界3 (2022) {tmdbid-507086}</code><br><br>
                        <strong>季文件夹</strong>（仅剧集）：<code :style="codeStyle">Season 季号</code><br>
                        <strong>示例</strong>：<code :style="codeStyle">Season 1</code>、<code :style="codeStyle">Season 7</code><br><br>
                        • 优先使用中文名，无中文名时使用英文名<br>
                        • 电视剧自动在媒体文件夹下创建季文件夹<br>
                        • 文件夹已存在时自动复用，不会重复创建
                    </div>
                </div>

                <div :style="{ padding: '14px', background: colors.warnBg, borderRadius: '10px', border: '1px solid ' + colors.warnBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="warning">mdi-swap-vertical-bold</v-icon>
                        不同模式的行为
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • <strong>转存模式</strong>：在 115 网盘转存目标文件夹下创建子文件夹，文件转存到子文件夹中<br>
                        • <strong>分享 STRM 模式</strong>：在本地 STRM 输出目录下创建子文件夹，STRM 文件生成到子文件夹中<br>
                        • <strong>转存再分享模式</strong>：同分享 STRM 模式，在本地 STRM 路径下创建子文件夹
                    </div>
                </div>
            </div>

            <!-- ============ 6. 媒体信息提取 ============ -->
            <div :ref="'ffprobe_info'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="cyan" size="22">mdi-movie-search</v-icon>
                    媒体信息提取
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    通过 ffprobe（FFmpeg 工具集）提取视频的真实分辨率、HDR/DV 特效、编码格式等媒体信息。
                </div>

                <!-- 开关条件 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="info">mdi-toggle-switch</v-icon>
                        开关与触发条件
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '13px', lineHeight: '2' }">
                        <strong>开关位置</strong>：订阅设置 → 媒体信息提取开关（<code :style="codeStyle">ffprobe_enabled</code>）<br><br>
                        <strong>触发时机</strong>（开启后，以下情况会自动触发媒体信息提取）：
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 12px;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">媒体类型</th>
                                    <th :style="thStyle">触发条件</th>
                                    <th :style="thStyle">说明</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="primary" variant="flat">电影</v-chip></td>
                                    <td :style="tdStyle">文件名识别后缺少 分辨率 / 特效 / 视频编码 / 音频编码 中的任一项</td>
                                    <td :style="tdStyle">在识别验证阶段（第4步后），每个匹配通过的资源单独提取</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="purple" variant="flat">剧集</v-chip></td>
                                    <td :style="tdStyle">缺集筛选后的候选文件中，任一文件缺少上述参数</td>
                                    <td :style="tdStyle">在条件筛选之前（第3步），按分享链接去重只提取一次，结果应用到该分享下所有候选文件</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <v-divider :style="{ borderColor: colors.divider, margin: '16px 0' }"></v-divider>

                <!-- 媒体信息提取内容 -->
                <div :style="{ marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-format-list-checks</v-icon>
                        识别内容
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '450px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">字段</th>
                                    <th :style="thStyle">识别方式</th>
                                    <th :style="thStyle">示例值</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><strong>分辨率</strong></td>
                                    <td :style="tdStyle">通过视频流宽高映射：≥2160→2160p，≥1080→1080p，≥720→720p</td>
                                    <td :style="tdStyle"><code :style="codeStyle">2160p</code> <code :style="codeStyle">1080p</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><strong>特效</strong></td>
                                    <td :style="tdStyle">检测 color_transfer（PQ/HLG）、color_primaries（BT.2020）、side_data（DV）</td>
                                    <td :style="tdStyle"><code :style="codeStyle">DV HDR</code> <code :style="codeStyle">HDR</code> <code :style="codeStyle">DV</code> <code :style="codeStyle">HDR10+</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><strong>视频编码</strong></td>
                                    <td :style="tdStyle">视频流 codec_name，标准化映射</td>
                                    <td :style="tdStyle"><code :style="codeStyle">HEVC</code> <code :style="codeStyle">H264</code> <code :style="codeStyle">AV1</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><strong>音频编码</strong></td>
                                    <td :style="tdStyle">音频流 codec_name，标准化映射</td>
                                    <td :style="tdStyle"><code :style="codeStyle">EAC3</code> <code :style="codeStyle">AAC</code> <code :style="codeStyle">TrueHD</code> <code :style="codeStyle">DTS</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><strong>帧率</strong></td>
                                    <td :style="tdStyle">视频流 r_frame_rate 计算</td>
                                    <td :style="tdStyle"><code :style="codeStyle">23.98</code> <code :style="codeStyle">25</code> <code :style="codeStyle">60</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 工作原理 -->
                <div :style="{ padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder, marginBottom: '12px' }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="info">mdi-lightbulb-outline</v-icon>
                        工作原理
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        不会下载整个视频文件。通过获取 115 分享的视频直链（302 URL），只读取文件头部的元数据（约 10MB），即可获取完整的流信息。<br>
                        超时设置为 30 秒，如果网络较慢或视频文件异常会自动超时跳过。
                    </div>
                </div>
                <div :style="{ padding: '14px', background: colors.warnBg, borderRadius: '10px', border: '1px solid ' + colors.warnBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }">
                        <v-icon size="16" color="warning">mdi-alert-outline</v-icon>
                        注意事项
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.8' }">
                        • 提取结果仅<strong>补全</strong>文件名识别缺失的字段，不会覆盖已有值<br>
                        • 如果不需要精确筛选分辨率/特效，可不开启以加快执行速度
                    </div>
                </div>
            </div>

            <!-- ============ 7. 自定义识别词 ============ -->
            <div :ref="'custom_identifiers'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="primary" size="22">mdi-tag-text-outline</v-icon>
                    自定义识别词
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    在名称识别前对标题进行预处理，支持替换、删除、集数偏移、指定 TMDB ID 等操作。可在整理配置中设置，保存后立即生效。
                </div>

                <!-- 基本规则 -->
                <div :style="{ marginBottom: '20px', padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        基本规则
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.9' }">
                        • 一行一个规则，<code :style="codeStyle">#</code> 开头为注释行，用于分类或备注<br>
                        • 支持正则表达式<br>
                        • <strong>区分大小写</strong>：如需忽略大小写请用 <code :style="codeStyle">(?i)</code> 前缀<br>
                        • 规则按配置顺序依次处理，前面的规则结果会影响后面规则的匹配
                    </div>
                </div>

                <!-- 格式说明表格 -->
                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="primary">mdi-format-list-bulleted</v-icon>
                        支持的格式
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">类型</th>
                                    <th :style="thStyle">格式（注意空格）</th>
                                    <th :style="thStyle">示例</th>
                                    <th :style="thStyle">效果</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="grey" variant="flat">注释</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle"># 注释内容</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">#常用替换</code></td>
                                    <td :style="tdStyle">以 <code :style="codeStyle">#</code> 开头的行被忽略，用于分类备注</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="error" variant="flat">屏蔽词</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">词语</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">PROPER</code></td>
                                    <td :style="tdStyle">直接删除标题中匹配的内容，支持正则</td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="success" variant="flat">替换词</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">被替换词 =&gt; 替换词</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">S1 =&gt; Season 1</code></td>
                                    <td :style="tdStyle">将匹配内容替换为目标词，替换词为空则等同删除</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="info" variant="flat">指定 TMDB</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">被替换词 =&gt; {[tmdbid=ID;type=movie/tv;s=季;e=集]}</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">JoJo.S01E01 =&gt; {[tmdbid=45790;type=tv;s=1;e=1]}</code></td>
                                    <td :style="tdStyle">直接指定 TMDB ID 进行精确识别，按 <code :style="codeStyle">type</code> 区分电影/电视剧搜索；<code :style="codeStyle">s</code>（季）和 <code :style="codeStyle">e</code>（集）为可选参数</td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="pink" variant="flat">捕获计算</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">正则(捕获) =&gt; {[tmdbid=ID;type=tv;s=季;e=\\1@表达式]}</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">QUEST - ([0-9][0-9]) =&gt; {[tmdbid=248947;type=tv;s=1;e=\\1@*2+1]}</code></td>
                                    <td :style="tdStyle">用 <code :style="codeStyle">()</code> 捕获集数，<code :style="codeStyle">\\1</code> 为捕获值，<code :style="codeStyle">@</code> 后接算术表达式。例: 捕获到 <code :style="codeStyle">01</code>，<code :style="codeStyle">1*2+1=3</code>，最终 e=3</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="warning" variant="flat">集偏移</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">前定位词 &lt;&gt; 后定位词 &gt;&gt; 偏移表达式</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">第 &lt;&gt; 集 &gt;&gt; EP+1</code><br><code :style="codeStyle">S01E &lt;&gt; 2160p &gt;&gt; 2*EP+1</code></td>
                                    <td :style="tdStyle">定位前后词之间的数字并偏移。<code :style="codeStyle">EP</code> 代表当前集数，支持 <code :style="codeStyle">+</code> <code :style="codeStyle">-</code> <code :style="codeStyle">*</code> <code :style="codeStyle">/</code> 及复合运算如 <code :style="codeStyle">2*EP+1</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="deep-purple" variant="flat">组合规则</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">被替换词 =&gt; 替换词 &amp;&amp; 前定位词 &lt;&gt; 后定位词 &gt;&gt; 偏移</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">第二季 =&gt; S02 &amp;&amp; S02 &lt;&gt; E &gt;&gt; EP-12</code></td>
                                    <td :style="tdStyle">先执行替换，替换成功后再执行集偏移</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 示例 -->
                <div :style="{ marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-text-box-check-outline</v-icon>
                        配置示例
                    </div>
                    <div :style="codeBlockStyle">
                        <div style="white-space: pre-wrap; line-height: 1.8; word-break: break-all;">#常用替换
第一季 =&gt; S01
第二季 =&gt; S02

# 正则替换：忽略大小写
(?i)web-dl =&gt; WEB-DL

# 屏蔽词：直接删除
PROPER
REPACK

# 指定 TMDB ID（电视剧）
JoJo's Bizarre Adventure.S01E01 =&gt; {[tmdbid=45790;type=tv;s=1;e=1]}

# 捕获集数 + 算术偏移（捕获两位数字，乘以2再加1）
FAIRY TAIL - 100 YEARS QUEST - ([0-9][0-9]) =&gt; {[tmdbid=248947;type=tv;s=1;e=\\1@*2+1]}

# 集偏移：匹配"第X集"中的数字，加1
第 &lt;&gt; 集 &gt;&gt; EP+1

# 集偏移：S01E后的数字乘以2加1
S01E &lt;&gt; 2160p &gt;&gt; 2*EP+1

# 替换 + 集偏移组合
第二季 =&gt; S02 &amp;&amp; S02 &lt;&gt; E &gt;&gt; EP-12</div>
                    </div>
                </div>

                <!-- TMDB 指定说明 -->
                <div :style="{ marginBottom: '16px', padding: '14px', background: colors.warnBg, borderRadius: '10px', border: '1px solid ' + colors.warnBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }">
                        <v-icon size="16" color="warning">mdi-alert-outline</v-icon>
                        TMDB ID 指定说明
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.9' }">
                        • <code :style="codeStyle">{[tmdbid=数字;type=movie或tv]}</code> 格式可直接指定 TMDB ID 进行精确识别<br>
                        • <code :style="codeStyle">type=movie</code> 按电影搜索，<code :style="codeStyle">type=tv</code> 按电视剧搜索，<strong>务必正确填写</strong>以确保精确匹配<br>
                        • <code :style="codeStyle">s=</code> 和 <code :style="codeStyle">e=</code> 为可选参数，用于指定季数和集数<br>
                        • 捕获计算语法：<code :style="codeStyle">e=\\1@*2+1</code> 中 <code :style="codeStyle">\\1</code> 是正则捕获的值，<code :style="codeStyle">@</code> 后接算术表达式（支持 <code :style="codeStyle">+ - * /</code>）
                    </div>
                </div>

                <div :style="{ padding: '12px', background: colors.tipBg, borderRadius: '8px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                        <v-icon size="14" color="info">mdi-lightbulb-outline</v-icon>
                        配置完成后，可到<strong>仪表盘右上角</strong>点击<strong>名称识别测试</strong>验证规则是否生效。
                    </div>
                </div>
            </div>

            <!-- ============ 8. 自定义制作组 ============ -->
            <div :ref="'custom_release_groups'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="teal" size="22">mdi-account-group-outline</v-icon>
                    自定义制作组
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    用于识别文件名中的制作组/字幕组标签。系统内置了常见制作组列表，你也可以自定义添加。
                </div>

                <div :style="{ marginBottom: '20px', padding: '14px', background: colors.tipBg, borderRadius: '10px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.text, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        格式说明
                    </div>
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.9' }">
                        • 一行一个制作组名称，<code :style="codeStyle">#</code> 开头为注释<br>
                        • 支持正则表达式，例如 <code :style="codeStyle">CMCT[V]?</code> 可匹配 <code :style="codeStyle">CMCT</code> 和 <code :style="codeStyle">CMCTV</code><br>
                        • 匹配规则：在文件名中查找 <code :style="codeStyle">-</code> <code :style="codeStyle">@</code> <code :style="codeStyle">[</code> 等分隔符后面的制作组名<br>
                        • 末尾自动检测：即使不在列表中，文件名末尾的 <code :style="codeStyle">-GroupName</code> 格式也会被自动提取<br>
                        • 如果自定义列表不为空，将<strong>替代</strong>内置列表
                    </div>
                </div>

                <div :style="{ marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-text-box-check-outline</v-icon>
                        配置示例
                    </div>
                    <div :style="codeBlockStyle">
                        <div style="white-space: pre-wrap; line-height: 1.8; word-break: break-all;"># 常见制作组
CMCT
CHD
HDSky
MTeam
FRDS

# 正则匹配（可选）
CMCT[V]?
Wiki[A-Z]*</div>
                    </div>
                </div>

                <div :style="{ padding: '12px', background: colors.tipBg, borderRadius: '8px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                        <v-icon size="14" color="info">mdi-lightbulb-outline</v-icon>
                        制作组信息会显示在识别结果的 <strong>releaseGroup</strong> 字段中，可用于重命名模板 <code :style="codeStyle">{{releaseGroup}}</code>。
                    </div>
                </div>
            </div>

            <!-- ============ 9. 自定义捕获词 ============ -->
            <div :ref="'custom_captures'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="cyan" size="22">mdi-crosshairs-gps</v-icon>
                    自定义捕获词
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    从文件名中提取自定义字段，供重命名模板使用。支持命名捕获、条件替换、自定义分隔符等高级语法。
                </div>

                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="primary">mdi-format-list-bulleted</v-icon>
                        支持的格式
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">类型</th>
                                    <th :style="thStyle">格式</th>
                                    <th :style="thStyle">示例</th>
                                    <th :style="thStyle">效果</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="cyan" variant="flat">纯正则</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">正则表达式</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">HBO</code></td>
                                    <td :style="tdStyle">匹配结果写入默认字段 <code :style="codeStyle">customCapture</code></td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="teal" variant="flat">命名捕获</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">正则 &gt;&gt; 变量名</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">(?i)(HBO|Netflix) &gt;&gt; platform</code></td>
                                    <td :style="tdStyle">匹配结果写入指定变量，可在模板中用 <code :style="codeStyle">{{platform}}</code> 引用</td>
                                </tr>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="indigo" variant="flat">条件替换</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">正则 &gt;&gt; 变量名 =&gt; 替换值</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">(?i)REMUX &gt;&gt; quality =&gt; BluRay</code></td>
                                    <td :style="tdStyle">匹配成功时，用固定值写入变量（而非匹配文本）</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="orange" variant="flat">自定义分隔符</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">正则 &gt;&gt; 变量名 @分隔符</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">(HBO|Netflix) &gt;&gt; sources @,</code></td>
                                    <td :style="tdStyle">多个匹配结果用指定分隔符拼接（默认为 <code :style="codeStyle">@</code>）</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div :style="{ marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-text-box-check-outline</v-icon>
                        配置示例
                    </div>
                    <div :style="codeBlockStyle">
                        <div style="white-space: pre-wrap; line-height: 1.8; word-break: break-all;"># 纯正则：匹配 HBO 写入 customCapture
HBO

# 命名捕获：匹配平台写入 platform 变量
(?i)(HBO|Netflix|Disney\\+?) &gt;&gt; platform

# 条件替换：匹配到 REMUX 时，quality 变量写入 BluRay
(?i)REMUX &gt;&gt; quality =&gt; BluRay

# 自定义分隔符：多个来源用逗号拼接
(HBO|Netflix|Amazon) &gt;&gt; sources @,</div>
                    </div>
                </div>

                <div :style="{ padding: '12px', background: colors.tipBg, borderRadius: '8px', border: '1px solid ' + colors.tipBorder }">
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                        <v-icon size="14" color="info">mdi-lightbulb-outline</v-icon>
                        捕获到的变量可在重命名模板中通过 <code :style="codeStyle">{{变量名}}</code> 引用。默认字段名为 <code :style="codeStyle">customCapture</code>。
                    </div>
                </div>
            </div>

            <!-- ============ 10. 渲染后处理词 ============ -->
            <div :ref="'post_render_words'" class="glass-card" :style="{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: colors.cardBg, border: '1px solid ' + colors.cardBorder }">
                <h3 :style="{ color: colors.text, marginBottom: '16px', fontSize: '20px' }">
                    <v-icon color="deep-purple" size="22">mdi-auto-fix</v-icon>
                    渲染后处理词
                </h3>
                <div :style="{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', lineHeight: '1.7' }">
                    在重命名模板渲染完成后，对最终输出的文件名进行正则替换后处理。适用于需要修改模板渲染结果的场景。
                </div>

                <div :style="{ marginBottom: '20px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="primary">mdi-format-list-bulleted</v-icon>
                        支持的格式
                    </div>
                    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }">
                            <thead>
                                <tr :style="{ background: colors.tableHeaderBg }">
                                    <th :style="thStyle">类型</th>
                                    <th :style="thStyle">格式</th>
                                    <th :style="thStyle">示例</th>
                                    <th :style="thStyle">效果</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr :style="{ background: colors.tableBg }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="error" variant="flat">屏蔽词</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">词语</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">PROPER</code></td>
                                    <td :style="tdStyle">删除渲染结果中匹配的内容</td>
                                </tr>
                                <tr :style="{ background: colors.tableRowAlt }">
                                    <td :style="tdStyle"><v-chip size="x-small" color="success" variant="flat">替换词</v-chip></td>
                                    <td :style="tdStyle"><code :style="codeStyle">被替换词 =&gt; 替换词</code></td>
                                    <td :style="tdStyle"><code :style="codeStyle">BluRay Remux =&gt; BluRay.REMUX</code></td>
                                    <td :style="tdStyle">正则替换，支持捕获组引用 <code :style="codeStyle">\\1</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div :style="{ marginBottom: '16px' }">
                    <div :style="{ color: colors.text, fontSize: '16px', fontWeight: 500, marginBottom: '12px' }">
                        <v-icon size="18" color="success">mdi-text-box-check-outline</v-icon>
                        配置示例
                    </div>
                    <div :style="codeBlockStyle">
                        <div style="white-space: pre-wrap; line-height: 1.8; word-break: break-all;"># 替换渲染后的文件名
BluRay Remux =&gt; BluRay.REMUX

# 正则替换：忽略大小写
(?i)\\bremux\\b =&gt; REMUX

# 屏蔽词：删除特定内容
PROPER</div>
                    </div>
                </div>

                <div :style="{ padding: '12px', background: colors.warnBg, borderRadius: '8px', border: '1px solid ' + colors.warnBorder }">
                    <div :style="{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7' }">
                        <v-icon size="14" color="warning">mdi-alert-outline</v-icon>
                        渲染后处理词作用于<strong>模板渲染后的最终文件名</strong>，而非原始标题。与识别词的执行时机不同。
                    </div>
                </div>
            </div>


        </div>
    `
};
