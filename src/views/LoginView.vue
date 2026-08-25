<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, Loader2, TrendingUp } from 'lucide-vue-next'
import { authStore } from '../stores/auth'
import { store } from '../store'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMsg = ref<string | null>(null)
const loaded = ref(false)

const redirect = computed(() => {
  const r = (route.query.redirect as string | undefined)?.trim()
  if (r && r.startsWith('/') && !r.startsWith('//')) return r
  return '/'
})

const canSubmit = computed(() => {
  if (submitting.value) return false
  if (!email.value.trim() || !password.value) return false
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return false
  if (password.value.length < 6) return false
  return true
})

const submit = async () => {
  if (!canSubmit.value) return
  errorMsg.value = null
  submitting.value = true
  try {
    await authStore.login(email.value.trim(), password.value)
    // 先跳转再拉数据：保证路由守卫判定时 token 已就绪，避免 store.load 并行请求干扰
    await router.push(redirect.value)
    // 跳转成功后再拉一次后端数据（store.load 会根据 authStore.isAuthenticated 并行拉 bills/accounts/goals/incomes 等）
    await store.load()
  } catch (err: any) {
    const code = err?.code || err?.error?.code
    const msg = err?.message || err?.error?.message || '登录失败，请重试'
    if (code === 'invalid_credentials') {
      errorMsg.value = '邮箱或密码错误'
    } else if (code === 'email_not_found') {
      errorMsg.value = '该邮箱尚未注册'
    } else {
      errorMsg.value = String(msg)
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => { loaded.value = true })
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-auth-gradient relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent-c/20 blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-secondary-c/20 blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-sm">
      <!-- Logo & 标题 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card-c shadow-lg mb-4 border border-card-border">
          <TrendingUp class="w-8 h-8 text-accent-c" />
        </div>
        <h1 class="text-2xl font-bold text-main-c">金钱地图</h1>
        <p class="text-sm text-muted-c mt-1">MoneyMap · 登录你的财务世界</p>
      </div>

      <!-- 卡片 -->
      <div class="rounded-2xl bg-card-c border border-card-border shadow-2xl p-6 space-y-5">
        <h2 class="text-lg font-semibold text-main-c">欢迎回来</h2>

        <form @submit.prevent="submit" class="space-y-4" novalidate>
          <!-- 邮箱 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">邮箱</span>
            <div class="relative">
              <Mail class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="email"
                type="email"
                autocomplete="username"
                placeholder="you@example.com"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
              />
            </div>
          </label>

          <!-- 密码 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">密码</span>
            <div class="relative">
              <Lock class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="至少 6 位"
                class="w-full pl-9 pr-10 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
                @keyup.enter="submit"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-c hover:text-main-c transition-colors"
                :disabled="submitting"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </label>

          <!-- 错误消息 -->
          <div v-if="errorMsg" class="text-xs text-negative bg-negative/10 border border-negative/20 rounded-lg px-3 py-2">
            {{ errorMsg }}
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            class="w-full py-2.5 rounded-xl text-white text-sm font-medium bg-accent-c hover:bg-accent-c/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            :disabled="!canSubmit"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            {{ submitting ? '登录中…' : '登录' }}
          </button>
        </form>

        <!-- 跳转注册 -->
        <div class="text-center text-sm text-muted-c pt-1">
          还没有账号？
          <router-link
            :to="{ path: '/register', query: { redirect } }"
            class="text-accent-c hover:text-accent-c/80 font-medium transition"
          >立即注册</router-link>
        </div>
      </div>

      <p class="text-center text-xs text-faint-c mt-6">
        © MoneyMap · 让每一笔都更清晰
      </p>
    </div>
  </div>
</template>

<style scoped>
.bg-auth-gradient {
  background:
    radial-gradient(ellipse at top, #142240 0%, #0d1426 55%, #090e1c 100%);
}
.loaded-fade {
  opacity: 1;
}
</style>
