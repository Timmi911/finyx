<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Trophy, Lock, Sparkles } from 'lucide-vue-next'
import { store } from '../../store'
import type { Achievement, AchievementCategory } from '../../types'

// 成就预设清单
const PRESETS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  // 攒钱类
  { id: '1', key: 'first_save', title: '第一桶金', en: 'First Pot', desc: '完成第一个攒钱目标', category: 'saving', icon: '🥇' },
  { id: '2', key: 'save_10k', title: '万元户', en: 'Ten K Saver', desc: '累计攒满 10,000 元', category: 'saving', icon: '💰' },
  { id: '3', key: 'save_100k', title: '六位数俱乐部', en: 'Six Digits', desc: '累计攒满 100,000 元', category: 'saving', icon: '🏛️' },
  { id: '4', key: 'debt_free', title: '一身轻', en: 'Debt Free', desc: '完成第一个消除目标', category: 'saving', icon: '🕊️' },
  // 消费类
  { id: '5', key: 'no_takeout_7', title: '厨房新星', en: 'Home Chef', desc: '连续 7 天无外卖消费', category: 'spending', icon: '🍳' },
  { id: '6', key: 'no_impulse_30', title: '理性派', en: 'Rationalist', desc: '连续 30 天无冲动消费', category: 'spending', icon: '🧊' },
  { id: '7', key: 'budget_master', title: '预算大师', en: 'Budget Master', desc: '月消费连续 3 个月低于预算', category: 'spending', icon: '📊' },
  // 连续类
  { id: '8', key: 'streak_7', title: '一周不间断', en: '7-Day Streak', desc: '连续 7 天记账', category: 'streak', icon: '🔥' },
  { id: '9', key: 'streak_30', title: '月度坚持', en: 'Monthly Streak', desc: '连续 30 天记账', category: 'streak', icon: '⚡' },
  { id: '10', key: 'streak_100', title: '百日磨砺', en: '100-Day Grind', desc: '连续 100 天记账', category: 'streak', icon: '🌟' },
  // 归集类
  { id: '11', key: 'bills_100', title: '百票收藏家', en: 'Collector', desc: '归集 100 张票据', category: 'collection', icon: '📚' },
  { id: '12', key: 'bills_500', title: '票据大户', en: 'Hoarding', desc: '归集 500 张票据', category: 'collection', icon: '🗂️' },
  { id: '13', key: 'reimburse_done', title: '报销达人', en: 'Reimburser', desc: '完成 10 次报销', category: 'collection', icon: '✅' },
  // 特殊
  { id: '14', key: 'early_bird', title: '早起记账', en: 'Early Bird', desc: '早上 7 点前完成记账', category: 'special', icon: '🌅' },
  { id: '15', key: 'night_owl', title: '夜猫子', en: 'Night Owl', desc: '凌晨 1 点后还在记账', category: 'special', icon: '🦉' },
  { id: '16', key: 'tree_flower', title: '园丁', en: 'Gardener', desc: '金钱树长到花树阶段', category: 'special', icon: '🌸' },
  { id: '17', key: 'bet_winner', title: '言出必行', en: 'Bet Winner', desc: '赢得一次自赌挑战', category: 'special', icon: '🎯' },
  { id: '18', key: 'fortune_seeker', title: '运势猎人', en: 'Fortune Hunter', desc: '连续 7 天抽运势', category: 'special', icon: '🔮' },
]

const categoryLabel: Record<AchievementCategory, string> = {
  saving: '攒钱', spending: '消费', streak: '打卡', collection: '归集', special: '特殊'
}

// 初始化成就列表（如果为空）
onMounted(() => {
  if (store.state.achievements.length === 0) {
    store.setAchievements(PRESETS.map(p => ({ ...p, unlocked: false, unlockedAt: null, progress: 0 })))
  }
})

const achievements = computed(() => store.state.achievements)
const unlocked = computed(() => achievements.value.filter(a => a.unlocked))
const locked = computed(() => achievements.value.filter(a => !a.unlocked))

const grouped = computed(() => {
  const g: Record<string, Achievement[]> = {}
  achievements.value.forEach(a => {
    if (!g[a.category]) g[a.category] = []
    g[a.category].push(a)
  })
  return g
})

const progressPct = computed(() => {
  if (achievements.value.length === 0) return 0
  return Math.round((unlocked.value.length / achievements.value.length) * 100)
})

// 演示解锁（手动测试用）
const demoUnlock = (a: Achievement) => {
  store.unlockAchievement(a.key)
}
</script>

<template>
  <div class="space-y-5 max-w-3xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-accent) 25%, transparent);">
          <Trophy class="w-4 h-4 text-accent" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">成就徽章</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Achievements</div>
        </div>
      </div>
    </div>

    <!-- 概览 -->
    <div class="card p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-[10px] text-faint-c uppercase tracking-wider">解锁进度</div>
          <div class="text-lg font-bold text-strong font-mono-num">{{ unlocked.length }} <span class="text-xs text-faint-c">/ {{ achievements.length }}</span></div>
        </div>
        <div class="text-2xl">{{ progressPct >= 80 ? '👑' : progressPct >= 50 ? '🏆' : progressPct >= 20 ? '🎖️' : '🌱' }}</div>
      </div>
      <div class="h-2" style="background: var(--bg-muted);">
        <div
          class="h-full transition-all duration-500"
          :style="{ width: `${progressPct}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.18) 100%), var(--c-accent)' }"
        ></div>
      </div>
    </div>

    <!-- 按分类展示 -->
    <div v-for="(list, cat) in grouped" :key="cat" class="space-y-2">
      <div class="flex items-center gap-2">
        <div class="text-[10px] text-muted-c uppercase tracking-wider">{{ categoryLabel[cat as AchievementCategory] }}</div>
        <div class="flex-1 h-px" style="background: var(--border-soft);"></div>
        <div class="text-[9px] text-faint-c font-mono-num">{{ list.filter(a => a.unlocked).length }}/{{ list.length }}</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div
          v-for="a in list"
          :key="a.id"
          @click="!a.unlocked && demoUnlock(a)"
          class="relative p-3 cursor-pointer transition-all group"
          :style="{
            background: a.unlocked ? 'var(--bg-surface)' : 'var(--bg-muted)',
            border: `1px solid ${a.unlocked ? 'color-mix(in srgb, var(--c-accent) 30%, transparent)' : 'var(--border-soft)'}`,
            opacity: a.unlocked ? 1 : 0.6
          }"
        >
          <!-- 已解锁光晕 -->
          <div v-if="a.unlocked" class="absolute top-1 right-1">
            <Sparkles class="w-2.5 h-2.5 text-accent" />
          </div>

          <div class="text-center">
            <div class="text-3xl mb-1.5" :class="a.unlocked ? '' : 'grayscale opacity-50'">
              {{ a.unlocked ? a.icon : '🔒' }}
            </div>
            <div class="text-xs font-semibold text-strong truncate">{{ a.title }}</div>
            <div class="text-[8px] tracking-[0.1em] text-faint-c uppercase mb-1.5">{{ a.en }}</div>
            <div class="text-[10px] text-muted-c leading-snug">{{ a.desc }}</div>
          </div>

          <!-- 已解锁日期 -->
          <div v-if="a.unlocked && a.unlockedAt" class="text-[8px] text-faint-c text-center mt-2 pt-1.5" style="border-top: 1px solid var(--border-soft);">
            {{ new Date(a.unlockedAt).toISOString().slice(0, 10) }}
          </div>
          <div v-else class="text-[8px] text-faint-c text-center mt-2 pt-1.5 group-hover:text-accent transition-colors" style="border-top: 1px solid var(--border-soft);">
            点击模拟解锁
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
