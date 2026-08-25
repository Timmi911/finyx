<script setup lang="ts">
import { ref, computed } from 'vue'
import { MessageCircle, Sparkles, Trash2, RefreshCw } from 'lucide-vue-next'
import { store } from '../../store'
import type { MouthpieceLog, Bill } from '../../types'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const QUOTES = {
  // 大额消费 - 吐槽
  roastBig: [
    '钱包在哭泣，但你说值就值',
    '这一笔下去，本月预算震了三震',
    '富得流油？不，是穷得流单',
    '账单提醒你：理性消费是个动词',
    '这金额，够吃一个月外卖了',
    '你刚才那句"反正都要买"，钱包记住了',
  ],
  // 中等消费 - 调侃
  roastMid: [
    '又是被商家套路的一天',
    '消费降级？这一笔没看出来',
    '钱包：我又瘦了',
    '记账的意义，就是让你看见自己多能花',
  ],
  // 小额消费 - 鼓励
  cheerSmall: [
    '小确幸到位，钱包无压力',
    '这种小额消费，可控可控',
    '今天的你，理性得像本教科书',
    '稳住，你能攒下钱',
  ],
  // 攒钱类目标 - 鼓励
  cheerSave: [
    '又往目标存了一笔，记你一功',
    '看着数字涨，是不是有点爽',
    '这速度，目标指日可待',
    '理财小能手，是你',
  ],
}

const pickQuote = (amount: number, isSave: boolean): { quote: string; mood: 'roast' | 'cheer' | 'neutral' } => {
  if (isSave) {
    return { quote: QUOTES.cheerSave[Math.floor(Math.random() * QUOTES.cheerSave.length)], mood: 'cheer' }
  }
  if (amount >= 500) {
    return { quote: QUOTES.roastBig[Math.floor(Math.random() * QUOTES.roastBig.length)], mood: 'roast' }
  }
  if (amount >= 100) {
    return { quote: QUOTES.roastMid[Math.floor(Math.random() * QUOTES.roastMid.length)], mood: 'roast' }
  }
  return { quote: QUOTES.cheerSmall[Math.floor(Math.random() * QUOTES.cheerSmall.length)], mood: 'cheer' }
}

const logs = computed(() => store.state.mouthpieceLogs)

// 手动测试
const testAmount = ref(0)
const testCategory = ref('餐饮')
const generateTest = () => {
  if (testAmount.value <= 0) return
  const { quote, mood } = pickQuote(testAmount.value, false)
  const log: MouthpieceLog = {
    id: genId(),
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    billId: 'test',
    amount: testAmount.value,
    category: testCategory.value,
    quote,
    mood,
  }
  store.addMouthpieceLog(log)
  testAmount.value = 0
}

const clearLogs = () => {
  store.state.mouthpieceLogs = []
}

const moodColor = (mood: string) => {
  if (mood === 'roast') return 'var(--c-negative)'
  if (mood === 'cheer') return 'var(--c-positive)'
  return 'var(--c-accent)'
}
const moodLabel = (mood: string) => mood === 'roast' ? '吐槽' : mood === 'cheer' ? '鼓励' : '中立'
</script>

<template>
  <div class="space-y-5 max-w-3xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-primary) 25%, transparent);">
          <MessageCircle class="w-4 h-4 text-primary" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">金句嘴替</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Mouthpiece</div>
        </div>
      </div>
      <button v-if="logs.length > 0" @click="clearLogs" class="text-[10px] text-faint-c hover:text-negative transition-colors flex items-center gap-1">
        <Trash2 class="w-3 h-3" /> 清空
      </button>
    </div>

    <!-- 介绍卡 -->
    <div class="card p-4">
      <div class="flex items-start gap-2.5">
        <Sparkles class="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div>
          <div class="text-xs text-strong font-medium mb-1">钱包的情绪嘴替</div>
          <p class="text-[11px] text-muted-c leading-relaxed">每笔大额消费后会弹一句吐槽或鼓励。小额消费夸你理性，大额消费怼你几句，攒钱达标给你鼓掌。让记账多点情绪调味。</p>
        </div>
      </div>
    </div>

    <!-- 试用生成器 -->
    <div class="card p-4">
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3">手动试用</div>
      <div class="flex items-center gap-2">
        <select v-model="testCategory" class="px-2 py-1.5 text-xs bg-transparent border text-strong" style="border-color: var(--border-soft);">
          <option v-for="c in ['餐饮','交通','购物','娱乐','其他']" :key="c" :value="c">{{ c }}</option>
        </select>
        <input v-model.number="testAmount" type="number" placeholder="金额" class="flex-1 px-2 py-1.5 text-xs font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
        <button @click="generateTest" :disabled="testAmount <= 0" class="metal-btn px-3 py-1.5 text-xs font-medium disabled:opacity-40" :style="{ '--btn-bg': 'var(--c-primary)' }">
          <RefreshCw class="w-3 h-3 inline" /> 生成金句
        </button>
      </div>
    </div>

    <!-- 金句流 -->
    <div>
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3">金句流 · {{ logs.length }} 条</div>
      <div v-if="logs.length === 0" class="card p-8 text-center">
        <MessageCircle class="w-8 h-8 mx-auto mb-2 text-faint-c" />
        <div class="text-xs text-muted-c">还没有金句</div>
        <div class="text-[10px] text-faint-c mt-1">大额消费后自动生成，或上方手动试用</div>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="log in logs"
          :key="log.id"
          class="card p-3 relative"
          :style="{ borderLeft: `2px solid ${moodColor(log.mood)}` }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="text-sm text-strong italic mb-1">"{{ log.quote }}"</div>
              <div class="flex items-center gap-2 text-[9px] text-faint-c font-mono-num">
                <span>{{ log.date }}</span>
                <span>·</span>
                <span>{{ log.category }}</span>
                <span>·</span>
                <span>¥{{ log.amount }}</span>
              </div>
            </div>
            <span class="chip text-[8px] shrink-0" :style="{ color: moodColor(log.mood), borderColor: 'color-mix(in srgb, ' + moodColor(log.mood) + ' 25%, transparent)', background: 'color-mix(in srgb, ' + moodColor(log.mood) + ' 8%, transparent)' }">
              {{ moodLabel(log.mood) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
