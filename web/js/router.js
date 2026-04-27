// NanShare 前端路由管理器
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.previousRoute = '';
        this.defaultRoute = 'dashboard';
        this.history = [];
        this._isBack = false;
        // 各路由的滚动位置缓存 { routeName: scrollY }
        // 在 push/back 修改 hash 之前同步保存，避免 handleRouteChange 中
        // 的 scrollTo(0) 先于组件 beforeUnmount 执行导致保存值永远为 0
        this._scrollPositions = {};
        
        // 配置 NProgress
        if (typeof NProgress !== 'undefined') {
            NProgress.configure({ 
                showSpinner: false,
                speed: 300,
                minimum: 0.2,
                trickleSpeed: 150
            });
        }
        
        // 监听 hash 变化
        window.addEventListener('hashchange', () => this.handleRouteChange());
        window.addEventListener('load', () => this.handleRouteChange());
    }
    
    // 读取当前真实滚动位置（兼容多种浏览器/布局）
    _currentScrollY() {
        return window.scrollY
            || window.pageYOffset
            || (document.documentElement && document.documentElement.scrollTop)
            || (document.body && document.body.scrollTop)
            || 0;
    }
    
    // 在导航之前同步保存当前路由的滚动位置
    _saveCurrentScroll() {
        if (this.currentRoute) {
            this._scrollPositions[this.currentRoute] = this._currentScrollY();
        }
    }
    
    // 消费（读取并删除）指定路由的已保存滚动位置，适合目标页面在 mounted 中调用
    consumeSavedScroll(path) {
        const key = path || this.currentRoute;
        const y = this._scrollPositions[key];
        if (y !== undefined) {
            delete this._scrollPositions[key];
            return y;
        }
        return 0;
    }
    
    // 仅查看不删除
    getSavedScroll(path) {
        const key = path || this.currentRoute;
        return this._scrollPositions[key] || 0;
    }
    
    // 注册路由
    register(path, component) {
        this.routes[path] = component;
    }
    
    // 处理路由变化
    handleRouteChange() {
        const rawHash = window.location.hash.slice(1);
        
        // 如果 hash 被意外清空（如 Vuetify v-tab 渲染为 <a> 标签点击后），恢复当前路由
        if (!rawHash && this.currentRoute) {
            window.history.replaceState(null, '', `#/${this.currentRoute}`);
            return;
        }
        
        const hash = rawHash || `/${this.defaultRoute}`;
        const path = hash.replace(/^\//, '');
        
        // 路由守卫：每次路由切换检查 token 是否存在
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        // 路由未变则跳过
        if (path === this.currentRoute) return;
        
        this.previousRoute = this.currentRoute;
        const wasBack = this._isBack;
        if (!wasBack && this.currentRoute) {
            this.history.push(this.currentRoute);
        }
        this._isBack = false;
        this.currentRoute = path;
        
        // 启动顶部进度条
        if (typeof NProgress !== 'undefined') {
            NProgress.start();
        }
        
        // 路由切换时滚动到顶部（返回操作除外，由目标页面自行恢复滚动位置）
        if (!wasBack) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('route-change', { 
            detail: { path, from: this.previousRoute } 
        }));
        
        // 进度条在过渡动画结束后关闭
        setTimeout(() => {
            if (typeof NProgress !== 'undefined') {
                NProgress.done();
            }
        }, 350);
    }
    
    // 导航到指定路由
    push(path) {
        // 修改 hash 之前同步保存当前滚动位置，避免随后 handleRouteChange
        // 中 scrollTo(0) 先于旧组件 beforeUnmount 执行导致值丢失
        this._saveCurrentScroll();
        window.location.hash = `#/${path}`;
    }
    
    // 静默替换当前路由（不触发 hashchange / 组件重建 / 入历史栈）
    // 适用于：仅同步 URL 以便刷新或返回时恢复页面状态
    replace(path) {
        window.history.replaceState(null, '', `#/${path}`);
        this.currentRoute = path;
    }
    
    // 返回上一页
    back() {
        if (this.history.length > 0) {
            this._saveCurrentScroll();
            this._isBack = true;
            const prev = this.history.pop();
            window.location.hash = `#/${prev}`;
        } else {
            this.push(this.defaultRoute);
        }
    }
    
    // 获取当前路由
    getCurrentRoute() {
        return this.currentRoute || this.defaultRoute;
    }
}

// 创建全局路由实例
const router = new Router();