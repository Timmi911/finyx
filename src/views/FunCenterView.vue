<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Lock, Check, MessageCircle, Star, Trophy, Dice5, Sprout, Swords, ChevronRight } from 'lucide-vue-next'
import { store } from '../store'
import { requestUnlock } from '../utils/funBus'
import type { FunFeatureKey } from '../types'

const router = useRouter()

interface FeatMeta {
  key: FunFeatureKey
  label: string
  en: string
  icon: any
  desc: string
  route?: string
}

const features: FeatMeta[] = [
  { key: 'mouthpiece', label: '金句嘴替', en: 'Mouthpiece', icon: MessageCircle, desc: '消费后弹吐槽/鼓励', route: '/fun/mouthpiece' },
  { key: 'fortune', label: '消费运势', en: 'Fortune', icon: Star, desc: '每日运势卡', route: '/fun/fortune' },
  { key: 'achievements', label: '成就徽章', en: 'Achievements', icon: Trophy, desc: '解锁式成就墙', route: '/fun/achievements' },
  { key: 'selfbet', label: '自赌挑战', en: 'Self Bet', icon: Dice5, desc: '和自己打赌', route: '/fun/selfbet' },
  { key: 'moneytree', label: '金钱树', en: 'Money Tree', icon: Sprout, desc: '攒钱养成树', route: '/fun/moneytree' },
  { key: 'pkchallenge', label: '好友PK', en: 'PK Challenge', icon: Swords, desc: '朋友攒钱赛', route: '/fun/pkchallenge' },
]

const unlockedCount = computed(() => store.state.funFeatures.filter(f => f.unlocked).length)
const enabledCount = computed(() => store.state.funFeatures.filter(f => f.unlocked && f.enabled).length)

const toggle = (key: FunFeatureKey) => {
  store.toggleFun(key)
}

const enter = async (f: FeatMeta) => {
  if (!store.isFunUnlocked(f.key)) {
    const ok = await requestUnlock(f.key)
    if (!ok) return
  }
  if (f.route) router.push(f.route)
}

const isUnlocked = (key: FunFeatureKey) => store.isFunUnlocked(key)
const isEnabled = (key: FunFeatureKey) => store.isFunEnabled(key)
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <!-- 顶部概览 -->
    <div class="card p-5 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 opacity-5 text-primary">
        <Sparkles class="w-full h-full" />
      </div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
          <div class="flex flex-col leading-tight">
            <span class="text-xs font-semibold text-strong tracking-[0.15em]">趣味中心</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Fun Center</span>
          </div>
        </div>
        <p class="text-xs text-muted-c mt-2">让管钱变得有趣 · 所有功能默认关闭，按需解锁</p>
        <div class="flex items-center gap-5 mt-4">
          <div>
            <div class="text-[9px] text-faint-c uppercase tracking-wider">已解锁</div>
            <div class="text-lg font-bold text-strong font-mono-num">{{ unlockedCount }} <span class="text-xs text-faint-c">/ {{ features.length }}</span></div>
          </div>
          <div class="w-px h-8" style="background: var(--border-soft);"></div>
          <div>
            <div class="text-[9px] text-faint-c uppercase tracking-wider">启用中</div>
            <div class="text-lg font-bold text-primary font-mono-num">{{ enabledCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="f in features"
        :key="f.key"
        class="relative overflow-hidden cursor-pointer group transition-all"
        :style="{
          background: 'var(--bg-surface)',
          border: `1px solid ${isUnlocked(f.key) ? 'var(--border-strong)' : 'var(--border-soft)'}`,
          opacity: isUnlocked(f.key) ? 1 : 0.85
        }"
        @click="enter(f)"
      >
        <!-- 未解锁遮罩 -->
        <div v-if="!isUnlocked(f.key)" class="absolute top-3 right-3 z-10">
          <div class="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-faint-c" style="background: var(--bg-muted);">
            <Lock class="w-2.5 h-2.5" /> 未解锁
          </div>
        </div>

        <div class="p-4">
          <div class="flex items-start gap-3 mb-2">
            <div
              class="w-9 h-9 flex items-center justify-center shrink-0 transition-all"
              :style="{
                background: isUnlocked(f.key) ? 'color-mix(in srgb, var(--c-primary) 12%, transparent)' : 'var(--bg-muted)',
                border: `1px solid ${isUnlocked(f.key) ? 'color-mix(in srgb, var(--c-primary) 25%, transparent)' : 'var(--border-soft)'}`
              }"
            >
              <component :is="f.icon" class="w-4 h-4" :class="isUnlocked(f.key) ? 'text-primary' : 'text-faint-c'" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-strong">{{ f.label }}</span>
              </div>
              <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">{{ f.en }}</div>
            </div>
          </div>
          <p class="text-[11px] text-muted-c mb-3">{{ f.desc }}</p>

          <!-- 底部状态 -->
          <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--border-soft);">
            <span v-if="isUnlocked(f.key)" class="text-[9px] text-positive flex items-center gap-0.5">
              <Check class="w-2.5 h-2.5" /> 已解锁
            </span>
            <span v-else class="text-[9px] text-faint-c">点击解锁</span>

            <!-- 启用开关（已解锁才显示） -->
            <div v-if="isUnlocked(f.key)" class="flex items-center gap-1.5" @click.stop>
              <span class="text-[9px] text-faint-c">{{ isEnabled(f.key) ? '启用' : '关闭' }}</span>
              <button
                @click="toggle(f.key)"
                class="relative w-8 h-4 transition-all"
                :style="{ background: isEnabled(f.key) ? 'var(--c-primary)' : 'var(--bg-muted)' }"
              >
                <span
                  class="absolute top-0.5 w-3 h-3 bg-white transition-all"
                  :style="{ left: isEnabled(f.key) ? '18px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }"
                ></span>
              </button>
            </div>

            <ChevronRight v-else class="w-3.5 h-3.5 text-faint-c" />
          </div>
        </div>
      </div>
    </div>

    <div class="text-center text-[10px] text-faint-c tracking-wider pt-2">
      ✨ 触发相关场景时，未解锁功能会自动弹出演示
    </div>
  </div>
</template>
