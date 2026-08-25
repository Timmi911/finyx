<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Receipt, FolderArchive, Send, TrendingUp, FileText, Plane, HeartPulse, Zap, ShoppingBag, ChevronRight, Upload, ArrowUp, ArrowDown } from 'lucide-vue-next'
import { store } from '../store'
import { fmtMoney, fmtShort, curMonth, shiftMonth, monthLabel } from '../utils/format'
import { BILL_KIND_PRESETS, BILL_CATEGORIES } from '../types'
import type { BillKind } from '../types'

const router = useRouter()
const month = curMonth()
const monthStats = computed(() => store.monthBillStats(month))
const reimbStats = computed(() => store.reimbursableStats())

const totalBills = computed(() => store.state.bills.filter(b => b.status !== 'void').length)

const months12 = computed(() => {
  // 全年1-12月，不跨年（未到月份留白）
  const now = new Date()
  const y = now.getFullYear()
  const arr: string[] = []
  for (let m = 0; m < 12; m++) {
    arr.push(`${y}-${String(m + 1).padStart(2, '0')}`)
  }
  return arr
})
const trendCounts = computed(() => months12.value.map(m => store.monthBillStats(m).count))
const trendAmounts = computed(() => months12.value.map(m => store.monthBillStats(m).netAmount))

const kindDist = computed(() => {
  const map = new Map<BillKind, { count: number; amount: number }>()
  store.state.bills
    .filter(b => b.date.startsWith(month) && b.status !== 'void')
    .forEach(b => {
      const e = map.get(b.kind) || { count: 0, amount: 0 }
      e.count++; e.amount += b.amount
      map.set(b.kind, e)
    })
  return BILL_KIND_PRESETS.map(p => ({ ...p, ...(map.get(p.kind) || { count: 0, amount: 0 }) }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.amount - a.amount)
})

const kindIcon: Record<BillKind, any> = { invoice: FileText, receipt: Receipt, transport: Plane, medical: HeartPulse, utility: Zap, other: ShoppingBag }

const recentBills = computed(() =>
  [...store.state.bills]
    .filter(b => b.status !== 'void')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6)
)

const maxCount = computed(() => Math.max(...trendCounts.value, 1))
const maxAmount = computed(() => Math.max(...trendAmounts.value, 1))

// ===== 年度按月收入/支出 =====
const yearMonths = computed(() => {
  // 全年1-12月，未到月份数据为空（留白）
  const now = new Date()
  const y = now.getFullYear()
  const arr: string[] = []
  for (let m = 0; m < 12; m++) {
    arr.push(`${y}-${String(m + 1).padStart(2, '0')}`)
  }
  return arr
})

const monthlyBreakdown = computed(() => {
  return yearMonths.value.map(m => {
    const bills = store.state.bills.filter(b => b.date.startsWith(m) && b.status !== 'void')
    // 支出 = 总归集额 - 已报销金额（净支出）
    const totalAmount = bills.reduce((s, b) => s + b.amount, 0)
    const reimbursedAmount = bills
      .filter(b => b.status === 'reimbursed')
      .reduce((s, b) => s + b.amount, 0)
    const expense = totalAmount - reimbursedAmount
    // 收入 = 手动录入月度收入（不含报销/退款，避免与已报销票据重复）
    const income = store.monthIncome(m)
    return { month: m, expense, income }
  })
})

const yearTotalIncome = computed(() => monthlyBreakdown.value.reduce((s, m) => s + m.income, 0))
const yearTotalExpense = computed(() => monthlyBreakdown.value.reduce((s, m) => s + m.expense, 0))
const yearNet = computed(() => yearTotalIncome.value - yearTotalExpense.value)
const maxBar = computed(() => Math.max(...monthlyBreakdown.value.flatMap(m => [m.income, m.expense]), 1))
</script>

<template>
  <div class="space-y-4 max-w-6xl mx-auto">
    <!-- 年度收支信息条 -->
    <div class="p-4" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
          <div class="flex flex-col leading-tight">
            <span class="text-xs font-semibold text-strong tracking-[0.15em]">年度收支概览</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">{{ new Date().getFullYear() }} Annual Overview</span>
          </div>
        </div>
          <div class="flex items-center gap-4 text-[10px]">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm metal-v-positive"></span>
            <span class="text-muted-c">收入</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm metal-v-negative"></span>
            <span class="text-muted-c">支出</span>
          </div>
        </div>
      </div>

      <!-- 汇总数字 -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div class="text-[9px] text-muted-c tracking-wider mb-0.5">年度收入</div>
          <div class="text-lg font-bold font-mono-num" style="color: #8a8a8a;">¥{{ fmtShort(yearTotalIncome) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-muted-c tracking-wider mb-0.5">年度支出</div>
          <div class="text-lg font-bold font-mono-num" :style="{ color: 'color-mix(in srgb, var(--c-primary) 60%, #888 40%)' }">¥{{ fmtShort(yearTotalExpense) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-muted-c tracking-wider mb-0.5">净结余</div>
          <div class="text-lg font-bold font-mono-num" :style="{ color: yearNet >= 0 ? 'var(--c-primary)' : 'color-mix(in srgb, var(--c-primary) 50%, var(--c-negative) 50%)' }">
            {{ yearNet >= 0 ? '+' : '-' }}¥{{ fmtShort(Math.abs(yearNet)) }}
          </div>
        </div>
      </div>

      <!-- 按月条形图 -->
      <div class="flex items-end gap-1 h-20 px-0.5">
        <div v-for="m in monthlyBreakdown" :key="m.month" class="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
          <!-- 双柱：收入+支出 -->
          <div class="w-full flex justify-center gap-px h-full items-end">
            <div
              class="w-1/2 max-w-[10px] rounded-t-sm transition-all duration-300 metal-v-positive"
              :style="{
                height: `${(m.income / maxBar) * 100}%`,
                opacity: m.income > 0 ? 1 : 0.12,
              }"
            ></div>
            <div
              class="w-1/2 max-w-[10px] rounded-t-sm transition-all duration-300 metal-v-negative"
              :style="{
                height: `${(m.expense / maxBar) * 100}%`,
                opacity: m.expense > 0 ? 1 : 0.12,
              }"
            ></div>
          </div>
          <!-- 悬浮提示 -->
          <div class="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap px-2 py-1 rounded text-[9px] font-mono-num" style="background: var(--bg-elevated); border: 1px solid var(--border-strong); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="color: #8a8a8a;">收 ¥{{ fmtMoney(m.income, 0) }}</div>
            <div :style="{ color: 'color-mix(in srgb, var(--c-primary) 60%, #888 40%)' }">支 ¥{{ fmtMoney(m.expense, 0) }}</div>
          </div>
        </div>
      </div>
      <!-- 月份标签 -->
      <div class="flex gap-1 mt-1.5">
        <div v-for="m in monthlyBreakdown" :key="m.month" class="flex-1 text-center">
          <span class="text-[8px] text-faint-c font-mono-num">{{ monthLabel(m.month) }}</span>
        </div>
      </div>
    </div>
    <!-- 顶部核心指标 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-px" style="background: var(--border-soft);">
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">票据总数</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Total Bills</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <Receipt class="w-3 h-3 text-primary" />
          </div>
        </div>
        <div class="text-xl font-bold text-strong font-mono-num">{{ totalBills }}</div>
        <div class="text-[9px] text-muted-c mt-0.5 font-mono-num">+{{ monthStats.count }} 本月新增</div>
      </div>
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">本月归集额</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Monthly</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <TrendingUp class="w-3 h-3 text-accent" />
          </div>
        </div>
        <div class="text-xl font-bold text-strong font-mono-num">¥{{ fmtMoney(monthStats.amount, 0) }}</div>
        <div class="text-[9px] text-muted-c mt-0.5 font-mono-num">{{ monthStats.count }} 张票据</div>
      </div>
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">待提交报销</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Pending</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <Send class="w-3 h-3 text-accent" />
          </div>
        </div>
        <div class="text-xl font-bold text-negative font-mono-num">¥{{ fmtMoney(reimbStats.pendingAmount, 0) }}</div>
        <div class="text-[9px] text-muted-c mt-0.5 font-mono-num">{{ reimbStats.pendingCount }} 张待处理</div>
      </div>
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">已报销</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Reimbursed</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <FolderArchive class="w-3 h-3 text-positive" />
          </div>
        </div>
        <div class="text-xl font-bold text-positive font-mono-num">¥{{ fmtMoney(reimbStats.reimbursedAmount, 0) }}</div>
        <div class="text-[9px] text-muted-c mt-0.5 font-mono-num">{{ reimbStats.reimbursedCount }} 张已完成</div>
      </div>
    </div>

    <!-- 快捷归集 -->
    <div class="p-4" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
          <div class="flex flex-col leading-tight">
            <span class="text-xs font-semibold text-strong tracking-[0.15em]">快捷归集</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Quick Capture</span>
          </div>
        </div>
        <button @click="router.push('/capture')" class="text-[10px] text-primary tracking-wider hover:underline flex items-center gap-0.5">
          更多 <ChevronRight class="w-3 h-3" />
        </button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-px" style="background: var(--border-soft);">
        <button @click="router.push('/capture')" class="flex flex-col items-center gap-2 p-3 transition-all" style="background: var(--bg-surface);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div class="w-8 h-8 flex items-center justify-center" style="background: var(--bg-muted);">
            <Upload class="w-4 h-4 text-primary" />
          </div>
          <div class="flex flex-col items-center leading-tight">
            <span class="text-[10px] tracking-wider text-base-c">拍照上传</span>
            <span class="text-[7px] tracking-[0.1em] text-faint-c uppercase">Upload</span>
          </div>
        </button>
        <button @click="router.push('/capture')" class="flex flex-col items-center gap-2 p-3 transition-all" style="background: var(--bg-surface);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div class="w-8 h-8 flex items-center justify-center" style="background: var(--bg-muted);">
            <FileText class="w-4 h-4 text-primary" />
          </div>
          <div class="flex flex-col items-center leading-tight">
            <span class="text-[10px] tracking-wider text-base-c">手动录入</span>
            <span class="text-[7px] tracking-[0.1em] text-faint-c uppercase">Manual</span>
          </div>
        </button>
        <button @click="router.push('/capture')" class="flex flex-col items-center gap-2 p-3 transition-all" style="background: var(--bg-surface);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div class="w-8 h-8 flex items-center justify-center" style="background: var(--bg-muted);">
            <Receipt class="w-4 h-4 text-primary" />
          </div>
          <div class="flex flex-col items-center leading-tight">
            <span class="text-[10px] tracking-wider text-base-c">票据导入</span>
            <span class="text-[7px] tracking-[0.1em] text-faint-c uppercase">Import</span>
          </div>
        </button>
        <button @click="router.push('/reimburse')" class="flex flex-col items-center gap-2 p-3 transition-all" style="background: var(--bg-surface);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div class="w-8 h-8 flex items-center justify-center" style="background: var(--bg-muted);">
            <Send class="w-4 h-4 text-primary" />
          </div>
          <div class="flex flex-col items-center leading-tight">
            <span class="text-[10px] tracking-wider text-base-c">发起报销</span>
            <span class="text-[7px] tracking-[0.1em] text-faint-c uppercase">Reimburse</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 趋势 + 类型分布 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 色块趋势图 -->
      <div class="p-4 lg:col-span-2" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
            <div class="flex flex-col leading-tight">
              <span class="text-xs font-semibold text-strong tracking-[0.15em]">近12月归集趋势</span>
              <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">12-Month Trend</span>
            </div>
          </div>
          <span class="text-[10px] text-muted-c tracking-wider">票据张数 <span class="text-faint-c">/ Count</span></span>
        </div>
        <div class="flex items-end gap-2 h-28 px-2 pb-2" style="border-bottom: 1px solid var(--border-soft);">
          <template v-for="(m, i) in months12" :key="m">
            <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span class="text-[9px] font-mono-num text-muted-c">{{ trendCounts[i] }}</span>
              <div
                class="w-full transition-all duration-500 metal-v"
                :style="{
                  height: `${(trendCounts[i] / maxCount) * 100}%`,
                  opacity: i === months12.length - 1 ? 1 : 0.35
                }"
              ></div>
            </div>
          </template>
        </div>
        <div class="flex justify-between mt-1 px-2">
          <span v-for="m in months12" :key="m" class="text-[9px] text-faint-c font-mono-num">{{ m.slice(5) }}</span>
        </div>
        <!-- 分隔线 -->
        <div class="my-3" style="border-top: 1px solid var(--border-soft);"></div>
        <!-- 金额趋势 -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-semibold text-strong tracking-wider">归集金额</span>
          <span class="text-[9px] text-muted-c tracking-wider">净支出 <span class="text-faint-c">/ Net</span></span>
        </div>
        <div class="flex items-end gap-2 h-28 px-2 pb-2" style="border-bottom: 1px solid var(--border-soft);">
          <template v-for="(m, i) in months12" :key="m">
            <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span class="text-[9px] font-mono-num text-muted-c">{{ trendAmounts[i] > 0 ? fmtShort(trendAmounts[i]) : '' }}</span>
              <div
                class="w-full transition-all duration-500 metal-v-positive"
                :style="{
                  height: `${(trendAmounts[i] / maxAmount) * 100}%`,
                  opacity: i === months12.length - 1 ? 1 : 0.35
                }"
              ></div>
            </div>
          </template>
        </div>
        <div class="flex justify-between mt-1 px-2">
          <span v-for="m in months12" :key="m" class="text-[9px] text-faint-c font-mono-num">{{ m.slice(5) }}</span>
        </div>
      </div>

      <!-- 类型分布 -->
      <div class="p-4" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
          <div class="flex flex-col leading-tight">
            <span class="text-xs font-semibold text-strong tracking-[0.15em]">票据类型</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">By Category</span>
          </div>
        </div>
        <div v-if="kindDist.length === 0" class="text-center py-8 text-faint-c text-[10px] tracking-wider">暂无数据</div>
        <div v-else class="space-y-2.5">
          <div v-for="k in kindDist" :key="k.kind" class="space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-base-c flex items-center gap-1.5">
                <component :is="kindIcon[k.kind] || Receipt" class="w-3 h-3" style="color: var(--c-primary);" />
                {{ k.label }}
              </span>
              <span class="text-muted-c font-mono-num">{{ k.count }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1" style="background: var(--bg-muted);">
                <div
                  class="h-full metal-h"
                  :style="{
                    width: `${(k.amount / kindDist[0].amount) * 100}%`
                  }"
                ></div>
              </div>
              <span class="text-[10px] font-mono-num text-muted-c w-14 text-right">¥{{ fmtShort(k.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近归集 -->
    <div class="p-4" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
      <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
            <div class="flex flex-col leading-tight">
              <span class="text-xs font-semibold text-strong tracking-[0.15em]">最近归集</span>
              <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Recent Bills</span>
            </div>
          </div>
          <button @click="router.push('/bills')" class="text-[10px] text-primary tracking-wider hover:underline flex items-center gap-0.5">
            查看全部 <ChevronRight class="w-3 h-3" />
          </button>
        </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-px" style="background: var(--border-soft);">
        <div
          v-for="bill in recentBills"
          :key="bill.id"
          class="flex items-center gap-3 p-3 transition-all"
          style="background: var(--bg-surface);"
          onmouseover="this.style.background='var(--bg-hover)'"
          onmouseout="this.style.background='var(--bg-surface)'"
        >
          <div class="w-6 h-6 flex items-center justify-center shrink-0" style="background: var(--bg-muted); border: 1px solid var(--border-soft);">
            <component :is="kindIcon[bill.kind] || Receipt" class="w-3 h-3" style="color: var(--c-primary);" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs text-strong truncate font-medium">{{ bill.merchant || '未填写' }}</span>
              <span class="text-[9px] tracking-wider text-muted-c">{{ bill.category }}</span>
            </div>
            <div class="text-[9px] text-faint-c mt-0.5 font-mono-num">{{ bill.date }}</div>
          </div>
          <span class="text-xs font-mono-num" :class="bill.usage === 'reimbursable' ? 'text-negative' : 'text-base-c'">¥{{ fmtMoney(bill.amount, 0) }}</span>
        </div>
        <div v-if="recentBills.length === 0" class="col-span-full text-center py-8 text-faint-c text-[10px] tracking-wider">
          尚未归集任何票据
        </div>
      </div>
    </div>
  </div>
</template>
