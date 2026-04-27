// STRM 工具页面组件
const StrmToolsPage = {
    name: 'StrmToolsPage',
    
    components: {
        ShareStrmPage,
        Strm123Page
    },
    
    data() {
        return {
            subPage: '',
            tools: [
                { 
                    id: 'share_strm', 
                    title: '115 分享 STRM', 
                    description: '通过 115 分享链接生成 STRM 文件，支持批量生成与管理',
                    icon: null,
                    iconImg: 'assets/images/115-icon.ico',
                    color: '#2196F3',
                    component: 'ShareStrmPage'
                },
                { 
                    id: 'strm_123', 
                    title: '123 STRM', 
                    description: '通过 123 网盘生成 STRM 文件，支持批量生成与管理',
                    icon: null,
                    iconImg: 'assets/images/123pan.png',
                    color: '#4CAF50',
                    component: 'Strm123Page'
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
            if (hash.startsWith('strm_tools/')) {
                this.subPage = hash.replace('strm_tools/', '');
            } else {
                this.subPage = '';
            }
        },
        
        openTool(tool) {
            router.push('strm_tools/' + tool.id);
        },
        
        goBack() {
            router.push('strm_tools');
        },
        
        getCurrentTool() {
            const base = this.subPage.split('/')[0];
            return this.tools.find(t => t.id === base);
        }
    },
    
    template: `
        <div>
            <!-- STRM 工具内容区过渡动画 -->
            <transition name="toolbox-fade" mode="out-in">
                <!-- STRM 工具主页 - 卡片列表 -->
                <div v-if="!subPage" key="strm-tools-home">
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">STRM 工具</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(33,150,243,0.8), rgba(76,175,80,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
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
                
                <!-- 子页面 -->
                <div v-else :key="'strm-' + subPage.split('/')[0]">
                    <!-- 面包屑导航栏 -->
                    <div class="toolbox-breadcrumb">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <v-btn variant="text" color="primary" @click="goBack" style="border-radius: 10px; min-width: auto; padding: 0 10px; height: 40px;">
                                <v-icon size="26">mdi-arrow-left</v-icon>
                            </v-btn>
                            <v-chip size="large" variant="tonal" color="primary" @click="goBack" style="cursor: pointer; font-size: 15px; height: 36px;">
                                <v-icon start size="20">mdi-file-video-outline</v-icon>
                                STRM 工具
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
