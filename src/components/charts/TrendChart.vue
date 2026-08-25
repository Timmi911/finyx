<script setup lang="ts">
import { computed } from 'vue'
import { lineChartPath, lineChartArea, lineChartPoints, monthLabel, fmtShort } from '../../utils/format'

const props = defineProps<{
  months: string[]
  income: number[]
  expense: number[]
}>()

const W = 560, H = 200, PX = 36, PY = 20
const maxVal = computed(() => Math.max(...props.income, ...props.expense, 1))

const incomePath = computed(() => lineChartPath(props.income, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
const expensePath = computed(() => lineChartPath(props.expense, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
const incomeArea = computed(() => lineChartArea(props.income, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
const expenseArea = computed(() => lineChartArea(props.expense, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
const incomePts = computed(() => lineChartPoints(props.income, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
const expensePts = computed(() => lineChartPoints(props.expense, { width: W, height: H, padX: PX, padY: PY, max: maxVal.value }))
</script>

<template>
  <div class="w-full overflow-x-auto no-scrollbar">
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full min-w-[360px]" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendIncome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#34d399" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="trendExpense" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f87171" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#f87171" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- 网格 -->
      <g stroke="rgba(255,255,255,0.04)" stroke-width="1">
        <line v-for="y in [20, 60, 100, 140, 180]" :key="y" :x1="PX" :y1="y" :x2="W - PX" :y2="y" />
      </g>

      <!-- 面积 -->
      <path :d="incomeArea" fill="url(#trendIncome)" />
      <path :d="expenseArea" fill="url(#trendExpense)" />

      <!-- 折线 -->
      <path :d="incomePath" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path :d="expensePath" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

      <!-- 数据点 -->
      <g v-for="(p, i) in incomePts" :key="'i' + i">
        <circle :cx="p.x" :cy="p.y" r="3" fill="#070710" stroke="#34d399" stroke-width="2" />
      </g>
      <g v-for="(p, i) in expensePts" :key="'e' + i">
        <circle :cx="p.x" :cy="p.y" r="3" fill="#070710" stroke="#f87171" stroke-width="2" />
      </g>

      <!-- 月份标签 -->
      <g font-size="10" fill="rgba(255,255,255,0.3)" font-family="JetBrains Mono">
        <text
          v-for="(m, i) in months"
          :key="'l' + i"
          :x="PX + i * ((W - PX * 2) / Math.max(months.length - 1, 1))"
          :y="H - 2"
          text-anchor="middle"
        >{{ monthLabel(m) }}</text>
      </g>

      <!-- Y轴标签 -->
      <g font-size="9" fill="rgba(255,255,255,0.2)" font-family="JetBrains Mono" text-anchor="end">
        <text :x="PX - 6" :y="24">{{ fmtShort(maxVal) }}</text>
        <text :x="PX - 6" :y="104">{{ fmtShort(maxVal / 2) }}</text>
        <text :x="PX - 6" :y="184">0</text>
      </g>
    </svg>
  </div>
</template>
