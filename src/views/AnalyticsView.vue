<script setup lang="ts">
import { ref, computed } from 'vue'
import { store } from '../store'
import { fmtMoney, fmtShort, curMonth, shiftMonth } from '../utils/format'
import CategoryDonut from '../components/charts/CategoryDonut.vue'
import CompareBar from '../components/charts/CompareBar.vue'
import { BILL_KIND_PRESETS } from '../types'
import type { BillKind } from '../types'

const chartMonths = ref(12)
const selectedMonth = ref(curMonth())

const months = computed(() => {
  // 当年1月到chartMonths月，不跨年（按钮3/6/12 → 1-3月/1-6月/1-12月）
  const now = new Date()
  const y = now.getFullYear()
  const arr: string[] = []
  for (let m = 0; m < chartMonths.value; m++) {
    arr.push(`${y}-${String(m + 1).padStart(2, '0')}`)
  }
  return arr
})
const countData = computed(() => months.value.map(m => store.monthBillStats(m).count))
const amountData = computed(() => months.value.map(m => store.monthBillStats(m).netAmount))

// 分类占比（支出金额）
const categorySegments = computed(() => {
  const map = new Map<string, number>()
  store.state.bills
    .filter(b => b.date.startsWith(selectedMonth.value) && b.status !== 'void')
    .forEach(b => map.set(b.category, (map.get(b.category) || 0) + b.amount))
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

// 类型分布
const kindDist = computed(() => {
  const map = new Map<BillKind, number>()
  store.state.bills
    .filter(b => b.date.startsWith(selectedMonth.value) && b.status !== 'void')
    .forEach(b => map.set(b.kind, (map.get(b.kind) || 0) + b.amount))
  return BILL_KIND_PRESETS.map(p => ({ ...p, amount: map.get(p.kind) || 0 })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount)
})

// 月度环比
const currentStats = computed(() => store.monthBillStats(selectedMonth.value))
const previousStats = computed(() => store.monthBillStats(shiftMonth(selectedMonth.value, -1)))

// 个人消费 vs 可报销
const usageCompare = computed(() => {
  let personal = 0, reimbursable = 0
  store.state.bills
    .filter(b => b.date.startsWith(selectedMonth.value) && b.status !== 'void')
    .forEach(b => b.usage === 'personal' ? personal += b.amount : reimbursable += b.amount)
  return { personal, reimbursable }
})

// 分类排行
const categoryRank = computed(() => {
  const map = new Map<string, { count: number; total: number }>()
  store.state.bills
    .filter(b => b.date.startsWith(selectedMonth.value) && b.status !== 'void')
    .forEach(b => {
      const e = map.get(b.category) || { count: 0, total: 0 }
      e.count++; e.total += b.amount
      map.set(b.category, e)
    })
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total)
})
</script>

<template>
  <div class="space-y-5 max-w-6xl mx-auto">
    <!-- 趋势 + 金额 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="section-title">归集金额趋势</div>
          <div class="flex items-center gap-0.5 bg-muted-c rounded-lg p-0.5 border border-soft">
            <button v-for="n in [3, 6, 12]" :key="n" @click="chartMonths = n" :class="['px-2.5 py-1 rounded-md text-xs font-medium transition-all', chartMonths === n ? 'bg-primary-tint text-primary' : 'text-muted-c hover:text-base-c']">{{ n }}月</button>
          </div>
        </div>
        <div class="flex items-end gap-2 h-32 px-2 pb-2" style="border-bottom: 1px solid var(--border-soft);">
          <template v-for="(m, i) in months" :key="m">
            <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span class="text-[9px] font-mono-num text-muted-c">{{ amountData[i] > 0 ? fmtShort(amountData[i]) : '' }}</span>
              <div
                class="w-full transition-all duration-500 metal-v"
                :style="{
                  height: `${(amountData[i] / Math.max(...amountData, 1)) * 100}%`,
                  opacity: i === months.length - 1 ? 1 : 0.35
                }"
              ></div>
            </div>
          </template>
        </div>
        <div class="flex justify-between mt-1 px-2">
          <span v-for="m in months" :key="m" class="text-[9px] text-faint-c font-mono-num uppercase">{{ m.slice(5) }}</span>
        </div>
      </div>

      <div class="card p-5">
        <div class="section-title mb-4">票据数量</div>
        <div class="flex items-end gap-2 h-32 px-2 pb-2" style="border-bottom: 1px solid var(--border-soft);">
          <template v-for="(m, i) in months" :key="m">
            <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span class="text-[9px] font-mono-num text-muted-c">{{ countData[i] }}</span>
              <div
                class="w-full transition-all duration-500 metal-v-hatch"
                :style="{
                  height: `${(countData[i] / Math.max(...countData, 1)) * 100}%`,
                  opacity: i === months.length - 1 ? 1 : 0.35
                }"
              ></div>
            </div>
          </template>
        </div>
        <div class="flex justify-between mt-1 px-2">
          <span v-for="m in months" :key="m" class="text-[9px] text-faint-c font-mono-num uppercase">{{ m.slice(5) }}</span>
        </div>
      </div>
    </div>

    <!-- 分类 + 类型 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div class="section-title">用途分类占比</div>
          <div class="flex items-center gap-1">
            <button @click="selectedMonth = shiftMonth(selectedMonth, -1)" class="p-1 hover:bg-muted-c rounded text-muted-c">‹</button>
            <span class="text-xs text-muted-c font-mono px-1">{{ selectedMonth }}</span>
            <button @click="selectedMonth = shiftMonth(selectedMonth, 1)" class="p-1 hover:bg-muted-c rounded text-muted-c">›</button>
          </div>
        </div>
        <CategoryDonut :segments="categorySegments" />
      </div>

      <div class="card p-5">
        <div class="section-title mb-4">票据类型</div>
        <div class="space-y-3">
          <div v-for="k in kindDist" :key="k.kind" class="flex items-center gap-3">
            <span class="text-xs text-muted-c w-20 shrink-0">{{ k.label }}</span>
            <div class="flex-1 h-1.5 bg-muted-c overflow-hidden">
              <div class="h-full transition-all duration-500 metal-h" :style="{ width: `${kindDist[0] ? (k.amount / kindDist[0].amount) * 100 : 0}%` }"></div>
            </div>
            <span class="text-xs font-mono-num text-muted-c w-16 text-right">¥{{ fmtShort(k.amount) }}</span>
          </div>
          <div v-if="kindDist.length === 0" class="text-center py-6 text-faint-c text-sm">本月暂无数据</div>
        </div>
      </div>
    </div>

    <!-- 环比 + 排行 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="section-title">环比对比</div>
          <span class="text-xs text-muted-c">{{ selectedMonth }} vs {{ shiftMonth(selectedMonth, -1) }}</span>
        </div>
        <CompareBar :current="{ income: currentStats.amount, expense: 0, balance: 0 }" :previous="{ income: previousStats.amount, expense: 0, balance: 0 }" />
        <div class="mt-4 pt-4 border-t border-soft grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-[10px] text-faint-c mb-1">个人消费</div>
            <div class="text-base font-mono text-base-c">¥{{ fmtMoney(usageCompare.personal, 0) }}</div>
          </div>
          <div>
            <div class="text-[10px] text-faint-c mb-1">可报销</div>
            <div class="text-base font-mono text-primary">¥{{ fmtMoney(usageCompare.reimbursable, 0) }}</div>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="section-title mb-4">分类排行 ({{ selectedMonth }})</div>
        <div class="space-y-2">
          <div v-for="(cat, i) in categoryRank.slice(0, 8)" :key="cat.name" class="flex items-center gap-3 py-1.5">
            <span class="text-xs font-mono w-5 text-faint-c">{{ i + 1 }}</span>
            <span class="text-sm text-base-c flex-1">{{ cat.name }}</span>
            <span class="text-xs text-faint-c">{{ cat.count }}张</span>
            <span class="text-sm font-mono text-base-c w-20 text-right">¥{{ fmtMoney(cat.total, 0) }}</span>
          </div>
          <div v-if="categoryRank.length === 0" class="text-center py-6 text-faint-c text-sm">暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>
