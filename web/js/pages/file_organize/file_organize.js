// 文件整理页面组件（父页面，类似媒体服务器）
const FileOrganizePage = {
    name: 'FileOrganizePage',
    
    components: {
        FileTransferPage,
        TransferConfigPage
    },
    
    data() {
        return {
            subPage: '',
            tools: [
                { 
                    id: 'transfer_monitor', 
                    title: '整理监控', 
                    description: '管理文件整理任务的监控目录、整理方式与自动触发设置',
                    icon: 'mdi-folder-sync-outline',
                    color: '#43A047',
                    component: 'FileTransferPage'
                },
                { 
                    id: 'transfer_config', 
                    title: '整理配置', 
                    description: '配置重命名模板、整理通知模板与媒体探测等基础设置',
                    icon: 'mdi-tune-variant',
                    color: '#1E88E5',
                    component: 'TransferConfigPage',
                    configTab: 'basic'
                },
                { 
                    id: 'custom_identifiers', 
                    title: '自定义识别词', 
                    description: '添加自定义识别词以辅助文件名解析与媒体匹配',
                    icon: 'mdi-text-search',
                    color: '#8E24AA',
                    component: 'TransferConfigPage',
                    configTab: 'identifiers'
                },
                { 
                    id: 'custom_release_groups', 
                    title: '自定义制作组', 
                    description: '添加自定义制作组名称以提升资源识别准确度',
                    icon: 'mdi-account-group',
                    color: '#F4511E',
                    component: 'TransferConfigPage',
                    configTab: 'release_groups'
                },
                { 
                    id: 'custom_captures', 
                    title: '自定义捕获词', 
                    description: '定义自定义捕获词用于重命名模板的灵活扩展，支持命名捕获、条件替换等高级语法',
                    icon: 'mdi-crosshairs-gps',
                    color: '#00ACC1',
                    component: 'TransferConfigPage',
                    configTab: 'captures'
                },
                { 
                    id: 'post_render_words', 
                    title: '渲染后处理词', 
                    description: '对重命名模板渲染后的最终文件名进行正则替换后处理，支持高级语法',
                    icon: 'mdi-auto-fix',
                    color: '#5E35B1',
                    component: 'TransferConfigPage',
                    configTab: 'post_render_words'
                },
                { 
                    id: 'category_manage', 
                    title: '二级分类管理', 
                    description: '按类型、国家、语言等条件配置电影和电视剧的二级分类规则',
                    icon: 'mdi-folder-multiple',
                    color: '#FFB300',
                    component: 'TransferConfigPage',
                    configTab: 'category'
                }
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
            if (hash.startsWith('file_organize/')) {
                this.subPage = hash.replace('file_organize/', '');
            } else {
                this.subPage = '';
            }
        },
        
        openTool(tool) {
            router.push('file_organize/' + tool.id);
        },
        
        goBack() {
            router.push('file_organize');
        },
        
        getCurrentTool() {
            const base = this.subPage.split('/')[0];
            return this.tools.find(t => t.id === base);
        },

        getCurrentConfigTab() {
            const tool = this.getCurrentTool();
            return (tool && tool.configTab) || '';
        }
    },
    
    template: `
        <div>
            <transition name="toolbox-fade" mode="out-in">
                <!-- 文件整理主页 - 卡片列表 -->
                <div v-if="!subPage" key="file-organize-home">
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">文件整理</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(67,160,71,0.8), rgba(30,136,229,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    
                    <v-row>
                        <v-col v-for="(tool, index) in tools" :key="tool.id" cols="12" sm="6" lg="4">
                            <div 
                                class="toolbox-card"
                                :style="{ '--tool-color': tool.color }"
                                @click="openTool(tool)"
                            >
                                <div class="toolbox-card-icon" :style="{ background: 'rgba(128,128,128,0.08)' }">
                                    <v-icon :color="tool.color" size="38">{{ tool.icon }}</v-icon>
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
                
                <!-- 子页面 -->
                <div v-else :key="'organize-' + subPage.split('/')[0]">
                    <!-- 面包屑导航栏 -->
                    <div class="toolbox-breadcrumb">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <v-btn variant="text" color="primary" @click="goBack" style="border-radius: 10px; min-width: auto; padding: 0 10px; height: 40px;">
                                <v-icon size="26">mdi-arrow-left</v-icon>
                            </v-btn>
                            <v-chip size="large" variant="tonal" color="primary" @click="goBack" style="cursor: pointer; font-size: 15px; height: 36px;">
                                <v-icon start size="20">mdi-folder-sync-outline</v-icon>
                                文件整理
                            </v-chip>
                            <v-icon size="22" style="opacity: 0.4;">mdi-chevron-right</v-icon>
                            <v-chip size="large" variant="flat" color="primary" style="font-size: 15px; height: 36px;">
                                <v-icon v-if="getCurrentTool()?.icon" start size="20">{{ getCurrentTool().icon }}</v-icon>
                                {{ getCurrentTool()?.title || subPage }}
                            </v-chip>
                        </div>
                    </div>
                    
                    <!-- 动态渲染子组件 -->
                    <component v-if="getCurrentTool()?.component === 'FileTransferPage'" is="FileTransferPage" :key="subPage.split('/')[0]"></component>
                    <component v-else-if="getCurrentTool()?.component === 'TransferConfigPage'" is="TransferConfigPage" :key="subPage.split('/')[0]" :forced-tab="getCurrentConfigTab()" :hide-tabs="true"></component>
                </div>
            </transition>
        </div>
    `
};
