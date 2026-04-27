const { createApp } = Vue;
const { createVuetify } = Vuetify;

// 创建 Vuetify 实例 - 包含深色和浅色主题
const vuetify = createVuetify({
    theme: {
        defaultTheme: localStorage.getItem('theme') || 'dark',
        themes: {
            dark: {
                colors: {
                    background: '#111827',
                    surface: '#161D2C',
                    'surface-bright': '#CCBFD6',
                    'surface-light': '#424242',
                    'surface-variant': '#A3A3A3',
                    'on-surface-variant': '#424242',
                    primary: '#3D6FD5',
                    'primary-darken-1': '#277CC1',
                    secondary: '#8A8D93',
                    'secondary-darken-1': '#48A9A6',
                    error: '#FF4C51',
                    info: '#16B1FF',
                    success: '#56CA00',
                    warning: '#FFB400',
                    'light_blue': '#5A9CF8',
                    'on-background': '#E7E3FC',
                    'on-surface': '#E7E3FC',
                    'on-primary': '#FFFFFF',
                    'on-secondary': '#FFFFFF',
                    'on-success': '#FFFFFF',
                    'on-warning': '#FFFFFF',
                    divider: '#E7E3FC',
                    'side-bar': '#111827',
                    'side-bar-hover': '#303542',
                    navitem: '#19202F',
                    'card-bg': '#171D2B',
                    'history-card': '#252B3A',
                    'history-card-bg': '#171D2B',
                    'config-card': '#252B3A',
                    'selected-card': '#6B6D73',
                    'tree-node-active': '#2D3241',
                    'input-grey': '#838188',
                    scrollbar: '#343A52',
                    'perfect-scrollbar-thumb': '#4A5072',
                    'skin-bordered-background': '#312D4B',
                    'skin-bordered-surface': '#312D4B',
                    'magic-icon': '#FFFFFF'
                }
            },
            light: {
                colors: {
                    background: '#F4F5FA',
                    surface: '#FFFFFF',
                    'surface-bright': '#FFFFFF',
                    'surface-light': '#F5F5F5',
                    'surface-variant': '#E0E0E0',
                    'on-surface-variant': '#757575',
                    primary: '#3D6FD5',
                    'primary-darken-1': '#277CC1',
                    secondary: '#8A8D93',
                    'secondary-darken-1': '#48A9A6',
                    error: '#FF4C51',
                    info: '#16B1FF',
                    success: '#56CA00',
                    warning: '#FFB400',
                    'light_blue': '#5A9CF8',
                    'on-background': '#2F2B3D',
                    'on-surface': '#2F2B3D',
                    'on-primary': '#FFFFFF',
                    'on-secondary': '#FFFFFF',
                    'on-success': '#FFFFFF',
                    'on-warning': '#FFFFFF',
                    divider: '#E0E0E0',
                    'side-bar': '#FFFFFF',
                    'side-bar-hover': '#F0F2F8',
                    navitem: '#F8F9FC',
                    'card-bg': '#FFFFFF',
                    'history-card': '#F5F5F5',
                    'history-card-bg': '#FFFFFF',
                    'config-card': '#F5F5F5',
                    'selected-card': '#E8E8E8',
                    'tree-node-active': '#EEF2FF',
                    'input-grey': '#9E9E9E',
                    scrollbar: '#D0D0D0',
                    'perfect-scrollbar-thumb': '#BDBDBD',
                    'skin-bordered-background': '#FFFFFF',
                    'skin-bordered-surface': '#FFFFFF',
                    'magic-icon': '#2F2B3D'
                }
            }
        }
    }
});

// 创建 Vue 应用
const app = createApp({
    computed: {
        filteredMenuItems() {
            if (!this.isMobile) return this.menuItems;
            const footerIds = this.footerNavItems.map(f => f.id);
            return this.menuItems.filter(item => !footerIds.includes(item.id));
        }
    },
    components: {
        DashboardPage,
        CachePage,
        Helper115Page,
        Helper123Page,
        MediaServerPage,
        StrmToolsPage,
        LogsPage,
        ShareStrmPage,
        Strm123Page,
        CleanerPage,
        HDHivePage,
        SettingsPage,
        QRCodePage,
        ToolboxPage,
        SubscribePage,
        DiscoverPage,
        DiscoverDetailPage,
        PersonDetailPage,
        MediaBrowsePage,
        FileOrganizePage,
        FileTransferPage,
        TransferConfigPage,
        TransferHistoryPage,
        FileManagerPage,
        DockerManagerPage
    },
    
    data() {
        return {
            drawer: window.innerWidth >= 1200, // 宽屏时默认展开
            isMobile: window.innerWidth < 768,
            showMenuButton: window.innerWidth < 1200, // 控制汉堡菜单显示
            currentRoute: 'dashboard',
            loading: true,
            
            // 版本号
            version: 'null', // 从 API 加载（version.py），读取不到显示 null
            
            // 主题设置
            themeMode: localStorage.getItem('themeMode') || 'dark', // 'auto', 'light', 'dark' - 默认深色
            currentTheme: localStorage.getItem('theme') || 'dark', // 当前实际主题
            isDark: (localStorage.getItem('theme') || 'dark') === 'dark', // 简单布尔值，用于模板绑定
            
            // 消息提示
            snackbar: {
                show: false,
                message: '',
                color: 'success',
                timeout: 2000
            },
            // 提示框计时器
            snackbarTimer: null,
            
            // 识别测试弹窗
            recognizeDialog: false,
            recognizeForm: { input: '', customIdentifiers: '', customReleaseGroups: '', customCaptures: '', customPostRenderWords: '' },
            recognizeForceGpt: false,
            recognizeLoading: false,
            recognizeResult: null,
            recognizeShowResult: false,
            recognizeLastInput: '',
            recognizeLastInputMode: 'title',
            
            // 日志弹窗
            logDialog: false,
            logType: 'system',
            logTypes: [
                { title: '系统', value: 'system' },
                { title: '302', value: '302' },
                { title: 'API', value: '302api' },
                { title: 'STRM', value: 'share_strm' },
                { title: '整理', value: 'organize' },
                { title: '订阅', value: 'subscribe' }
            ],
            logContent: [],
            logRefreshInterval: null,
            
            // 确认对话框
            confirmDialog: {
                show: false,
                title: '',
                message: '',
                onConfirm: null
            },
            
            // 侧边栏菜单
            menuItems: [
                { id: 'dashboard', title: '仪表盘', icon: 'mdi-view-dashboard', path: '/dashboard' },
                { id: 'logs', title: '日志', icon: 'mdi-text-box', path: '/logs' },
                { id: 'cache', title: '缓存管理', icon: 'mdi-cached', path: '/cache' },
                { id: 'toolbox', title: '工具箱', icon: 'mdi-toolbox', path: '/toolbox' },
                { id: 'docker_manager', title: 'Docker 管理', icon: 'mdi-docker', path: '/docker_manager' },
                { id: 'media_server', title: '媒体服务器', icon: 'mdi-filmstrip', path: '/media_server' },
                { id: 'strm_tools', title: 'STRM 工具', icon: 'mdi-file-video-outline', path: '/strm_tools' },
                { id: 'file_organize', title: '文件整理', icon: 'mdi-folder-sync-outline', path: '/file_organize' },
                { id: 'transfer_history', title: '整理历史', icon: 'mdi-history', path: '/transfer_history' },
                { id: 'file_manager', title: '文件管理', icon: 'mdi-folder-open-outline', path: '/file_manager' },
                { id: 'subscribe', title: '订阅', icon: 'mdi-rss', path: '/subscribe' },
                { id: 'discover', title: '看板', icon: 'mdi-movie-open', path: '/discover' },
                { id: 'settings', title: '设置', icon: 'mdi-cog', path: '/settings' },
            ],
            
            // 移动端底部导航
            footerNavItems: [
                { id: 'dashboard', title: '仪表盘', icon: 'mdi-home-outline', activeIcon: 'mdi-home' },
                { id: 'subscribe', title: '订阅', icon: 'mdi-rss', activeIcon: 'mdi-rss' },
                { id: 'discover', title: '看板', icon: 'mdi-movie-open-outline', activeIcon: 'mdi-movie-open' },
            ],
            
            // 调试模式
            debugMode: false,
            
            
            // 提交分享STRM弹窗
            shareStrmDialog: false,
            shareStrmContent: '',
            shareStrmFolders: [],
            shareStrmPathIndex: 0,
            shareStrmSubmitting: false,
            // 转存再分享确认弹窗
            reshareConfirmDialog: false,
            
            // 数据
            stats: [],
            systemUsage: {},
            configs: []
        }
    },
    
    async mounted() {
        // 检查登录状态
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        // 加载版本号
        await this.loadVersion();
        
        // 加载调试模式状态
        await this.loadDebugStatus();
        
        // 根据屏幕大小设置侧边栏状态
        this.updateLayoutByWidth();
        
        // 初始化主题
        this.initTheme();
        
        // 监听路由变化（含旧路由兼容重定向）
        const toolboxRedirects = ['helper115', 'helper123', 'hdhive', 'cleaner', 'qrcode'];
        window.addEventListener('route-change', (e) => {
            const path = e.detail.path;
            if (toolboxRedirects.includes(path)) {
                router.push('toolbox/' + path);
                return;
            }
            // 旧路由兼容：分享 STRM 日志已整合到 115 分享 STRM 页面
            if (path === 'toolbox/share_strm_logs' || path === 'share_strm_logs') {
                router.push('strm_tools/share_strm');
                return;
            }
            // 旧路由兼容：Emby 助手和秒传播放已移入媒体服务器
            if (path === 'helper_emby' || path === 'fast_transfer') {
                router.push('media_server/' + path);
                return;
            }
            // 旧路由兼容：115 分享 STRM 和 123 STRM 已移入 STRM 工具
            if (path === 'share_strm' || path === 'strm_123') {
                router.push('strm_tools/' + path);
                return;
            }
            if (path === 'history') {
                router.push('transfer_history');
                return;
            }
            this.currentRoute = path;
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.updateLayoutByWidth();
        });
        
        // 将 showMessage 方法挂载到 window，供子组件使用
        window.showMessage = this.showMessage.bind(this);
        // 将 copyToClipboard 方法挂载到 window，供子组件使用
        window.copyText = (text, msg) => this.copyToClipboard(text, msg);
        
        // 初始化路由（含旧路由兼容重定向）
        const initRoute = router.getCurrentRoute();
        if (toolboxRedirects.includes(initRoute)) {
            router.push('toolbox/' + initRoute);
        } else if (initRoute === 'toolbox/share_strm_logs' || initRoute === 'share_strm_logs') {
            router.push('strm_tools/share_strm');
        } else if (initRoute === 'share_strm' || initRoute === 'strm_123') {
            router.push('strm_tools/' + initRoute);
        } else if (initRoute === 'helper_emby' || initRoute === 'fast_transfer') {
            router.push('media_server/' + initRoute);
        } else if (initRoute === 'history') {
            router.push('transfer_history');
        } else {
            this.currentRoute = initRoute;
        }
        
        // 页面加载时获取数据
        await this.loadData();
        
    },
    
    beforeUnmount() {},

    
    methods: {

        copyToClipboard(text, msg) {
            const successMsg = msg || '已复制到剪贴板';
            const fallback = (t) => {
                const el = document.createElement('textarea');
                el.value = t;
                el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
                document.body.appendChild(el);
                el.focus();
                el.select();
                el.setSelectionRange(0, t.length);
                try {
                    document.execCommand('copy');
                    window.showMessage && window.showMessage(successMsg, 'success');
                } catch (e) {
                    window.showMessage && window.showMessage('复制失败，请手动复制', 'error');
                } finally {
                    document.body.removeChild(el);
                }
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showMessage && window.showMessage(successMsg, 'success');
                }).catch(() => fallback(text));
            } else {
                fallback(text);
            }
        },
        
        // 加载版本号
        async loadVersion() {
            try {
                const data = await api.request('/version');
                if (data.success && data.version) {
                    this.version = data.version;
                }
            } catch (error) {
                console.error('加载版本号失败:', error);
                // 使用默认版本号
            }
        },
        
        // 加载调试模式状态
        async loadDebugStatus() {
            try {
                const data = await api.getDebugStatus();
                this.debugMode = data.debug_mode || false;
            } catch (error) {
                console.error('加载调试模式状态失败:', error);
            }
        },
        
        // 切换调试模式
        async toggleDebugMode() {
            try {
                const result = await api.toggleDebugMode();
                if (result.success) {
                    this.debugMode = result.data.debug_mode;
                    this.showMessage(result.message, 'success');
                } else {
                    this.showMessage(result.message || '切换失败', 'error');
                }
            } catch (error) {
                this.showMessage('切换调试模式失败', 'error');
            }
        },
        
        // 停止分享线程
        async stopShareTasks() {
            try {
                const result = await api.stopShareTasks();
                if (result.success) {
                    this.showMessage(result.message || '分享任务已停止', 'success');
                } else {
                    this.showMessage(result.message || '停止失败', 'error');
                }
            } catch (error) {
                this.showMessage('停止分享线程失败', 'error');
            }
        },
        
        // 打开提交分享STRM弹窗
        async openShareStrmDialog() {
            // 加载STRM目录配置
            try {
                const config = await api.getShareStrmConfig();
                this.shareStrmFolders = config.strm_folders || [];
                this.shareStrmPathIndex = 0;
                this.shareStrmContent = '';
                this.shareStrmDialog = true;
            } catch (error) {
                this.showMessage('加载配置失败', 'error');
            }
        },
        
        // 提交分享STRM（第一步：检查链接）
        submitShareStrmCheck() {
            if (!this.shareStrmContent.trim()) {
                this.showMessage('请输入分享链接', 'error');
                return;
            }
            // 检查是否包含115链接（支持有密码和无密码的链接格式）
            const pattern = /(?:https?:\/\/)?115(?:cdn)?\.com\/s\/[a-zA-Z0-9]+/;
            if (!pattern.test(this.shareStrmContent)) {
                this.showMessage('未找到有效的115分享链接', 'error');
                return;
            }
            // 弹出转存再分享确认
            this.shareStrmDialog = false;
            this.reshareConfirmDialog = true;
        },
        
        // 提交分享STRM（第二步：执行）
        async doSubmitShareStrm(enableReshare) {
            this.reshareConfirmDialog = false;
            this.shareStrmSubmitting = true;
            try {
                const result = await api.submitShareStrm(
                    this.shareStrmContent,
                    enableReshare,
                    this.shareStrmPathIndex
                );
                if (result.success) {
                    this.showMessage(result.message || '任务已提交', 'success');
                    this.shareStrmContent = '';
                } else {
                    this.showMessage(result.message || '提交失败', 'error');
                }
            } catch (error) {
                this.showMessage('提交失败: ' + (error.message || '未知错误'), 'error');
            } finally {
                this.shareStrmSubmitting = false;
            }
        },
        
        // 初始化主题
        initTheme() {
            // 直接应用保存的主题，默认深色
            this.applyTheme(this.themeMode);
        },
        
        // 应用主题
        applyTheme(theme) {
            this.currentTheme = theme;
            this.isDark = theme === 'dark';
            this.$vuetify.theme.global.name = theme;
            localStorage.setItem('theme', theme);
        },
        
        // 手动切换主题
        toggleTheme() {
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.themeMode = newTheme;
            localStorage.setItem('themeMode', newTheme);
            this.applyTheme(newTheme);
            this.showMessage(newTheme === 'dark' ? '已切换到深色主题' : '已切换到浅色主题', 'success');
        },
        
        // 获取当前是否为深色主题
        isDarkTheme() {
            // 防御性检查，确保在组件未完全初始化时也能正常工作
            if (this.currentTheme !== undefined) {
                return this.currentTheme === 'dark';
            }
            // 回退到 localStorage 或默认值
            return (localStorage.getItem('theme') || 'dark') === 'dark';
        },
        
        // 根据窗口宽度更新布局
        updateLayoutByWidth() {
            const width = window.innerWidth;
            this.isMobile = width < 768;
            
            if (width >= 1200) {
                // 宽屏：侧边栏展开，隐藏汉堡菜单
                this.drawer = true;
                this.showMenuButton = false;
            } else {
                // 窄屏或开了F12：侧边栏收起，显示汉堡菜单
                this.drawer = false;
                this.showMenuButton = true;
            }
        },
        
        // 切换侧边栏
        toggleDrawer() {
            this.drawer = !this.drawer;
        },
        // 返回上一页
        goBack() {
            router.back();
        },
        // 加载所有数据
        async loadData() {
            this.loading = true;
            try {
                const [stats, systemUsage, configs] = await Promise.all([
                    api.getStats(),
                    api.getSystemUsage(),
                    api.getConfigs()
                ]);
                
                this.stats = stats;
                this.systemUsage = systemUsage;
                this.configs = configs;
            } catch (error) {
                console.error('加载数据失败:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 选择菜单并导航
        selectMenu(item) {
            router.push(item.id);
            // 只在移动端或窄屏时点击菜单后关闭侧边栏
            if (this.isMobile || window.innerWidth < 1200) {
                this.drawer = false;
            }
        },
        
        // 刷新数据
        async refreshData() {
            await this.loadData();
        },
        
        // 获取当前页面标题
        getCurrentTitle() {
            // 处理工具箱子路由
            if (this.currentRoute.startsWith('toolbox')) {
                return '工具箱';
            }
            // 处理看板详情页
            if (this.currentRoute.startsWith('discover/detail')) {
                return '详情';
            }
            // 处理演员详情页
            if (this.currentRoute.startsWith('discover/person')) {
                return '演员';
            }
            // 处理更多浏览页
            if (this.currentRoute.startsWith('discover/browse')) {
                return '更多';
            }
            // 处理媒体服务器子路由
            if (this.currentRoute.startsWith('media_server')) {
                return '媒体服务器';
            }
            // 处理 STRM 工具子路由
            if (this.currentRoute.startsWith('strm_tools')) {
                return 'STRM 工具';
            }
            const base = this.currentRoute.split('/')[0];
            const item = this.menuItems.find(i => i.id === base);
            return item ? item.title : '仪表盘';
        },
        
        // 获取当前页面组件名
        getCurrentComponent() {
            // 工具箱及其子路由统一使用 ToolboxPage
            if (this.currentRoute.startsWith('toolbox')) {
                return 'ToolboxPage';
            }
            // Docker 管理及其子路由
            if (this.currentRoute.startsWith('docker_manager')) {
                return 'DockerManagerPage';
            }
            // 媒体服务器及其子路由统一使用 MediaServerPage
            if (this.currentRoute.startsWith('media_server')) {
                return 'MediaServerPage';
            }
            // STRM 工具及其子路由统一使用 StrmToolsPage
            if (this.currentRoute.startsWith('strm_tools')) {
                return 'StrmToolsPage';
            }
            // 文件整理及其子路由统一使用 FileOrganizePage
            if (this.currentRoute.startsWith('file_organize')) {
                return 'FileOrganizePage';
            }
            // 看板详情页
            if (this.currentRoute.startsWith('discover/detail')) {
                return 'DiscoverDetailPage';
            }
            // 演员详情页
            if (this.currentRoute.startsWith('discover/person')) {
                return 'PersonDetailPage';
            }
            // 更多浏览页
            if (this.currentRoute.startsWith('discover/browse')) {
                return 'MediaBrowsePage';
            }
            const base = this.currentRoute.split('/')[0];
            const componentMap = {
                'dashboard': 'DashboardPage',
                'cache': 'CachePage',
                'media_server': 'MediaServerPage',
                'strm_tools': 'StrmToolsPage',
                'logs': 'LogsPage',
                'file_organize': 'FileOrganizePage',
                'file_transfer': 'FileTransferPage',
                'transfer_config': 'TransferConfigPage',
                'transfer_history': 'TransferHistoryPage',
                'file_manager': 'FileManagerPage',
                'subscribe': 'SubscribePage',
                'discover': 'DiscoverPage',
                'settings': 'SettingsPage',
                'docker_manager': 'DockerManagerPage'
            };
            return componentMap[base] || 'DashboardPage';
        },
        
        // 获取用于页面过渡动画的 key（工具箱内部导航不触发外层过渡）
        getRouteKey() {
            if (this.currentRoute.startsWith('toolbox')) {
                return 'toolbox';
            }
            if (this.currentRoute.startsWith('media_server')) {
                return 'media_server';
            }
            if (this.currentRoute.startsWith('strm_tools')) {
                return 'strm_tools';
            }
            if (this.currentRoute.startsWith('file_organize')) {
                return 'file_organize';
            }
            if (this.currentRoute.startsWith('docker_manager')) {
                return 'docker_manager';
            }
            if (this.currentRoute.startsWith('discover/detail')) {
                return 'discover/detail';
            }
            if (this.currentRoute.startsWith('discover/person')) {
                return 'discover/person';
            }
            return this.currentRoute;
        },
        
        // 重启系统
        restartSystem() {
            this.confirmDialog.title = '重启系统';
            this.confirmDialog.message = '确定要重启系统吗？重启过程可能需要几秒钟。';
            this.confirmDialog.onConfirm = async () => {
                try {
                    const result = await api.request('/system/restart', { method: 'POST' });
                    if (result && result.success) {
                        this.showMessage('系统正在重启，请稍候刷新页面...', 'success');
                    } else {
                        this.showMessage((result && result.message) || '重启失败', 'error');
                    }
                } catch (error) {
                    // 请求可能因为服务重启而失败，这是正常的
                    this.showMessage('系统正在重启，请稍候刷新页面...', 'success');
                }
            };
            this.confirmDialog.show = true;
        },
        
        // 退出登录
        logout() {
            this.confirmDialog.title = '退出登录';
            this.confirmDialog.message = '确定要退出登录吗？';
            this.confirmDialog.onConfirm = () => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('username');
                window.location.href = '/login.html';
            };
            this.confirmDialog.show = true;
        },
        
        async openRecognizeDialog() {
            this.recognizeDialog = true;
            this.recognizeResult = null;
            this.recognizeShowResult = false;
            try {
                const [idRes, rgRes, phRes, prRes] = await Promise.all([
                    api.request('/transfer_config/custom_identifiers'),
                    api.request('/transfer_config/custom_release_groups'),
                    api.request('/transfer_config/custom_captures'),
                    api.request('/transfer_config/post_render_words'),
                ]);
                if (idRes.success) this.recognizeForm.customIdentifiers = (idRes.data || []).join('\n');
                if (rgRes.success) this.recognizeForm.customReleaseGroups = (rgRes.data || []).join('\n');
                if (phRes.success) this.recognizeForm.customCaptures = (phRes.data || []).join('\n');
                if (prRes.success) this.recognizeForm.customPostRenderWords = (prRes.data || []).join('\n');
            } catch (error) {
                this.showMessage('加载识别测试配置失败: ' + (error.message || ''), 'warning');
            }
        },
        blurRecognizeInput() {
            if (typeof document === 'undefined') {
                return;
            }
            const activeElement = document.activeElement;
            if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) && typeof activeElement.blur === 'function') {
                activeElement.blur();
                return;
            }
            const focusedField = document.querySelector('.recognize-dialog input:focus, .recognize-dialog textarea:focus');
            if (focusedField && typeof focusedField.blur === 'function') {
                focusedField.blur();
            }
        },
        looksLikeRecognizePath(value) {
            const normalizedValue = String(value || '').trim();
            if (!normalizedValue) {
                return false;
            }
            if (normalizedValue.startsWith('/') || normalizedValue.startsWith('\\')) {
                return true;
            }
            if (normalizedValue.length > 2 && [':\\', ':/'].includes(normalizedValue.slice(1, 3))) {
                return true;
            }
            if (!normalizedValue.includes('/') && !normalizedValue.includes('\\')) {
                return false;
            }
            const normalizedPath = normalizedValue.replace(/\\/g, '/').replace(/\/+$/, '');
            const lastSeparatorIndex = normalizedPath.lastIndexOf('/');
            return lastSeparatorIndex > 0 && lastSeparatorIndex < normalizedPath.length - 1;
        },
        splitRecognizeLines(value) {
            return String(value || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean);
        },
        // 识别测试
        async doRecognize() {
            const primaryInput = String(this.recognizeForm.input || '').trim();
            if (!primaryInput) {
                this.showMessage('请输入标题、文件名或路径', 'error');
                return;
            }
            this.blurRecognizeInput();
            this.recognizeLoading = true;
            this.recognizeShowResult = false;
            try {
                const payload = {
                    force_gpt: this.recognizeForceGpt,
                };
                const isPathInput = this.looksLikeRecognizePath(primaryInput);
                if (isPathInput) {
                    payload.path = primaryInput;
                } else {
                    payload.title = primaryInput;
                }
                this.recognizeLastInput = primaryInput;
                this.recognizeLastInputMode = isPathInput ? 'path' : 'title';
                const customIdentifiers = this.splitRecognizeLines(this.recognizeForm.customIdentifiers);
                const customReleaseGroups = this.splitRecognizeLines(this.recognizeForm.customReleaseGroups);
                const customCaptures = this.splitRecognizeLines(this.recognizeForm.customCaptures);
                const customPostRenderWords = this.splitRecognizeLines(this.recognizeForm.customPostRenderWords);
                if (customIdentifiers.length) payload.custom_identifiers = customIdentifiers;
                if (customReleaseGroups.length) payload.custom_release_groups = customReleaseGroups;
                if (customCaptures.length) payload.custom_captures = customCaptures;
                if (customPostRenderWords.length) payload.custom_post_render_words = customPostRenderWords;
                const result = await api.request('/nameparser/test', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                if (result.success) {
                    this.recognizeResult = result.data;
                    this.recognizeShowResult = true;
                    if (result.data.warnings && result.data.warnings.length > 0) {
                        result.data.warnings.forEach(w => this.showMessage('⚠️ ' + w, 'warning'));
                    }
                } else {
                    this.showMessage(result.message || '识别失败', 'error');
                }
            } catch (error) {
                this.showMessage('识别请求失败: ' + (error.message || ''), 'error');
            } finally {
                this.recognizeLoading = false;
            }
        },
        closeRecognizeDialog() {
            this.recognizeDialog = false;
            this.recognizeResult = null;
            this.recognizeShowResult = false;
            this.recognizeForm = { input: '', customIdentifiers: '', customReleaseGroups: '', customCaptures: '', customPostRenderWords: '' };
            this.recognizeForceGpt = false;
            this.recognizeLastInput = '';
            this.recognizeLastInputMode = 'title';
        },
        // 显示消息提示
        showMessage(message, type = 'success') {
            // 清除之前的计时器
            if (this.snackbarTimer) {
                clearTimeout(this.snackbarTimer);
                this.snackbarTimer = null;
            }
            
            this.snackbar.message = message;
            this.snackbar.color = type;
            this.snackbar.show = true;
            
            // 强制2秒后关闭提示（解决页面切换时不消失的问题）
            this.snackbarTimer = setTimeout(() => {
                this.snackbar.show = false;
                this.snackbarTimer = null;
            }, 2000);
        },
        
        // 获取日志内容
        async loadLogContent() {
            try {
                const result = await api.getLogs(this.logType);
                if (result && result.data) {
                    this.logContent = result.data;
                }
            } catch (error) {
                console.error('加载日志失败:', error);
            }
        },
        
        // 清空当前日志
        async clearCurrentLog() {
            try {
                const result = await api.request(`/logs/${this.logType}/clear`, { method: 'POST' });
                if (result.success) {
                    this.logContent = [];
                    this.showMessage('日志已清空', 'success');
                } else {
                    this.showMessage(result.message || '清空失败', 'error');
                }
            } catch (error) {
                this.showMessage('清空日志失败', 'error');
            }
        },
        
        // 打开日志弹窗
        async openLogDialog() {
            this.logDialog = true;
            await this.loadLogContent();
            // 启动实时刷新
            this.logRefreshInterval = setInterval(() => {
                this.loadLogContent();
            }, 3000);
        },
        
        // 关闭日志弹窗
        closeLogDialog() {
            this.logDialog = false;
            if (this.logRefreshInterval) {
                clearInterval(this.logRefreshInterval);
                this.logRefreshInterval = null;
            }
        },
        
        // 日志类型变化时重新加载
        async onLogTypeChange(type) {
            this.logType = type;
            await this.loadLogContent();
        },
        
        // 获取日志类型名称
        getLogTypeName() {
            const names = { 'system': '系统日志', '302': '302日志', '302api': '分享API', 'share_strm': 'STRM日志', 'organize': '整理日志', 'hdhive': '整理日志', 'subscribe': '订阅日志' };
            return names[this.logType] || '系统日志';
        },
        
        // 查看全部日志（带 token 直接打开）
        viewFullLog() {
            const token = localStorage.getItem('auth_token');
            const url = '/api/logs/' + this.logType + '/full' + (token ? '?token=' + encodeURIComponent(token) : '');
            window.open(url, '_blank');
        },
        
        // 日志解析函数（委托给公共 LogUtils）
        getLogLevel(line) { return LogUtils.getLogLevel(line); },
        getLogLevelColor(level) { return LogUtils.getLogLevelColor(level); },
        getLogTime(line) { return LogUtils.getLogTime(line); },
        getLogMessage(line) { return LogUtils.getLogMessage(line); }
    },
    
    template: `
        <v-app>
            <!-- 加载动画 -->
            <div v-if="loading" class="loading">
                <div class="loading-spinner"></div>
            </div>

            <!-- 主界面 -->
            <template v-else>
                <!-- 侧边栏 - 智能响应式布局 -->
                <v-navigation-drawer
                    v-model="drawer"
                    :temporary="isMobile || showMenuButton"
                    :permanent="!isMobile && !showMenuButton"
                    :width="showMenuButton ? 210 : 256"
                    class="magic-sidebar"
                    style="background: rgb(var(--v-theme-background)); display: flex; flex-direction: column;"
                >
                    <!-- Logo区域 - 固定顶部 -->
                    <div class="logo-wrapper mt-3" style="flex-shrink: 0;">
                        <div class="logo v-theme--dark">
                            <img src="assets/images/sidebar-icon.png" class="logo-image" alt="NanShare">
                        </div>
                    </div>

                    <!-- 菜单内容 - 可滚动区域 -->
                    <div class="sidebar-menu-scroll" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 70px;">
                        <div class="menu-category">
                            <div class="menu-items pr-5">
                                <div 
                                    v-for="item in filteredMenuItems" 
                                    :key="item.id"
                                    class="menu-item magic-hover my-2"
                                    :class="{ active: currentRoute === item.id || currentRoute.startsWith(item.id + '/') }"
                                    @click="selectMenu(item)"
                                >
                                    <div class="item-content">
                                        <v-icon class="item-icon" size="28">{{ item.icon }}</v-icon>
                                        <span class="item-title">{{ item.title }}</span>
                                    </div>
                                    <div class="hover-effect"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 版本号 - 固定底部 -->
                    <div style="flex-shrink: 0; padding: 12px 16px 16px; display: flex; align-items: center; justify-content: center;">
                        <div class="version-container" :style="{ display: 'flex', alignItems: 'center', padding: '8px 14px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: '20px' }">
                            <img src="assets/images/github.png" class="icon" width="22" height="22" style="opacity: 0.6; margin-right: 8px;" :style="isDark ? '' : 'filter: invert(0.6)'">
                            <span class="version-text" :style="{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '15px', fontWeight: '600' }">v{{ version }}</span>
                        </div>
                    </div>
                </v-navigation-drawer>

                <!-- 顶部应用栏 -->
                <v-app-bar 
                    class="fixed-header safe-area-top" 
                    app
                    style="backdrop-filter: blur(10px); background-color: rgba(var(--v-theme-background), 0.7);"
                >
                    <!-- 汉堡菜单按钮 - 只在需要时显示 -->
                    <v-btn 
                        v-if="showMenuButton" 
                        icon 
                        variant="text" 
                        color="primary" 
                        @click="toggleDrawer"
                    >
                        <v-icon>mdi-menu</v-icon>
                    </v-btn>

                    <!-- 返回按钮 - 详情子页面时显示 -->
                    <v-btn
                        v-if="currentRoute.startsWith('discover/detail') || currentRoute.startsWith('discover/person') || currentRoute.startsWith('discover/browse')"
                        icon
                        variant="text"
                        size="small"
                        @click="goBack"
                    >
                        <v-icon size="22">mdi-arrow-left</v-icon>
                    </v-btn>

                    <v-spacer></v-spacer>

                    <!-- 右上角按钮组 -->
                    <div class="header-actions" style="display: flex; align-items: center; gap: 4px; margin-right: 8px;">
                        <v-tooltip text="名称识别测试" location="bottom">
                            <template v-slot:activator="{ props }">
                                <v-btn icon variant="text" class="header-icon-btn" @click="openRecognizeDialog" v-bind="props">
                                    <v-icon>mdi-text-recognition</v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>

                        <div class="header-divider"></div>

                        <v-tooltip text="查看日志" location="bottom">
                            <template v-slot:activator="{ props }">
                                <v-btn icon variant="text" class="header-icon-btn" @click="openLogDialog" v-bind="props">
                                    <v-icon>mdi-text-box-outline</v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>

                        <div class="header-divider"></div>

                        <v-tooltip :text="isDark ? '切换到浅色主题' : '切换到深色主题'" location="bottom">
                            <template v-slot:activator="{ props }">
                                <v-btn icon variant="text" class="header-icon-btn" @click="toggleTheme" v-bind="props">
                                    <v-icon>{{ isDark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>

                        <div class="header-divider"></div>

                        <v-menu location="bottom end" offset="14px" :close-on-content-click="true" scrim>
                            <template v-slot:activator="{ props }">
                                <v-btn icon variant="text" class="header-icon-btn" v-bind="props">
                                    <v-icon>mdi-dots-vertical</v-icon>
                                </v-btn>
                            </template>
                            <v-list class="elegant-menu pt-0">
                                <v-list-item @click="selectMenu({id: 'settings'})" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper primary-icon">
                                            <v-icon size="18">mdi-cog-outline</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>设置</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="toggleDebugMode" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper" :class="debugMode ? 'warning-icon' : 'info-icon'">
                                            <v-icon size="18">{{ debugMode ? 'mdi-bug-check-outline' : 'mdi-bug-outline' }}</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>{{ debugMode ? '反代调试关' : '反代调试开' }}</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="openShareStrmDialog" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper success-icon">
                                            <v-icon size="18">mdi-send-outline</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>提交生成STRM</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="stopShareTasks" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper error-icon">
                                            <v-icon size="18">mdi-stop-circle-outline</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>停止分享线程</v-list-item-title>
                                </v-list-item>
                                <v-divider class="my-1"></v-divider>
                                <v-list-item @click="restartSystem" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper error-icon">
                                            <v-icon size="18">mdi-restart</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>重启系统</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="logout" class="elegant-menu-item">
                                    <template v-slot:prepend>
                                        <div class="menu-icon-wrapper warning-icon">
                                            <v-icon size="18">mdi-logout</v-icon>
                                        </div>
                                    </template>
                                    <v-list-item-title>退出登录</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                </v-app-bar>

                <!-- 主内容区 -->
                <v-main class="mt-5" :class="{'mobile-has-footer': isMobile}" style="background: rgb(var(--v-theme-background));">
                    <v-container fluid class="app-container">
                        <!-- 页面切换过渡动画 -->
                        <transition name="page-fade" mode="out-in">
                            <component 
                                :is="getCurrentComponent()"
                                :key="getRouteKey()"
                                :stats="stats"
                                :systemUsage="systemUsage"
                                :configs="configs"
                            ></component>
                        </transition>
                    </v-container>
                </v-main>
                
                <!-- 移动端底部导航栏 -->
                <div v-if="isMobile" class="footer-nav-container">
                    <div class="footer-nav-card" :style="{ backgroundColor: isDark ? 'rgba(22, 29, 44, 0.85)' : 'rgba(255, 255, 255, 0.85)' }">
                        <div class="footer-nav-group">
                            <div
                                v-for="item in footerNavItems"
                                :key="item.id"
                                class="footer-nav-btn"
                                :class="{ 'footer-nav-btn-active': currentRoute === item.id || currentRoute.startsWith(item.id + '/') }"
                                @click="selectMenu(item)"
                            >
                                <v-icon
                                    :size="(currentRoute === item.id || currentRoute.startsWith(item.id + '/')) ? 28 : 26"
                                    :color="(currentRoute === item.id || currentRoute.startsWith(item.id + '/')) ? 'primary' : (isDark ? 'grey-lighten-1' : 'grey-darken-1')"
                                >{{ (currentRoute === item.id || currentRoute.startsWith(item.id + '/')) ? item.activeIcon : item.icon }}</v-icon>
                                <span
                                    class="footer-nav-label"
                                    :style="{ color: (currentRoute === item.id || currentRoute.startsWith(item.id + '/')) ? 'rgb(var(--v-theme-primary))' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)') }"
                                >{{ item.title }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 全局消息提示 - 右下角通知 -->
                <v-snackbar
                    v-model="snackbar.show"
                    :color="snackbar.color"
                    :timeout="snackbar.timeout"
                    location="bottom right"
                    elevation="6"
                    rounded="lg"
                    min-width="280px"
                    class="enhanced-snackbar"
                >
                    <div style="display: flex; align-items: center; gap: 12px; padding: 4px 8px;">
                        <v-icon v-if="snackbar.color === 'success'" size="24">mdi-check-circle</v-icon>
                        <v-icon v-if="snackbar.color === 'error'" size="24">mdi-alert-circle</v-icon>
                        <v-icon v-if="snackbar.color === 'warning'" size="24">mdi-alert</v-icon>
                        <span style="font-size: 16px; font-weight: 500; line-height: 1.4;">{{ snackbar.message }}</span>
                    </div>
                </v-snackbar>
                
                <!-- 日志弹窗 -->
                <v-dialog v-model="logDialog" :fullscreen="isMobile" :max-width="isMobile ? '' : '800px'" scrollable class="log-dialog" transition="scale-transition" :rounded="isMobile ? '0' : 'xl'">
                    <v-card class="log-dialog-card" :rounded="isMobile ? '0' : 'xl'">
                        <!-- 标题栏 -->
                        <v-card-title class="d-flex justify-space-between align-center pa-4 log-dialog-title">
                            <div class="mt-3">
                                <span style="font-size: 22px;">实时日志</span>
                            </div>
                            <v-spacer></v-spacer>
                            <v-btn icon variant="text" color="primary" @click="closeLogDialog">
                                <v-icon>mdi-close</v-icon>
                            </v-btn>
                        </v-card-title>
                        
                        <!-- 工具栏 -->
                        <div class="px-4 pb-2 log-toolbar">
                            <div class="d-flex align-center justify-center flex-wrap" style="gap: 8px;">
                                <!-- 日志类型切换按钮组 -->
                                <v-btn-group density="compact" class="border rounded">
                                    <v-btn 
                                        v-for="t in logTypes" 
                                        :key="t.value"
                                        size="small"
                                        :class="logType === t.value ? 'bg-primary text-white' : (isDark ? 'text-grey-lighten-3' : 'text-grey-darken-2')"
                                        :variant="logType === t.value ? 'flat' : 'text'"
                                        class="font-medium px-2"
                                        style="height: auto; min-width: 45px; font-size: 12px;"
                                        @click="onLogTypeChange(t.value)"
                                    >{{ t.title }}</v-btn>
                                </v-btn-group>
                                
                                <!-- 清空按钮 -->
                                <v-btn color="info" variant="elevated" size="small" class="rounded-pill" @click="clearCurrentLog">
                                    <template v-slot:prepend><v-icon size="16">mdi-delete</v-icon></template>
                                    清空
                                </v-btn>
                                
                                <!-- 查看全部按钮 -->
                                <v-btn color="success" variant="tonal" size="small" style="border-radius: 8px;" @click="viewFullLog">
                                    <v-icon left size="18">mdi-open-in-new</v-icon>查看全部
                                </v-btn>
                            </div>
                        </div>
                        
                        <!-- 日志表格 -->
                        <v-card-text class="pa-0 log-table-container">
                            <div class="table-container">
                                <v-table hover class="logs-table" density="default">
                                    <tbody>
                                        <tr v-if="logContent.length === 0">
                                            <td class="py-3 pl-6 text-center" :style="{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }">
                                                <v-icon size="48" color="grey" class="mb-2">mdi-text-box-outline</v-icon>
                                                <p>暂无日志</p>
                                            </td>
                                        </tr>
                                        <tr v-for="(line, index) in logContent" :key="index">
                                            <td class="py-3 pl-6">
                                                <div class="d-flex align-center" style="gap: 16px;">
                                                    <span class="d-inline-flex align-center" style="min-width: 100px;">
                                                        <v-chip 
                                                            size="small" 
                                                            :color="getLogLevelColor(getLogLevel(line))"
                                                            class="font-medium px-3"
                                                        >{{ getLogLevel(line) }}</v-chip>
                                                    </span>
                                                    <span class="d-inline-flex align-center" :style="{ minWidth: '120px', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }">{{ getLogTime(line) }}</span>
                                                    <span style="white-space: normal; line-height: 1.6; word-break: break-word; max-width: 100%;">{{ getLogMessage(line) }}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-dialog>
                
                <!-- 确认对话框 -->
                <v-dialog v-model="confirmDialog.show" max-width="450px">
                    <v-card style="border-radius: 20px; overflow: hidden;">
                        <v-card-title style="background: linear-gradient(135deg, rgba(255,76,81,0.1), rgba(255,180,0,0.1)); padding: 24px; font-size: 22px; font-weight: 600;">
                            <v-icon color="warning" size="32" style="margin-right: 12px;">mdi-alert-circle</v-icon>
                            {{ confirmDialog.title }}
                        </v-card-title>
                        <v-card-text style="padding: 24px; font-size: 16px; line-height: 1.6;">
                            {{ confirmDialog.message }}
                        </v-card-text>
                        <v-card-actions style="padding: 16px 24px 24px; gap: 12px;">
                            <v-spacer></v-spacer>
                            <v-btn color="grey" variant="elevated" size="large" @click="confirmDialog.show = false" style="border-radius: 12px; padding: 0 32px;">
                                <v-icon left>mdi-close</v-icon>
                                取消
                            </v-btn>
                            <v-btn color="warning" variant="elevated" size="large" @click="confirmDialog.show = false; confirmDialog.onConfirm && confirmDialog.onConfirm()" style="border-radius: 12px; padding: 0 32px;">
                                <v-icon left>mdi-check</v-icon>
                                确定
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
                
                <!-- 提交分享STRM弹窗 -->
                <v-dialog v-model="shareStrmDialog" max-width="460px">
                    <v-card style="border-radius: 16px; overflow: hidden;">
                        <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                            <v-icon color="success" size="22" class="mr-2">mdi-send-circle-outline</v-icon>
                            提交生成 STRM
                            <v-spacer></v-spacer>
                            <v-btn icon variant="text" size="x-small" @click="shareStrmDialog = false">
                                <v-icon size="20">mdi-close</v-icon>
                            </v-btn>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text style="padding: 16px 20px 12px;">
                            <v-textarea
                                v-model="shareStrmContent"
                                label="粘贴分享链接"
                                hint="可粘贴任意内容从中提取 115 链接，支持多链接"
                                persistent-hint
                                rows="3"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                class="mb-3"
                            ></v-textarea>
                            <v-select
                                v-if="shareStrmFolders.length > 1"
                                v-model="shareStrmPathIndex"
                                :items="shareStrmFolders.map((f, i) => ({ title: f.name || f.path, value: i }))"
                                label="输出目录"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                            <div v-else-if="shareStrmFolders.length === 1" :style="{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', fontSize: '12px' }">
                                输出目录: {{ shareStrmFolders[0].name || shareStrmFolders[0].path }}
                            </div>
                        </v-card-text>
                        <v-card-actions style="padding: 8px 20px 16px; gap: 8px; justify-content: flex-end;">
                            <v-btn variant="tonal" size="small" @click="shareStrmDialog = false" style="border-radius: 8px;">取消</v-btn>
                            <v-btn color="success" variant="elevated" size="small" @click="submitShareStrmCheck" :loading="shareStrmSubmitting" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-send</v-icon> 提交
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
                
                <!-- 识别测试弹窗 -->
                <v-dialog v-model="recognizeDialog" max-width="680px" scrollable class="recognize-dialog" transition="scale-transition">
                    <v-card class="recognize-card">
                        <!-- 标题栏 -->
                        <v-card-title class="recognize-header">
                            <div class="d-flex align-center">
                                <v-icon color="primary" size="22" class="mr-2">mdi-text-recognition</v-icon>
                                <span>名称识别测试</span>
                            </div>
                            <v-btn icon variant="text" size="x-small" @click="closeRecognizeDialog">
                                <v-icon size="20">mdi-close</v-icon>
                            </v-btn>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text class="recognize-body">
                            <!-- 输入区域 -->
                            <div class="recognize-input-area">
                                <v-text-field
                                    v-model="recognizeForm.input"
                                    label="标题或带路径(必须带扩展名)"
                                    placeholder="例如：The.Last.of.Us.S01E03.2160p.WEB-DL.mkv 或 /downloads/剧集/Season 1"
                                    prepend-inner-icon="mdi-text-recognition"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    @keyup.enter="doRecognize"
                                ></v-text-field>
                                <v-textarea
                                    v-model="recognizeForm.customIdentifiers"
                                    class="mt-3"
                                    label="临时识别词（每行一条，可选）"
                                    prepend-inner-icon="mdi-regex"
                                    variant="outlined"
                                    density="comfortable"
                                    rows="2"
                                    auto-grow
                                    hide-details
                                ></v-textarea>
                                <v-textarea
                                    v-model="recognizeForm.customReleaseGroups"
                                    class="mt-3"
                                    label="临时制作组（每行一条，可选）"
                                    prepend-inner-icon="mdi-account-group-outline"
                                    variant="outlined"
                                    density="comfortable"
                                    rows="2"
                                    auto-grow
                                    hide-details
                                ></v-textarea>
                                <v-textarea
                                    v-model="recognizeForm.customCaptures"
                                    class="mt-3"
                                    label="临时捕获词（每行一条，可选）"
                                    prepend-inner-icon="mdi-crosshairs-gps"
                                    variant="outlined"
                                    density="comfortable"
                                    rows="2"
                                    auto-grow
                                    hide-details
                                ></v-textarea>
                                <v-textarea
                                    v-model="recognizeForm.customPostRenderWords"
                                    class="mt-3"
                                    label="临时渲染后处理词（每行一条，可选）"
                                    prepend-inner-icon="mdi-auto-fix"
                                    variant="outlined"
                                    density="comfortable"
                                    rows="2"
                                    auto-grow
                                    hide-details
                                ></v-textarea>
                                <div class="recognize-actions">
                                    <v-switch v-model="recognizeForceGpt" label="强制 OpenAI" color="deep-purple" hide-details density="compact" style="flex: none;"></v-switch>
                                    <v-btn color="primary" variant="elevated" :loading="recognizeLoading" @click="doRecognize" class="recognize-btn">
                                        <v-icon start>{{ recognizeForceGpt ? 'mdi-robot-outline' : 'mdi-text-recognition' }}</v-icon>
                                        {{ recognizeLoading ? '识别中...' : (recognizeShowResult ? '重新识别' : '开始识别') }}
                                    </v-btn>
                                </div>
                            </div>
                            <!-- 识别结果 -->
                            <v-expand-transition>
                                <div v-if="recognizeShowResult && recognizeResult">
                                    <v-divider class="my-4"></v-divider>
                                    <!-- 海报和媒体信息 -->
                                    <div v-if="(recognizeResult.media_info && recognizeResult.media_info.title) || (recognizeResult.meta_info && recognizeResult.meta_info.name)" class="mt-4">
                                        <div class="recognize-result-layout">
                                            <div v-if="recognizeResult.media_info && recognizeResult.media_info.poster_path" class="recognize-poster">
                                                <v-img
                                                    :src="recognizeResult.media_info.poster_path"
                                                    aspect-ratio="2/3"
                                                    class="rounded-lg"
                                                ></v-img>
                                            </div>
                                            <div class="recognize-info">
                                                <div class="recognize-title">
                                                    {{ (recognizeResult.media_info && recognizeResult.media_info.title) || recognizeResult.meta_info.name }}
                                                    <span v-if="recognizeResult.meta_info.season_episode" class="recognize-season"> {{ recognizeResult.meta_info.season_episode }}</span>
                                                </div>
                                                <div v-if="(recognizeResult.media_info && recognizeResult.media_info.year) || recognizeResult.meta_info.year" class="recognize-year">{{ (recognizeResult.media_info && recognizeResult.media_info.year) || recognizeResult.meta_info.year }}</div>
                                                <v-alert v-if="!recognizeResult.media_info || !recognizeResult.media_info.tmdb_id" type="warning" variant="tonal" density="compact" class="my-2" style="font-size: 12px;">未查询到 TMDB 媒体信息</v-alert>
                                                <div v-if="recognizeResult.media_info && recognizeResult.media_info.overview" class="recognize-overview">{{ recognizeResult.media_info.overview }}</div>
                                                <div class="recognize-tags">
                                                    <v-chip v-if="(recognizeResult.media_info && recognizeResult.media_info.type) || recognizeResult.meta_info.type" size="small" color="blue" variant="tonal">{{ (recognizeResult.media_info && recognizeResult.media_info.type) || recognizeResult.meta_info.type }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.part" size="small" color="brown" variant="tonal">{{ recognizeResult.meta_info.part }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.resource_type" size="small" color="red" variant="tonal">{{ recognizeResult.meta_info.resource_type }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.resource_effect" size="small" color="deep-purple" variant="tonal">{{ recognizeResult.meta_info.resource_effect }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.resource_pix" size="small" color="pink" variant="tonal">{{ recognizeResult.meta_info.resource_pix }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.video_encode" size="small" color="orange" variant="tonal">{{ recognizeResult.meta_info.video_encode }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.audio_encode" size="small" color="amber" variant="tonal">{{ recognizeResult.meta_info.audio_encode }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.resource_team" size="small" color="cyan" variant="tonal">{{ recognizeResult.meta_info.resource_team }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.custom_capture" size="small" color="teal" variant="tonal">{{ recognizeResult.meta_info.custom_capture }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.web_source" size="small" color="green" variant="tonal">{{ recognizeResult.meta_info.web_source }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.fps" size="small" variant="tonal">{{ recognizeResult.meta_info.fps }}</v-chip>
                                                    <v-chip v-if="recognizeResult.meta_info.bit_depth" size="small" color="indigo" variant="tonal">{{ recognizeResult.meta_info.bit_depth }}</v-chip>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- 命中规则展示 -->
                                    <div v-if="recognizeResult.applied_rules && recognizeResult.applied_rules.length > 0" class="mt-3">
                                        <div :style="{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(47,43,61,0.66)', marginBottom: '6px' }">命中规则:</div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                            <v-chip v-for="(rule, idx) in recognizeResult.applied_rules" :key="idx" size="x-small" color="grey" variant="outlined">
                                                {{ rule.type }}: {{ rule.rule }}
                                            </v-chip>
                                        </div>
                                    </div>
                                    <div v-if="recognizeResult.rename_preview && (recognizeResult.rename_preview.display_rendered || recognizeResult.rename_preview.rendered)" class="mt-3">
                                        <div :style="{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(47,43,61,0.66)', marginBottom: '6px' }">重命名预览:</div>
                                        <div :style="{ padding: '12px', borderRadius: '10px', background: isDark ? 'rgba(61,111,213,0.08)' : 'rgba(61,111,213,0.06)', border: isDark ? '1px solid rgba(61,111,213,0.18)' : '1px solid rgba(61,111,213,0.16)' }">
                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                                                <v-chip size="x-small" color="primary" variant="tonal">{{ recognizeResult.rename_preview.template_key === 'tv_rename_format' ? '电视剧模板' : '电影模板' }}</v-chip>
                                                <v-chip v-if="recognizeResult.rename_preview.secondary_category" size="x-small" color="secondary" variant="tonal">{{ recognizeResult.rename_preview.secondary_category }}</v-chip>
                                            </div>
                                            <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ recognizeResult.rename_preview.display_rendered || recognizeResult.rename_preview.rendered }}</div>
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
                        </v-card-text>
                    </v-card>
                </v-dialog>
                
                <!-- 转存再分享确认弹窗 -->
                <v-dialog v-model="reshareConfirmDialog" max-width="380px">
                    <v-card style="border-radius: 16px; overflow: hidden;">
                        <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                            <v-icon color="info" size="22" class="mr-2">mdi-swap-horizontal</v-icon>
                            选择生成模式
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text style="padding: 14px 20px; font-size: 13px; line-height: 1.5;">
                            <span :style="{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }">转存再分享：先转存到你的账号再重新分享，适用于原链接可能失效的情况。</span>
                        </v-card-text>
                        <v-card-actions style="padding: 8px 20px 16px; gap: 8px; justify-content: flex-end;">
                            <v-btn variant="tonal" size="small" @click="reshareConfirmDialog = false; shareStrmDialog = true" style="border-radius: 8px;">返回</v-btn>
                            <v-btn color="primary" variant="elevated" size="small" @click="doSubmitShareStrm(false)" :loading="shareStrmSubmitting" style="border-radius: 8px;">直接生成</v-btn>
                            <v-btn color="success" variant="elevated" size="small" @click="doSubmitShareStrm(true)" :loading="shareStrmSubmitting" style="border-radius: 8px;">转存再分享</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </template>
        </v-app>
    `
});

app.use(vuetify);
app.mount('#app');
