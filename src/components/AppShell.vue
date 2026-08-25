<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Receipt, Upload, Send, BarChart3, Wallet, Users, Palette, Sun, Moon, Sparkles, Check, Target, Gamepad2, TrendingUp } from 'lucide-vue-next'
import { store } from '../store'
import type { ThemeName } from '../store'
import FunUnlockDialog from './FunUnlockDialog.vue'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'dashboard', label: '概览', en: 'Overview', icon: LayoutDashboard, path: '/' },
  { name: 'bills', label: '票据库', en: 'Bills', icon: Receipt, path: '/bills' },
  { name: 'capture', label: '归集', en: 'Capture', icon: Upload, path: '/capture' },
  { name: 'reimburse', label: '报销', en: 'Reimburse', icon: Send, path: '/reimburse' },
  { name: 'analytics', label: '分析', en: 'Analytics', icon: BarChart3, path: '/analytics' },
  { name: 'income', label: '收入', en: 'Income', icon: TrendingUp, path: '/income' },
  { name: 'accounts', label: '账户', en: 'Accounts', icon: Wallet, path: '/accounts' },
  { name: 'goals', label: '目标', en: 'Goals', icon: Target, path: '/goals' },
  { name: 'fun', label: '趣味', en: 'Fun', icon: Gamepad2, path: '/fun' },
  { name: 'family', label: '家庭', en: 'Family', icon: Users, path: '/family' },
]

const bottomNavItems = [
  { name: 'dashboard', label: '概览', icon: LayoutDashboard, path: '/' },
  { name: 'capture', label: '归集', icon: Upload, path: '/capture' },
  { name: 'bills', label: '票据', icon: Receipt, path: '/bills' },
  { name: 'income', label: '收入', icon: TrendingUp, path: '/income' },
  { name: 'analytics', label: '分析', icon: BarChart3, path: '/analytics' },
  { name: 'fun', label: '趣味', icon: Gamepad2, path: '/fun' },
]

const currentName = computed(() => {
  const item = navItems.find(i => i.path === route.path)
  return item?.label || ''
})
const currentEn = computed(() => {
  const item = navItems.find(i => i.path === route.path)
  return item?.en || ''
})

const billCount = computed(() => store.state.bills.filter(b => b.status !== 'void').length)
const pendingCount = computed(() => store.state.bills.filter(b => b.usage === 'reimbursable' && b.status === 'archived').length)

const showThemePanel = ref(false)
const themeBtnRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const themes: { key: ThemeName; label: string; en: string; desc: string; swatch: string }[] = [
  { key: 'light', label: '金融蓝', en: 'Financial Blue', desc: '深邃 · 沉稳', swatch: 'linear-gradient(180deg, #1B2A4E 0%, #0F7B6C 100%)' },
  { key: 'dark', label: '鎏金紫', en: 'Royal Gold', desc: '蓝紫底 · 金主调', swatch: 'linear-gradient(180deg, #D4AF37 0%, #5E5CE6 100%)' },
  { key: 'candy', label: '粉紫', en: 'Orchid Mauve', desc: '雅致 · 梦幻', swatch: 'linear-gradient(180deg, #9C27B0 0%, #EC4899 100%)' },
  { key: 'pink', label: '樱粉', en: 'Sugar Pink', desc: '温柔 · 女性向', swatch: 'linear-gradient(180deg, #C2185B 0%, #7B5EA7 100%)' },
]

const updatePanelPos = () => {
  if (!themeBtnRef.value) return
  const rect = themeBtnRef.value.getBoundingClientRect()
  panelStyle.value = {
    top: `${rect.bottom + 6}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
}

const toggleThemePanel = () => {
  showThemePanel.value = !showThemePanel.value
  if (showThemePanel.value) updatePanelPos()
}

const setTheme = (t: ThemeName) => {
  store.setTheme(t)
  showThemePanel.value = false
}

const handleResize = () => { if (showThemePanel.value) updatePanelPos() }
const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') showThemePanel.value = false }

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div class="min-h-screen flex relative" style="padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);">
    <div class="fixed inset-0 grid-bg pointer-events-none"></div>

    <!-- 侧边栏（仅桌面端） -->
    <aside class="hidden md:flex relative z-20 w-[56px] lg:w-56 shrink-0 border-r flex-col" style="border-color: var(--border-soft); background: var(--bg-surface);">
      <!-- Logo -->
      <div class="h-14 flex items-center gap-3 px-3 lg:px-4 border-b" style="border-color: var(--border-soft);">
        <div class="w-7 h-7 flex items-center justify-center shrink-0" style="background: var(--c-primary);">
          <Receipt class="w-4 h-4 text-white" />
        </div>
        <div class="hidden lg:block">
          <div class="text-sm font-bold text-strong leading-tight tracking-tight">金钱地图</div>
          <div class="text-[9px] tracking-[0.15em] text-muted-c">票据管理 <span class="text-faint-c">/ MoneyMap</span></div>
        </div>
      </div>

      <!-- 导航 -->
      <nav class="flex-1 min-h-0 overflow-y-auto no-scrollbar py-3 px-1.5 lg:px-2 space-y-px">
        <button
          v-for="item in navItems"
          :key="item.name"
          @click="router.push(item.path)"
          :class="[
            'w-full flex items-center gap-3 px-2.5 py-2 text-xs font-medium transition-all relative',
            route.path === item.path
              ? 'text-strong bg-muted-c'
              : 'text-muted-c hover:text-strong hover:bg-muted-c'
          ]"
        >
          <div
            v-if="route.path === item.path"
            class="absolute left-0 top-0 bottom-0 w-[2px]"
            style="background: var(--c-primary);"
          ></div>
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <div class="hidden lg:flex flex-col leading-tight">
            <span class="text-[11px] tracking-wider text-inherit">{{ item.label }}</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">{{ item.en }}</span>
          </div>
        </button>
      </nav>

      <!-- 底部统计 -->
      <div class="p-2 border-t" style="border-color: var(--border-soft);">
        <div class="p-2.5 relative overflow-hidden" style="border: 1px solid var(--border-soft);">
          <div class="absolute top-0 left-0 w-[3px] h-full" style="background: var(--c-primary);"></div>
          <div class="text-[9px] tracking-[0.15em] hidden lg:block text-muted-c">票据总数 <span class="text-faint-c">/ Total</span></div>
          <div class="flex items-center gap-1.5">
            <Receipt class="w-3.5 h-3.5 text-primary" />
            <span class="text-base font-bold text-primary font-mono-num">{{ billCount }}</span>
          </div>
          <div v-if="pendingCount > 0" class="text-[9px] text-negative mt-1 hidden lg:block font-mono-num">{{ pendingCount }} 张待报销 <span class="text-faint-c">/ pending</span></div>
        </div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="relative z-10 flex-1 flex flex-col min-w-0">
      <!-- 顶栏 -->
      <header class="h-12 md:h-14 border-b flex items-center justify-between px-3 md:px-5" style="border-color: var(--border-soft); background: var(--bg-surface);">
        <div class="flex items-center gap-2 md:gap-3">
          <div class="flex items-center gap-1.5 md:gap-2">
            <div class="w-1.5 h-1.5 bg-primary"></div>
            <h1 class="text-sm font-semibold text-strong tracking-wider">{{ currentName }}</h1>
            <span class="text-[9px] tracking-[0.15em] text-faint-c uppercase hidden md:inline">{{ currentEn }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 md:gap-4">
          <!-- 主题切换器 -->
          <div class="relative" ref="themeBtnRef">
            <button
              @click="toggleThemePanel"
              class="w-7 h-7 flex items-center justify-center transition-all border"
              style="border-color: var(--border-soft); background: var(--bg-surface);"
              title="切换主题"
            >
              <Palette class="w-3.5 h-3.5 text-primary" />
            </button>
          </div>

          <div class="hidden md:flex items-center gap-1.5 text-[10px] tracking-[0.15em] text-muted-c">
            <div class="w-1.5 h-1.5 bg-positive animate-pulse-soft"></div>
            <span>个人模式 <span class="text-faint-c">/ Personal</span></span>
          </div>
          <div class="flex items-center gap-2 pl-2 md:pl-3 border-l" style="border-color: var(--border-soft);">
            <div class="w-6 h-6 flex items-center justify-center text-xs font-bold text-white" style="background: var(--c-primary);">
              {{ store.state.profile.avatar }}
            </div>
            <span class="text-xs text-muted-c font-mono-num hidden md:inline">{{ store.state.profile.name }}</span>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 移动端底部导航 -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-1.5" style="background: var(--bg-surface); border-top: 1px solid var(--border-soft); padding-bottom: env(safe-area-inset-bottom);">
      <button
        v-for="item in bottomNavItems"
        :key="item.name"
        @click="router.push(item.path)"
        :class="[
          'flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors',
          route.path === item.path ? 'text-primary' : 'text-muted-c'
        ]"
      >
        <component :is="item.icon" class="w-5 h-5" />
        <span class="text-[9px] tracking-wider">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 主题选择面板 -->
    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="showThemePanel"
          class="fixed z-[999] w-56 p-0"
          :style="panelStyle"
          @click.stop
        >
          <div class="p-3" style="background: var(--bg-surface); border: 1px solid var(--border-strong); box-shadow: 0 4px 24px rgba(0,0,0,0.15);">
            <div class="text-[10px] font-semibold text-strong mb-2.5 px-0.5 tracking-[0.15em] flex items-center gap-1.5">
              <Sparkles class="w-3 h-3 text-primary" /> 选择主题 <span class="text-faint-c font-normal">/ Select Theme</span>
            </div>
            <button
              v-for="t in themes"
              :key="t.key"
              @click="setTheme(t.key)"
              :class="['w-full flex items-center gap-2.5 p-2 transition-all border', store.theme.current === t.key ? 'border-primary' : 'border-transparent hover:bg-muted-c']"
              :style="store.theme.current === t.key ? { background: 'var(--bg-hover)' } : {}"
            >
              <div class="w-7 h-7 shrink-0" :style="{ background: t.swatch }"></div>
              <div class="flex-1 text-left">
                <div class="text-xs font-semibold text-strong flex items-center gap-1.5">
                  {{ t.label }}
                  <span class="text-[9px] text-faint-c font-normal tracking-wider">{{ t.en }}</span>
                  <Check v-if="store.theme.current === t.key" class="w-3 h-3 text-primary" />
                </div>
                <div class="text-[9px] text-muted-c tracking-wider">{{ t.desc }}</div>
              </div>
            </button>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 点击外部关闭 -->
    <div
      v-if="showThemePanel"
      class="fixed inset-0 z-[997]"
      @click="showThemePanel = false"
    ></div>

    <!-- 趣味功能解锁弹窗（全局） -->
    <FunUnlockDialog />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
