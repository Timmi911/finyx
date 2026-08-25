<script setup lang="ts">
import { computed, ref } from 'vue'
import { Star, RefreshCw, Sparkles } from 'lucide-vue-next'
import { store } from '../../store'
import type { DailyFortune } from '../../types'

const SUITS = ['攒钱', '理性消费', '记账', '复盘', '断舍离', '比价', '记账打卡', '看财报']
const AVOIDS = ['冲动消费', '大额购物', '外卖', '剁手', '囤货', '借贷', '请客', '升级装备']
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '居住', '通讯', '医疗', '教育']
const WORDS = [
  '今日适合按兵不动，让钱包休个假',
  '财运如流水，开源节流都得有',
  '宜精打细算，忌一时兴起',
  '今天的理性，是明天的底气',
  '账本里藏着你未来的自由',
  '少一杯奶茶，多一份储蓄',
  '消费之前，问自己三遍「真的需要吗」',
  '今天省下的，是明天想花的',
  '理性是另一种酷',
  '看着数字涨，比买东西爽',
]

const today = () => new Date().toISOString().slice(0, 10)

const fortune = computed(() => store.state.dailyFortune)
const isToday = computed(() => fortune.value?.date === today())

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const generate = () => {
  const star = Math.floor(Math.random() * 5) + 1
  const f: DailyFortune = {
    date: today(),
    star,
    suit: [pick(SUITS), pick(SUITS)],
    avoid: [pick(AVOIDS), pick(AVOIDS)],
    luckyCategory: pick(CATEGORIES),
    warningCategory: pick(CATEGORIES),
    word: pick(WORDS),
  }
  // 去重
  f.suit = [...new Set(f.suit)]
  f.avoid = [...new Set(f.avoid)]
  store.setDailyFortune(f)
}

const starColor = (filled: boolean, i: number) => filled ? 'var(--c-accent)' : 'var(--bg-muted)'

const starLabel = (s: number) => {
  if (s >= 5) return '财运亨通'
  if (s >= 4) return '财气不错'
  if (s >= 3) return '平平淡淡'
  if (s >= 2) return '需谨慎'
  return '守住钱包'
}
</script>

<template>
  <div class="space-y-5 max-w-2xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-accent) 25%, transparent);">
          <Star class="w-4 h-4 text-accent" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">消费运势</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Daily Fortune</div>
        </div>
      </div>
      <button @click="generate" class="metal-btn px-3 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-accent)' }">
        <RefreshCw class="w-3 h-3 inline" /> {{ isToday ? '重新抽' : '抽今日运势' }}
      </button>
    </div>

    <!-- 运势卡 -->
    <div v-if="fortune && isToday" class="card p-6 relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute -top-8 -right-8 w-40 h-40 opacity-[0.04]">
        <Star class="w-full h-full text-accent" />
      </div>

      <div class="relative">
        <!-- 日期 -->
        <div class="text-[10px] text-faint-c font-mono-num tracking-widest mb-1">{{ fortune.date }}</div>

        <!-- 星级 -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex items-center gap-0.5">
            <Star
              v-for="i in 5"
              :key="i"
              class="w-5 h-5 transition-all"
              :style="{ color: starColor(i <= fortune.star, i), fill: i <= fortune.star ? 'var(--c-accent)' : 'transparent' }"
            />
          </div>
          <span class="text-sm font-semibold text-strong">{{ starLabel(fortune.star) }}</span>
        </div>

        <!-- 宜忌 -->
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="p-3" style="background: color-mix(in srgb, var(--c-positive) 8%, transparent); border-left: 2px solid var(--c-positive);">
            <div class="text-[10px] text-positive font-medium mb-2 tracking-wider">宜</div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in fortune.suit" :key="s" class="text-xs text-strong">{{ s }}</span>
            </div>
          </div>
          <div class="p-3" style="background: color-mix(in srgb, var(--c-negative) 8%, transparent); border-left: 2px solid var(--c-negative);">
            <div class="text-[10px] text-negative font-medium mb-2 tracking-wider">忌</div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="a in fortune.avoid" :key="a" class="text-xs text-strong">{{ a }}</span>
            </div>
          </div>
        </div>

        <!-- 幸运/警示分类 -->
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="p-2.5 text-center" style="background: var(--bg-muted);">
            <div class="text-[9px] text-faint-c uppercase tracking-wider mb-1">幸运分类</div>
            <div class="text-sm font-semibold text-primary">{{ fortune.luckyCategory }}</div>
          </div>
          <div class="p-2.5 text-center" style="background: var(--bg-muted);">
            <div class="text-[9px] text-faint-c uppercase tracking-wider mb-1">警示分类</div>
            <div class="text-sm font-semibold text-negative">{{ fortune.warningCategory }}</div>
          </div>
        </div>

        <!-- 一句话 -->
        <div class="text-center py-4 px-3" style="background: var(--bg-muted); border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft);">
          <Sparkles class="w-3.5 h-3.5 text-accent inline mb-1" />
          <div class="text-xs text-strong italic">"{{ fortune.word }}"</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="card p-10 text-center">
      <Star class="w-10 h-10 mx-auto mb-3 text-faint-c" />
      <div class="text-sm text-strong mb-1">今日尚未抽运势</div>
      <div class="text-[11px] text-muted-c mb-4">每天一张消费运势卡，给理性一点仪式感</div>
      <button @click="generate" class="metal-btn px-5 py-2 text-xs font-semibold" :style="{ '--btn-bg': 'var(--c-accent)' }">
        <Sparkles class="w-3.5 h-3.5 inline" /> 抽今日运势
      </button>
    </div>
  </div>
</template>
