<script setup lang="ts">
import { computed } from 'vue'
import { fmtMoney } from '../../utils/format'

const props = defineProps<{
  current: { income: number; expense: number }
  previous: { income: number; expense: number }
  label?: string
  prevLabel?: string
}>()

const incomeChange = computed(() => {
  if (props.previous.income === 0) return 0
  return ((props.current.income - props.previous.income) / props.previous.income) * 100
})
const expenseChange = computed(() => {
  if (props.previous.expense === 0) return 0
  return ((props.current.expense - props.previous.expense) / props.previous.expense) * 100
})

const incomeBars = computed(() => {
  const max = Math.max(props.current.income, props.previous.income, 1)
  return {
    cur: (props.current.income / max) * 100,
    prev: (props.previous.income / max) * 100,
  }
})
const expenseBars = computed(() => {
  const max = Math.max(props.current.expense, props.previous.expense, 1)
  return {
    cur: (props.current.expense / max) * 100,
    prev: (props.previous.expense / max) * 100,
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="p-3" style="border: 1px solid var(--border-soft);">
        <div class="text-[10px] uppercase tracking-[0.15em] text-muted-c mb-2">Income</div>
        <div class="flex items-baseline justify-between mb-1.5">
          <span class="text-xs font-mono-num text-strong">¥{{ fmtMoney(current.income, 0) }}</span>
          <span class="text-[10px] font-mono-num" :class="incomeChange >= 0 ? 'text-positive' : 'text-negative'">
            {{ incomeChange >= 0 ? '+' : '' }}{{ incomeChange.toFixed(1) }}%
          </span>
        </div>
        <div class="space-y-1">
          <div class="h-1.5 w-full" style="background: var(--bg-muted);">
            <div class="h-full transition-all metal-h" :style="{ width: `${incomeBars.cur}%` }"></div>
          </div>
          <div class="h-1 w-full" style="background: var(--bg-muted); opacity: 0.5;">
            <div class="h-full transition-all metal-h" :style="{ width: `${incomeBars.prev}%`, opacity: 0.4 }"></div>
          </div>
        </div>
      </div>
      <div class="p-3" style="border: 1px solid var(--border-soft);">
        <div class="text-[10px] uppercase tracking-[0.15em] text-muted-c mb-2">Expense</div>
        <div class="flex items-baseline justify-between mb-1.5">
          <span class="text-xs font-mono-num text-strong">¥{{ fmtMoney(current.expense, 0) }}</span>
          <span class="text-[10px] font-mono-num" :class="expenseChange <= 0 ? 'text-positive' : 'text-negative'">
            {{ expenseChange >= 0 ? '+' : '' }}{{ expenseChange.toFixed(1) }}%
          </span>
        </div>
        <div class="space-y-1">
          <div class="h-1.5 w-full" style="background: var(--bg-muted);">
            <div class="h-full transition-all metal-h-accent" :style="{ width: `${expenseBars.cur}%` }"></div>
          </div>
          <div class="h-1 w-full" style="background: var(--bg-muted); opacity: 0.5;">
            <div class="h-full transition-all metal-h-accent" :style="{ width: `${expenseBars.prev}%`, opacity: 0.4 }"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-4 text-[9px] uppercase tracking-[0.15em] text-muted-c">
      <div class="flex items-center gap-1.5">
        <div class="w-2 h-2" style="background: var(--c-primary);"></div>
        <span>Current</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2 h-2" style="background: var(--c-primary); opacity: 0.3;"></div>
        <span>Previous</span>
      </div>
    </div>
  </div>
</template>
