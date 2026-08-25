<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, Loader2, TrendingUp, User as UserIcon } from 'lucide-vue-next'
import { authStore } from '../stores/auth'
import { store } from '../store'
import { migrateLegacyData } from '../utils/migrateLegacy'

const router = useRouter()
const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
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
  if (!name.value.trim() || !email.value.trim() || !password.value || !passwordConfirm.value) return false
  if (name.value.trim().length > 30) return false
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return false
  if (password.value.length < 6) return false
  if (password.value !== passwordConfirm.value) return false
  return true
})

const submit = async () => {
  if (!canSubmit.value) return
  errorMsg.value = null
  submitting.value = true
  try {
    await authStore.register(name.value.trim(), email.value.trim(), password.value)
    // 迁移 legacy localStorage 数据到后端（注册前用过本应用的旧数据）
    await migrateLegacyData()
    // 先跳转再拉数据：保证路由守卫判定时 token 已就绪，避免 store.load 并行请求干扰
    await router.push(redirect.value)
    // 跳转成功后再拉已迁移的后端数据，保证进入首页各模块不空
    await store.load()
  } catch (err: any) {
    const code = err?.code || err?.error?.code
    const msg = err?.message || err?.error?.message || '注册失败，请重试'
    if (code === 'email_taken') {
      errorMsg.value = '该邮箱已被注册，可直接登录'
    } else if (code === 'validation_error') {
      errorMsg.value = '请检查填写信息是否符合要求'
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
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent-c/20 blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-secondary-c/20 blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card-c shadow-lg mb-3 border border-card-border">
          <TrendingUp class="w-7 h-7 text-accent-c" />
        </div>
        <h1 class="text-xl font-bold text-main-c">创建新账号</h1>
        <p class="text-xs text-muted-c mt-1">只需 30 秒，开启你的金钱地图</p>
      </div>

      <div class="rounded-2xl bg-card-c border border-card-border shadow-2xl p-5 space-y-4">
        <form @submit.prevent="submit" class="space-y-4" novalidate>
          <!-- 昵称 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">昵称</span>
            <div class="relative">
              <UserIcon class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="name"
                type="text"
                autocomplete="name"
                maxlength="30"
                placeholder="你想怎么被称呼？"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
              />
            </div>
          </label>

          <!-- 邮箱 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">邮箱</span>
            <div class="relative">
              <Mail class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
              />
            </div>
          </label>

          <!-- 密码 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">密码（至少 6 位）</span>
            <div class="relative">
              <Lock class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="至少 6 位"
                class="w-full pl-9 pr-10 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
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

          <!-- 确认密码 -->
          <label class="block">
            <span class="text-xs text-muted-c block mb-1.5">确认密码</span>
            <div class="relative">
              <Lock class="w-4 h-4 text-muted-c absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="passwordConfirm"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="再次输入密码"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input-c border border-input-border text-main-c placeholder:text-faint-c text-sm focus:outline-none focus:border-accent-c/60 focus:ring-2 focus:ring-accent-c/20 transition"
                :disabled="submitting"
                @keyup.enter="submit"
              />
            </div>
            <div v-if="passwordConfirm && password !== passwordConfirm" class="text-xs text-negative mt-1.5">
              两次输入的密码不一致
            </div>
          </label>

          <!-- 错误消息 -->
          <div v-if="errorMsg" class="text-xs text-negative bg-negative/10 border border-negative/20 rounded-lg px-3 py-2">
            {{ errorMsg }}
          </div>

          <button
            type="submit"
            class="w-full py-2.5 rounded-xl text-white text-sm font-medium bg-accent-c hover:bg-accent-c/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            :disabled="!canSubmit"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            {{ submitting ? '创建账号中…' : '创建账号' }}
          </button>
        </form>

        <div class="text-center text-sm text-muted-c pt-1">
          已有账号？
          <router-link
            :to="{ path: '/login', query: { redirect } }"
            class="text-accent-c hover:text-accent-c/80 font-medium transition"
          >返回登录</router-link>
        </div>
      </div>

      <p class="text-center text-xs text-faint-c mt-5">
        点击「创建账号」即表示你同意 MoneyMap 的服务条款与隐私政策
      </p>
    </div>
  </div>
</template>

<style scoped>
.bg-auth-gradient {
  background:
    radial-gradient(ellipse at top, #142240 0%, #0d1426 55%, #090e1c 100%);
}
</style>
