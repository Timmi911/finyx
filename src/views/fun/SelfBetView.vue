<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dice5, Plus, X, Trash2, Trophy, Skull, Clock, Check, Flame } from 'lucide-vue-next'
import { store } from '../../store'
import type { SelfBet, BetStatus } from '../../types'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const showAdd = ref(false)
const addForm = ref({
  title: '',
  type: 'spend_limit' as SelfBet['type'],
  target: 0,
  stake: 0,
  punishment: '',
  days: 7,
})

const bets = computed(() => store.state.selfBets)
const activeBets = computed(() => bets.value.filter(b => b.status === 'active'))
const finishedBets = computed(() => bets.value.filter(b => b.status !== 'active'))

const typeLabel: Record<SelfBet['type'], string> = {
  spend_limit: '消费上限',
  save_target: '攒钱目标',
  no_category: '禁花分类',
  streak: '连续打卡',
}

const typeDesc: Record<SelfBet['type'], string> = {
  spend_limit: '期限内总消费不超过目标值',
  save_target: '期限内攒够目标金额',
  no_category: '期限内不在指定分类消费',
  streak: '期限内连续每天记账',
}

const submitAdd = () => {
  if (!addForm.value.title.trim() || addForm.value.target <= 0) return
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + addForm.value.days)
  const bet: SelfBet = {
    id: genId(),
    title: addForm.value.title,
    type: addForm.value.type,
    target: addForm.value.target,
    stake: addForm.value.stake,
    punishment: addForm.value.punishment || '发朋友圈承认失败',
    startDate: today.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: 'active',
    progress: 0,
    createdAt: Date.now(),
  }
  store.addSelfBet(bet)
  showAdd.value = false
  addForm.value = { title: '', type: 'spend_limit', target: 0, stake: 0, punishment: '', days: 7 }
}

const daysLeft = (end: string) => {
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
  return Math.max(0, diff)
}

const totalDays = (start: string, end: string) => {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
}

const progressPct = (bet: SelfBet) => {
  if (bet.type === 'spend_limit' || bet.type === 'no_category') {
    // 消费类：越少越好，进度=已花/上限（满100%即失败）
    return Math.min(100, (bet.progress / bet.target) * 100)
  }
  // save_target / streak：越多越好
  return Math.min(100, (bet.progress / bet.target) * 100)
}

const isWinning = (bet: SelfBet) => {
  if (bet.status !== 'active') return bet.status === 'won'
  if (bet.type === 'spend_limit' || bet.type === 'no_category') {
    return bet.progress < bet.target
  }
  return bet.progress >= bet.target
}

const settle = (bet: SelfBet, won: boolean) => {
  store.updateSelfBet(bet.id, { status: won ? 'won' : 'lost' })
}

const statusInfo = (s: BetStatus) => {
  if (s === 'won') return { label: '挑战成功', color: 'var(--c-positive)', icon: Trophy }
  if (s === 'lost') return { label: '挑战失败', color: 'var(--c-negative)', icon: Skull }
  if (s === 'cancelled') return { label: '已取消', color: 'var(--c-faint)', icon: X }
  return { label: '进行中', color: 'var(--c-accent)', icon: Clock }
}

const presetPunishments = [
  '发朋友圈承认失败',
  '给朋友发50元红包',
  '做20个俯卧撑',
  '一周不喝奶茶',
  '请朋友吃饭',
  '手写100字检讨',
]
</script>

<template>
  <div class="space-y-5 max-w-3xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-negative) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-negative) 25%, transparent);">
          <Dice5 class="w-4 h-4 text-negative" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">自赌挑战</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Self Bet</div>
        </div>
      </div>
      <button @click="showAdd = true" class="metal-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-primary)' }">
        <Plus class="w-3.5 h-3.5" /> 新赌约
      </button>
    </div>

    <!-- 进行中 -->
    <div>
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Flame class="w-3 h-3 text-negative" /> 进行中 · {{ activeBets.length }}
      </div>
      <div v-if="activeBets.length === 0" class="card p-8 text-center">
        <Dice5 class="w-8 h-8 mx-auto mb-2 text-faint-c" />
        <div class="text-xs text-muted-c">还没有进行中的赌约</div>
        <div class="text-[10px] text-faint-c mt-1">和自己打赌，给目标加点注码</div>
      </div>
      <div v-else class="space-y-3">
        <div v-for="bet in activeBets" :key="bet.id" class="card p-4">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-strong">{{ bet.title }}</span>
                <span class="chip text-[8px] text-accent border-accent-tint bg-accent-tint">{{ typeLabel[bet.type] }}</span>
              </div>
              <div class="text-[10px] text-faint-c">{{ typeDesc[bet.type] }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-[9px] text-faint-c uppercase tracking-wider">剩余</div>
              <div class="text-lg font-bold font-mono-num" :class="daysLeft(bet.endDate) <= 1 ? 'text-negative' : 'text-strong'">{{ daysLeft(bet.endDate) }}</div>
              <div class="text-[9px] text-faint-c">天</div>
            </div>
          </div>

          <!-- 进度 -->
          <div class="mb-3">
            <div class="flex items-center justify-between text-[10px] mb-1.5">
              <span class="text-muted-c">进度</span>
              <span class="font-mono-num text-strong">{{ bet.progress }} / {{ bet.target }}</span>
            </div>
            <div class="h-2" style="background: var(--bg-muted);">
              <div
                class="h-full transition-all duration-500"
                :style="{
                  width: `${progressPct(bet)}%`,
                  background: isWinning(bet) ? 'var(--c-positive)' : 'var(--c-negative)'
                }"
              ></div>
            </div>
          </div>

          <!-- 赌注 + 惩罚 -->
          <div class="grid grid-cols-2 gap-2 mb-3 text-[10px]">
            <div class="p-2" style="background: var(--bg-muted);">
              <span class="text-faint-c">赌注 </span>
              <span class="font-mono-num text-strong">¥{{ bet.stake }}</span>
            </div>
            <div class="p-2" style="background: var(--bg-muted);">
              <span class="text-faint-c">惩罚 </span>
              <span class="text-strong">{{ bet.punishment }}</span>
            </div>
          </div>

          <!-- 操作 -->
          <div class="flex gap-2 pt-2" style="border-top: 1px solid var(--border-soft);">
            <button @click="settle(bet, true)" class="metal-btn flex-1 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-positive)' }">
              <Check class="w-3 h-3 inline" /> 我赢了
            </button>
            <button @click="settle(bet, false)" class="metal-btn flex-1 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-negative)' }">
              <Skull class="w-3 h-3 inline" /> 我输了
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已结束 -->
    <div v-if="finishedBets.length > 0">
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3">已结束 · {{ finishedBets.length }}</div>
      <div class="space-y-2">
        <div v-for="bet in finishedBets" :key="bet.id" class="card p-3 flex items-center gap-3 opacity-75">
          <component :is="statusInfo(bet.status).icon" class="w-4 h-4 shrink-0" :style="{ color: statusInfo(bet.status).color }" />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-strong truncate">{{ bet.title }}</div>
            <div class="text-[9px] text-faint-c">{{ bet.startDate }} → {{ bet.endDate }}</div>
          </div>
          <span class="chip text-[8px]" :style="{ color: statusInfo(bet.status).color, borderColor: 'color-mix(in srgb, ' + statusInfo(bet.status).color + ' 25%, transparent)', background: 'color-mix(in srgb, ' + statusInfo(bet.status).color + ' 8%, transparent)' }">
            {{ statusInfo(bet.status).label }}
          </span>
          <button @click="store.deleteSelfBet(bet.id)" class="text-faint-c hover:text-negative transition-colors">
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <Teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 z-[999] flex items-center justify-center p-4" @click.self="showAdd = false">
        <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
        <div class="relative w-full max-w-md max-h-[90vh] overflow-y-auto" style="background: var(--bg-surface); border: 1px solid var(--border-strong);">
          <div class="sticky top-0 flex items-center justify-between p-4" style="background: var(--bg-surface); border-bottom: 1px solid var(--border-soft);">
            <div>
              <div class="text-sm font-semibold text-strong">新建赌约</div>
              <div class="text-[9px] text-faint-c">和自己较劲，押上注码</div>
            </div>
            <button @click="showAdd = false" class="text-faint-c hover:text-strong"><X class="w-4 h-4" /></button>
          </div>

          <div class="p-4 space-y-4">
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">挑战内容</label>
              <input v-model="addForm.title" type="text" placeholder="如：本周外卖不超200" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
            </div>

            <div>
              <label class="text-xs text-muted-c mb-1.5 block">挑战类型</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="(label, key) in typeLabel"
                  :key="key"
                  @click="addForm.type = key as SelfBet['type']"
                  :class="['p-2 text-xs border transition-all', addForm.type === key ? 'border-primary bg-primary-tint text-primary' : 'text-base-c']"
                  style="border-color: var(--border-soft);"
                >
                  {{ label }}
                </button>
              </div>
              <div class="text-[10px] text-faint-c mt-1.5">{{ typeDesc[addForm.type] }}</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted-c mb-1.5 block">目标值</label>
                <input v-model.number="addForm.target" type="number" placeholder="如 200" class="w-full px-3 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              </div>
              <div>
                <label class="text-xs text-muted-c mb-1.5 block">天数</label>
                <input v-model.number="addForm.days" type="number" placeholder="7" class="w-full px-3 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              </div>
            </div>

            <div>
              <label class="text-xs text-muted-c mb-1.5 block">赌注金额（虚拟）</label>
              <input v-model.number="addForm.stake" type="number" placeholder="如 100" class="w-full px-3 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
            </div>

            <div>
              <label class="text-xs text-muted-c mb-2 block">惩罚 <span class="text-faint-c">/ 失败后果</span></label>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <button
                  v-for="p in presetPunishments"
                  :key="p"
                  @click="addForm.punishment = p"
                  :class="['px-2 py-1 text-[10px] border transition-all', addForm.punishment === p ? 'border-negative text-negative bg-negative-tint' : 'text-muted-c']"
                  style="border-color: var(--border-soft);"
                >{{ p }}</button>
              </div>
              <input v-model="addForm.punishment" type="text" placeholder="自定义惩罚" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
            </div>

            <button @click="submitAdd" :disabled="!addForm.title.trim() || addForm.target <= 0" class="metal-btn w-full py-2.5 text-sm font-semibold disabled:opacity-40" :style="{ '--btn-bg': 'var(--c-primary)' }">
              立下赌约
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
