import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { store } from './store'
import { router } from './router'
import { authStore } from './stores/auth'

// 先恢复登录态到内存（仅读 localStorage，不触发网络），
// 保证 router 注册 + 首次 beforeEach 触发时 authStore.isAuthenticated 已就绪
authStore.bootstrap()

// 挂载 app（router 注册 + 首次 beforeEach 触发）
createApp(App).use(router).mount('#app')

// 异步拉数据：已登录并行拉 bills/accounts/goals/incomes 等；未登录保持空集合
void store.init()
