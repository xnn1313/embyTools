// 工具箱页面组件
const ToolboxPage = {
    name: 'ToolboxPage',
    
    components: {
        Helper115Page,
        Helper123Page,
        HelperQuarkPage,
        HelperCloud189Page,
        HelperCD2Page,
        HelperTgPage,
        HDHiveHelperPage,
        HDHivePage,
        Transfer115Page,
        CleanerPage,
        QRCodePage,
        QRCodeOpenPage,
        StrmCheckerPage,
        WikiPage,
        GptRecognizePage,
        TgForwardPage,
        StrmBackupPage,
        EmptyFolderCleanerPage,
        EmbyGapCheckerPage,
        ChartSubscribePage,
        Ed2kStrmPage,
        BulkTransferPage
    },
    
    data() {
        return {
            subPage: '',
            tools: [
                { 
                    id: 'helper115', 
                    title: '115 助手', 
                    description: '管理 115 网盘配置、同播复制、签到等功能',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#3D6FD5',
                    component: 'Helper115Page'
                },
                { 
                    id: 'helper123', 
                    title: '123 助手', 
                    description: '管理 123 云盘配置、Token 获取与秒传设置',
                    icon: null,
                    iconImg: 'assets/images/123pan.png',
                    color: '#00BCD4',
                    component: 'Helper123Page'
                },
                { 
                    id: 'helper_quark', 
                    title: '夸克助手', 
                    description: '管理夸克网盘配置，用于 Emby 助手路径替换获取直链',
                    icon: null,
                    iconImg: 'assets/images/quark.png',
                    color: '#7C4DFF',
                    component: 'HelperQuarkPage'
                },
                { 
                    id: 'helper_cloud189', 
                    title: '天翼助手', 
                    description: '管理天翼云盘配置，用于 Emby 助手路径替换获取直链',
                    icon: null,
                    iconImg: 'assets/images/cloud189.png',
                    color: '#009688',
                    component: 'HelperCloud189Page'
                },
                { 
                    id: 'helper_tg', 
                    title: 'TG 助手', 
                    description: '管理多个 Telegram API 配置，用于 TG 频道搜索等功能',
                    icon: null,
                    iconImg: 'assets/images/telegram-logo.png',
                    color: '#0088CC',
                    component: 'HelperTgPage'
                },
                { 
                    id: 'tg_forward', 
                    title: 'TG 转发', 
                    description: '监控 TG 频道/群组消息，按关键词自动转发到目标',
                    icon: null,
                    iconImg: 'assets/images/telegram-logo.png',
                    color: '#0088CC',
                    component: 'TgForwardPage'
                },
                { 
                    id: 'hdhive_helper', 
                    title: 'HDHive 助手', 
                    description: '管理 HDHive 多账号配置、Token 获取与定时刷新',
                    icon: null,
                    iconImg: 'assets/images/hdhive-icon.png',
                    color: '#FFB400',
                    component: 'HDHiveHelperPage'
                },
                { 
                    id: 'hdhive', 
                    title: 'HDHive 解析', 
                    description: '配置 HDHive 自动解析、115 转存与积分限制',
                    icon: null,
                    iconImg: 'assets/images/hdhive-icon.png',
                    color: '#FFB400',
                    component: 'HDHivePage'
                },
                { 
                    id: 'transfer_115', 
                    title: '115 转存', 
                    description: '通过 TG Bot 接收 115 分享链接，自动转存到指定文件夹',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#56CA00',
                    component: 'Transfer115Page'
                },
                { 
                    id: 'helper_cd2', 
                    title: 'CD2 助手', 
                    description: '配置 CloudDrive2 连接，用于文件整理批量操作',
                    icon: null,
                    iconImg: 'assets/images/clouddrive2.png',
                    color: '#00BCD4',
                    component: 'HelperCD2Page'
                },
                { 
                    id: 'cleaner', 
                    title: '清理助手', 
                    description: '定时清空最近接收和回收站',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#FF4C51',
                    component: 'CleanerPage'
                },
                { 
                    id: 'qrcode', 
                    title: '扫码获取 Cookie', 
                    description: '通过扫描二维码快速获取 115 Cookie',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#56CA00',
                    component: 'QRCodePage'
                },
                { 
                    id: 'qrcode_open', 
                    title: '115 Open 扫码授权', 
                    description: '通过扫码获取 115 Open Token (PKCE 模式)',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#00BFA5',
                    component: 'QRCodeOpenPage'
                },
                { 
                    id: 'strm_checker', 
                    title: '检测无效分享STRM', 
                    description: '扫描本地 STRM 文件，检测已取消或已过期的 115 分享',
                    icon: 'mdi-file-search-outline',
                    iconImg: null,
                    color: '#FF4C51',
                    component: 'StrmCheckerPage'
                },
                { 
                    id: 'gpt_recognize', 
                    title: 'OpenAI 辅助识别', 
                    description: '使用 OpenAI/兼容 API 辅助识别媒体名称',
                    icon: 'mdi-brain',
                    iconImg: null,
                    color: '#00BFA5',
                    component: 'GptRecognizePage'
                },
                { 
                    id: 'strm_backup', 
                    title: '分享 STRM 备份', 
                    description: '定时备份指定后缀文件（STRM/字幕等），保持目录结构',
                    icon: 'mdi-backup-restore',
                    iconImg: null,
                    color: '#56CA00',
                    component: 'StrmBackupPage'
                },
                { 
                    id: 'empty_folder_cleaner', 
                    title: '空文件夹清理', 
                    description: '扫描并删除不含 .strm 文件的空文件夹',
                    icon: 'mdi-folder-remove',
                    iconImg: null,
                    color: '#FF4C51',
                    component: 'EmptyFolderCleanerPage'
                },
                { 
                    id: 'emby_gap_checker', 
                    title: 'Emby 缺集检测', 
                    description: '扫描 Emby 剧集库，检测每季缺失的集数并推送到 TG',
                    icon: 'mdi-television-shimmer',
                    iconImg: null,
                    color: '#FF9800',
                    component: 'EmbyGapCheckerPage'
                },
                { 
                    id: 'chart_subscribe', 
                    title: '榜单订阅', 
                    description: '定时从 TMDB/豆瓣榜单自动添加订阅，支持预设配置',
                    icon: 'mdi-chart-line',
                    iconImg: null,
                    color: '#7C4DFF',
                    component: 'ChartSubscribePage'
                },
                { 
                    id: 'ed2k_strm', 
                    title: 'ed2k STRM', 
                    description: '通过 ed2k 链接离线下载到 115 并生成 STRM 文件',
                    icon: 'mdi-link-variant',
                    iconImg: null,
                    color: '#8B5CF6',
                    component: 'Ed2kStrmPage'
                },
                { 
                    id: 'bulk_transfer', 
                    title: '115大包筛选入库', 
                    description: '扫描 115 分享大包，识别影视文件并按嵌套文件夹结构转存或生成 STRM',
                    icon: 'mdi-package-variant-closed',
                    iconImg: null,
                    color: '#E91E63',
                    component: 'BulkTransferPage'
                },
                { 
                    id: 'wiki', 
                    title: 'Wiki 文档', 
                    description: 'STRM 格式、路径替换与 Open API 参考文档',
                    icon: 'mdi-book-open-page-variant',
                    iconImg: null,
                    color: '#16B1FF',
                    component: 'WikiPage'
                },
            ]
        }
    },
    
    mounted() {
        this.parseRoute();
        this.routeHandler = () => {
            this.parseRoute();
        };
        window.addEventListener('route-change', this.routeHandler);
    },
    
    beforeUnmount() {
        if (this.routeHandler) {
            window.removeEventListener('route-change', this.routeHandler);
        }
    },
    
    methods: {
        parseRoute() {
            const hash = window.location.hash.slice(1).replace(/^\//, '');
            if (hash.startsWith('toolbox/')) {
                this.subPage = hash.replace('toolbox/', '');
            } else {
                this.subPage = '';
            }
        },
        
        openTool(tool) {
            router.push('toolbox/' + tool.id);
        },
        
        goBack() {
            router.push('toolbox');
        },
        
        getCurrentTool() {
            const base = this.subPage.split('/')[0];
            return this.tools.find(t => t.id === base);
        }
    },
    
    template: `
        <div>
            <!-- 工具箱内容区过渡动画 -->
            <transition name="toolbox-fade" mode="out-in">
                <!-- 工具箱主页 - 卡片列表 -->
                <div v-if="!subPage" key="toolbox-home">
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">工具箱</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(139,92,246,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    
                    <v-row>
                        <v-col v-for="(tool, index) in tools" :key="tool.id" cols="12" sm="6" lg="4">
                            <div 
                                class="toolbox-card"
                                :style="{ '--tool-color': tool.color }"
                                @click="openTool(tool)"
                            >
                                <div class="toolbox-card-icon" :style="{ background: 'rgba(128,128,128,0.08)' }">
                                    <img v-if="tool.iconImg" :src="tool.iconImg" style="width: 38px; height: 38px; border-radius: 8px; object-fit: contain;">
                                    <v-icon v-else :color="tool.color" size="38">{{ tool.icon }}</v-icon>
                                </div>
                                <div class="toolbox-card-info">
                                    <div class="toolbox-card-title">{{ tool.title }}</div>
                                    <div class="toolbox-card-desc">{{ tool.description }}</div>
                                </div>
                                <v-icon size="20" style="opacity: 0.3; flex-shrink: 0;">mdi-chevron-right</v-icon>
                            </div>
                        </v-col>
                    </v-row>
                </div>
                
                <!-- 工具子页面 -->
                <div v-else :key="'tool-' + subPage.split('/')[0]">
                    <!-- 面包屑导航栏 -->
                    <div class="toolbox-breadcrumb">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <v-btn variant="text" color="primary" @click="goBack" style="border-radius: 10px; min-width: auto; padding: 0 10px; height: 40px;">
                                <v-icon size="26">mdi-arrow-left</v-icon>
                            </v-btn>
                            <v-chip size="large" variant="tonal" color="primary" @click="goBack" style="cursor: pointer; font-size: 15px; height: 36px;">
                                <v-icon start size="20">mdi-toolbox</v-icon>
                                工具箱
                            </v-chip>
                            <v-icon size="22" style="opacity: 0.4;">mdi-chevron-right</v-icon>
                            <v-chip size="large" variant="flat" color="primary" style="font-size: 15px; height: 36px;">
                                <template v-if="getCurrentTool()?.iconImg">
                                    <img :src="getCurrentTool().iconImg" style="width: 20px; height: 20px; border-radius: 5px; margin-right: 8px;">
                                </template>
                                <v-icon v-else-if="getCurrentTool()?.icon" start size="20">{{ getCurrentTool().icon }}</v-icon>
                                {{ getCurrentTool()?.title || subPage }}
                            </v-chip>
                        </div>
                    </div>
                    
                    <!-- 动态渲染子组件 -->
                    <component :is="getCurrentTool()?.component || 'div'" :key="subPage.split('/')[0]"></component>
                </div>
            </transition>
        </div>
    `
};
