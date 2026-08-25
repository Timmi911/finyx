<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, TrendingUp, Target, Wallet, ChevronLeft, ChevronRight, Edit3, Check, X, Settings2, RotateCcw } from 'lucide-vue-next'
import { store } from '../store'
import type { IncomeSource, IncomeRecord, GoalType } from '../types'
import { INCOME_SOURCE_PRESETS } from '../types'
import { fmtMoney, curMonth, shiftMonth, monthLabel } from '../utils/format'

// ===== 月份切换 =====
const curMonthStr = ref(curMonth())
const monthRecords = computed(() => store.monthIncomeRecords(curMonthStr.value))
const monthTotal = computed(() => store.monthIncome(curMonthStr.value))

// 年度收入（按月汇总）
const year = new Date().getFullYear()
const yearMonths = computed(() => {
  // 全年1-12月，不跨年（未到月份留白）
  const arr: string[] = []
  for (let m = 0; m < 12; m++) {
    arr.push(`${year}-${String(m + 1).padStart(2, '0')}`)
  }
  return arr
})
const yearTotalIncome = computed(() => store.yearIncome(year))
const yearRefundIncome = computed(() => store.yearRefundIncome(year))
const yearAvgIncome = computed(() => {
  const cnt = yearMonths.value.length || 1
  return yearTotalIncome.value / cnt
})

// ===== 收入录入 =====
const showAdd = ref(false)
const addForm = ref({
  month: curMonth(),
  date: new Date().toISOString().slice(0, 10),
  source: 'salary' as IncomeSource,
  amount: 0,
  note: '',
})

const submitAdd = async () => {
  if (addForm.value.amount <= 0) return
  await store.addIncomeRecord({ ...addForm.value })
  showAdd.value = false
  addForm.value = { month: curMonth(), date: new Date().toISOString().slice(0, 10), source: 'salary', amount: 0, note: '' }
}

// 编辑
const editingId = ref<string | null>(null)
const editForm = ref({ amount: 0, note: '', source: 'salary' as IncomeSource })

const startEdit = (r: IncomeRecord) => {
  editingId.value = r.id
  editForm.value = { amount: r.amount, note: r.note, source: r.source }
}
const saveEdit = async () => {
  if (editingId.value && editForm.value.amount > 0) {
    await store.updateIncomeRecord(editingId.value, { ...editForm.value })
  }
  editingId.value = null
}
const cancelEdit = () => { editingId.value = null }

// 来源样式
const sourceMeta = (s: IncomeSource) => {
  const m = store.sourceMeta(s)
  return { label: m.label, color: m.color }
}

// 全部来源（预设 + 自定义）
const allSources = computed(() => store.allIncomeSources())

// ===== 自定义来源管理 =====
const showSourceManager = ref(false)
const newSourceLabel = ref('')
const newSourceColor = ref('#a78bfa')
const sourceColors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#a78bfa', '#6366f1', '#f97316']

const customSources = computed(() => store.state.customIncomeSources)

const addCustomSource = () => {
  if (!newSourceLabel.value.trim()) return
  store.addCustomIncomeSource(newSourceLabel.value, newSourceColor.value)
  newSourceLabel.value = ''
  newSourceColor.value = '#a78bfa'
}

const delCustomSource = (id: string) => {
  store.deleteCustomIncomeSource(id)
}

// ===== 预设来源编辑 =====
const editingPreset = ref<string | null>(null)
const presetEditLabel = ref('')
const presetEditColor = ref('')

const presetOverrides = computed(() => store.state.incomeSourceOverrides)

const isPresetOverridden = (value: string) =>
  presetOverrides.value.some(o => o.value === value)

const startEditPreset = (value: string) => {
  const m = store.sourceMeta(value)
  editingPreset.value = value
  presetEditLabel.value = m.label
  presetEditColor.value = m.color
}

const saveEditPreset = async () => {
  if (!editingPreset.value) return
  if (!presetEditLabel.value.trim()) return
  await store.updateIncomeSourceOverride(editingPreset.value, {
    label: presetEditLabel.value.trim(),
    color: presetEditColor.value,
  })
  editingPreset.value = null
}

const resetPreset = async (value: string) => {
  await store.resetIncomeSourceOverride(value)
  if (editingPreset.value === value) editingPreset.value = null
}

const selectSource = (value: string) => {
  addForm.value.source = value
}

// ===== 目标 / 偿还计划 =====
const showAddGoal = ref(false)
const goalForm = ref({
  type: 'saving' as GoalType,
  title: '',
  targetAmount: 0,
  deadline: '',
  color: '#D4AF37',
})
const goalColors = ['#D4AF37', '#5E5CE6', '#0F7B6C', '#C2185B', '#3b82f6', '#f97316', '#10b981']

const savingGoals = computed(() => store.state.goals.filter(g => g.type === 'saving'))
const debtGoals = computed(() => store.state.goals.filter(g => g.type === 'debt'))

const submitAddGoal = async () => {
  if (!goalForm.value.title.trim() || goalForm.value.targetAmount <= 0) return
  await store.addGoal({ ...goalForm.value })
  showAddGoal.value = false
  goalForm.value = { type: 'saving', title: '', targetAmount: 0, deadline: '', color: '#D4AF37' }
}

// 目标记录
const recordForm = ref<Record<string, { amount: number; note: string }>>({})

const submitRecord = async (goalId: string) => {
  const f = recordForm.value[goalId]
  if (!f || f.amount <= 0) return
  await store.addGoalRecord(goalId, {
    date: new Date().toISOString().slice(0, 10),
    amount: f.amount,
    note: f.note || '',
  })
  f.amount = 0
  f.note = ''
}

const delGoal = async (id: string) => { await store.deleteGoal(id) }
const delRecord = async (goalId: string, idx: number) => { await store.deleteGoalRecord(goalId, idx) }

// 安全获取目标记录表单（避免 ||= 在模板中出问题）
const ensureRecordForm = (goalId: string) => {
  if (!recordForm.value[goalId]) {
    recordForm.value[goalId] = { amount: 0, note: '' }
  }
  return recordForm.value[goalId]
}
</script>

<template>
  <div>
  <div class="p-4 max-w-2xl mx-auto pb-20">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <Wallet class="w-5 h-5" style="color: var(--c-primary);" />
          收入与计划
        </h2>
        <p class="text-[10px] text-muted-c mt-0.5">Income Plan & Progress</p>
      </div>
      <button @click="showAdd = true"
        class="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 text-white transition-transform active:scale-95"
        style="background: var(--c-primary);">
        <Plus class="w-4 h-4" /> 录入收入
      </button>
    </div>

    <!-- 年度收入概览 -->
    <div class="card card-glow p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp class="w-3.5 h-3.5" style="color: var(--c-primary);" />
          年度收入 {{ year }}
        </div>
        <div class="text-[9px] text-muted-c">月均 ¥{{ fmtMoney(yearAvgIncome, 0) }}</div>
      </div>
      <div class="text-2xl font-bold font-mono-num mb-1" style="color: var(--c-primary);">
        ¥{{ fmtMoney(yearTotalIncome, 0) }}
      </div>
      <div v-if="yearRefundIncome > 0" class="text-[10px] text-muted-c mb-3">
        其中报销/退款 <span class="font-mono-num text-negative">¥{{ fmtMoney(yearRefundIncome, 0) }}</span> 未计入合计
      </div>
      <div v-else class="mb-3"></div>
      <!-- 按月柱状条 -->
      <div class="flex items-end gap-1 h-16">
        <div v-for="m in yearMonths" :key="m" class="flex-1 flex flex-col items-center gap-0.5">
          <div class="w-full rounded-t-sm transition-all duration-300 metal-v-positive"
            :style="{
              height: `${Math.max((store.monthIncome(m) / Math.max(...yearMonths.map(x => store.monthIncome(x)), 1)) * 100, 2)}%`,
              opacity: store.monthIncome(m) > 0 ? 1 : 0.15,
            }"
            :title="`${monthLabel(m)}: ¥${fmtMoney(store.monthIncome(m), 0)}`"
          ></div>
          <span class="text-[8px] text-muted-c">{{ monthLabel(m) }}</span>
        </div>
      </div>
    </div>

    <!-- 月份切换 + 收入明细 -->
    <div class="card card-glow p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <button @click="curMonthStr = shiftMonth(curMonthStr, -1)" class="p-1 rounded hover:bg-white/5">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <div class="text-sm font-semibold">{{ curMonthStr }} 收入明细</div>
        <button @click="curMonthStr = shiftMonth(curMonthStr, 1)" class="p-1 rounded hover:bg-white/5">
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
      <div class="text-right text-[10px] text-muted-c mb-2">
        当月合计 <span class="font-mono-num font-bold text-sm" style="color: var(--c-primary);">¥{{ fmtMoney(monthTotal, 2) }}</span>
      </div>
      <div v-if="monthRecords.length === 0" class="text-center text-[11px] text-muted-c py-6">
        本月暂无记录，点击右上角录入
      </div>
      <div v-else class="space-y-1.5">
        <div v-for="r in monthRecords" :key="r.id"
          class="flex items-center gap-2 p-2 rounded-lg"
          style="background: var(--bg-muted);">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
            :style="{ background: sourceMeta(r.source).color + '22', color: sourceMeta(r.source).color }">
            {{ sourceMeta(r.source).label.charAt(0) }}
          </span>
          <!-- 非编辑态 -->
          <template v-if="editingId !== r.id">
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium">{{ sourceMeta(r.source).label }}</div>
              <div class="text-[9px] text-muted-c truncate">{{ r.date }}{{ r.note ? ' · ' + r.note : '' }}</div>
            </div>
            <div class="text-sm font-mono-num font-bold" style="color: var(--c-primary);">¥{{ fmtMoney(r.amount, 2) }}</div>
            <button @click="startEdit(r)" class="p-1 text-muted-c hover:text-primary">
              <Edit3 class="w-3 h-3" />
            </button>
          </template>
          <!-- 编辑态 -->
          <template v-else>
            <select v-model="editForm.source" class="text-[11px] px-1.5 py-1 rounded border-0 outline-none"
              style="background: var(--bg-elevated);">
              <option v-for="p in allSources" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <input v-model.number="editForm.amount" type="number" step="0.01"
              class="w-20 text-xs px-1.5 py-1 rounded border-0 outline-none font-mono-num"
              style="background: var(--bg-elevated);">
            <input v-model="editForm.note" placeholder="备注"
              class="flex-1 text-[11px] px-1.5 py-1 rounded border-0 outline-none min-w-0"
              style="background: var(--bg-elevated);">
            <button @click="saveEdit" class="p-1" style="color: var(--c-primary);"><Check class="w-3.5 h-3.5" /></button>
            <button @click="cancelEdit" class="p-1 text-muted-c"><X class="w-3.5 h-3.5" /></button>
          </template>
        </div>
      </div>
    </div>

    <!-- 收入目标 -->
    <div class="card card-glow p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-semibold flex items-center gap-1.5">
          <Target class="w-4 h-4" style="color: var(--c-primary);" />
          收入目标
        </div>
        <button @click="showAddGoal = true; goalForm.type = 'saving'"
          class="text-[11px] px-2 py-1 rounded flex items-center gap-1"
          style="background: var(--bg-muted); color: var(--c-primary);">
          <Plus class="w-3 h-3" /> 新建
        </button>
      </div>
      <div v-if="savingGoals.length === 0" class="text-center text-[11px] text-muted-c py-4">
        暂无目标，点击右上角新建
      </div>
      <div v-else class="space-y-3">
        <div v-for="g in savingGoals" :key="g.id" class="rounded-lg p-3"
          style="background: var(--bg-muted);">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :style="{ background: g.color }"></span>
              <span class="text-xs font-semibold">{{ g.title }}</span>
              <span v-if="g.status === 'done'" class="text-[9px] px-1.5 py-0.5 rounded text-white" style="background: var(--c-primary);">已完成</span>
            </div>
            <button @click="delGoal(g.id)" class="text-muted-c hover:text-red-400"><Trash2 class="w-3 h-3" /></button>
          </div>
          <!-- 进度条 -->
          <div class="flex items-center gap-2 mb-2">
            <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: var(--bg-elevated);">
              <div class="h-full rounded-full transition-all duration-500"
                :style="{ width: (store.goalProgress(g) * 100) + '%', background: g.color }"></div>
            </div>
            <span class="text-[10px] font-mono-num text-muted-c">{{ Math.round(store.goalProgress(g) * 100) }}%</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-muted-c mb-2">
            <span>¥{{ fmtMoney(store.goalCurrentAmount(g), 0) }} / ¥{{ fmtMoney(g.targetAmount, 0) }}</span>
            <span v-if="g.deadline">截止 {{ g.deadline }}</span>
          </div>
          <!-- 快速记录 -->
          <div class="flex gap-1">
            <input v-model.number="ensureRecordForm(g.id).amount"
              type="number" placeholder="存入金额"
              class="flex-1 text-[11px] px-2 py-1 rounded border-0 outline-none font-mono-num"
              style="background: var(--bg-elevated);">
            <input v-model="ensureRecordForm(g.id).note"
              placeholder="备注" class="w-20 text-[11px] px-2 py-1 rounded border-0 outline-none"
              style="background: var(--bg-elevated);">
            <button @click="submitRecord(g.id)"
              class="px-2 py-1 rounded text-[11px] text-white"
              style="background: var(--c-primary);">+</button>
          </div>
          <!-- 记录列表 -->
          <div v-if="g.records.length > 0" class="mt-2 space-y-0.5">
            <div v-for="(r, i) in g.records.slice().reverse()" :key="i"
              class="flex items-center justify-between text-[10px] py-0.5">
              <span class="text-muted-c">{{ r.date }}{{ r.note ? ' · ' + r.note : '' }}</span>
              <span class="font-mono-num" style="color: var(--c-primary);">+¥{{ fmtMoney(r.amount, 0) }}</span>
              <button @click="delRecord(g.id, g.records.length - 1 - i)" class="text-muted-c hover:text-red-400 ml-1">
                <X class="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 偿还计划 -->
    <div class="card card-glow p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp class="w-4 h-4 rotate-180" style="color: var(--c-primary);" />
          偿还计划
        </div>
        <button @click="showAddGoal = true; goalForm.type = 'debt'"
          class="text-[11px] px-2 py-1 rounded flex items-center gap-1"
          style="background: var(--bg-muted); color: var(--c-primary);">
          <Plus class="w-3 h-3" /> 新建
        </button>
      </div>
      <div v-if="debtGoals.length === 0" class="text-center text-[11px] text-muted-c py-4">
        暂无偿还计划
      </div>
      <div v-else class="space-y-3">
        <div v-for="g in debtGoals" :key="g.id" class="rounded-lg p-3" style="background: var(--bg-muted);">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :style="{ background: g.color }"></span>
              <span class="text-xs font-semibold">{{ g.title }}</span>
              <span v-if="g.status === 'done'" class="text-[9px] px-1.5 py-0.5 rounded text-white" style="background: var(--c-primary);">已还清</span>
            </div>
            <button @click="delGoal(g.id)" class="text-muted-c hover:text-red-400"><Trash2 class="w-3 h-3" /></button>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: var(--bg-elevated);">
              <div class="h-full rounded-full transition-all duration-500"
                :style="{ width: (store.goalProgress(g) * 100) + '%', background: g.color }"></div>
            </div>
            <span class="text-[10px] font-mono-num text-muted-c">{{ Math.round(store.goalProgress(g) * 100) }}%</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-muted-c mb-2">
            <span>已还 ¥{{ fmtMoney(store.goalCurrentAmount(g), 0) }} / ¥{{ fmtMoney(g.targetAmount, 0) }}</span>
            <span v-if="g.deadline">截止 {{ g.deadline }}</span>
          </div>
          <div class="flex gap-1">
            <input v-model.number="ensureRecordForm(g.id).amount"
              type="number" placeholder="还款金额"
              class="flex-1 text-[11px] px-2 py-1 rounded border-0 outline-none font-mono-num"
              style="background: var(--bg-elevated);">
            <input v-model="ensureRecordForm(g.id).note"
              placeholder="备注" class="w-20 text-[11px] px-2 py-1 rounded border-0 outline-none"
              style="background: var(--bg-elevated);">
            <button @click="submitRecord(g.id)"
              class="px-2 py-1 rounded text-[11px] text-white"
              style="background: var(--c-primary);">+</button>
          </div>
          <div v-if="g.records.length > 0" class="mt-2 space-y-0.5">
            <div v-for="(r, i) in g.records.slice().reverse()" :key="i"
              class="flex items-center justify-between text-[10px] py-0.5">
              <span class="text-muted-c">{{ r.date }}{{ r.note ? ' · ' + r.note : '' }}</span>
              <span class="font-mono-num" style="color: var(--c-primary);">-¥{{ fmtMoney(r.amount, 0) }}</span>
              <button @click="delRecord(g.id, g.records.length - 1 - i)" class="text-muted-c hover:text-red-400 ml-1">
                <X class="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 录入收入弹窗 -->
  <Teleport to="body">
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.5);" @click.self="showAdd = false">
      <div class="w-full max-w-sm rounded-2xl p-5" style="background: var(--bg-elevated); border: 1px solid var(--border-strong);">
        <h3 class="text-sm font-bold mb-4">录入月度收入</h3>
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-muted-c">归属月份</label>
            <input v-model="addForm.month" type="month" class="w-full mt-1 text-xs px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
          <div>
            <div class="flex items-center justify-between">
              <label class="text-[10px] text-muted-c">收入来源</label>
              <button @click="showSourceManager = true" class="text-[9px] flex items-center gap-0.5 text-muted-c hover:text-primary">
                <Settings2 class="w-3 h-3" /> 管理
              </button>
            </div>
            <div class="grid grid-cols-3 gap-1 mt-1">
              <button v-for="p in allSources" :key="p.value"
                @click="selectSource(p.value)"
                class="py-1.5 rounded text-[10px] transition-all flex items-center gap-1 justify-center"
                :style="addForm.source === p.value
                  ? { background: p.color, color: '#fff' }
                  : { background: 'var(--bg-muted)', color: 'var(--text-muted)' }">
                <span class="w-1.5 h-1.5 rounded-full" :style="{ background: p.custom ? p.color : 'transparent' }"></span>
                {{ p.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-[10px] text-muted-c">金额</label>
            <input v-model.number="addForm.amount" type="number" step="0.01" placeholder="0.00"
              class="w-full mt-1 text-lg font-mono-num px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
          <div>
            <label class="text-[10px] text-muted-c">备注（选填）</label>
            <input v-model="addForm.note" placeholder="如：3月工资"
              class="w-full mt-1 text-xs px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="showAdd = false" class="flex-1 py-2 rounded-lg text-xs"
            style="background: var(--bg-muted);">取消</button>
          <button @click="submitAdd" class="flex-1 py-2 rounded-lg text-xs text-white"
            style="background: var(--c-primary);">确认录入</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 新建目标弹窗 -->
  <Teleport to="body">
    <div v-if="showAddGoal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.5);" @click.self="showAddGoal = false">
      <div class="w-full max-w-sm rounded-2xl p-5" style="background: var(--bg-elevated); border: 1px solid var(--border-strong);">
        <h3 class="text-sm font-bold mb-4">{{ goalForm.type === 'saving' ? '新建收入目标' : '新建偿还计划' }}</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <button @click="goalForm.type = 'saving'" class="py-2 rounded-lg text-xs transition-all"
              :style="goalForm.type === 'saving' ? { background: 'var(--c-primary)', color: '#fff' } : { background: 'var(--bg-muted)' }">
              收入目标
            </button>
            <button @click="goalForm.type = 'debt'" class="py-2 rounded-lg text-xs transition-all"
              :style="goalForm.type === 'debt' ? { background: 'var(--c-primary)', color: '#fff' } : { background: 'var(--bg-muted)' }">
              偿还计划
            </button>
          </div>
          <div>
            <label class="text-[10px] text-muted-c">名称</label>
            <input v-model="goalForm.title" :placeholder="goalForm.type === 'saving' ? '如：年存5万' : '如：还清信用卡'"
              class="w-full mt-1 text-xs px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
          <div>
            <label class="text-[10px] text-muted-c">{{ goalForm.type === 'saving' ? '目标金额' : '待还金额' }}</label>
            <input v-model.number="goalForm.targetAmount" type="number" placeholder="0"
              class="w-full mt-1 text-lg font-mono-num px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
          <div>
            <label class="text-[10px] text-muted-c">截止日期（选填）</label>
            <input v-model="goalForm.deadline" type="date"
              class="w-full mt-1 text-xs px-3 py-2 rounded-lg border-0 outline-none"
              style="background: var(--bg-muted);">
          </div>
          <div>
            <label class="text-[10px] text-muted-c">颜色</label>
            <div class="flex gap-1.5 mt-1">
              <button v-for="c in goalColors" :key="c" @click="goalForm.color = c"
                class="w-6 h-6 rounded-full transition-transform"
                :style="{ background: c, transform: goalForm.color === c ? 'scale(1.25)' : 'scale(1)', outline: goalForm.color === c ? '2px solid var(--c-primary)' : 'none' }">
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="showAddGoal = false" class="flex-1 py-2 rounded-lg text-xs"
            style="background: var(--bg-muted);">取消</button>
          <button @click="submitAddGoal" class="flex-1 py-2 rounded-lg text-xs text-white"
            style="background: var(--c-primary);">创建</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 来源管理弹窗 -->
  <Teleport to="body">
    <div v-if="showSourceManager" class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.5);" @click.self="showSourceManager = false">
      <div class="w-full max-w-sm rounded-2xl p-5" style="background: var(--bg-elevated); border: 1px solid var(--border-strong);">
        <h3 class="text-sm font-bold mb-4">收入来源管理</h3>

        <!-- 预设来源（可编辑） -->
        <div class="mb-4">
          <div class="text-[9px] text-muted-c mb-1.5">预设来源</div>
          <div class="space-y-1">
            <div v-for="p in INCOME_SOURCE_PRESETS" :key="p.value"
              class="p-2 rounded-lg" style="background: var(--bg-muted);">
              <!-- 展示态 -->
              <div v-if="editingPreset !== p.value" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :style="{ background: store.sourceMeta(p.value).color }"></span>
                <span class="flex-1 text-xs">{{ store.sourceMeta(p.value).label }}</span>
                <button @click="startEditPreset(p.value)" class="p-1 text-muted-c hover:text-primary">
                  <Edit3 class="w-3.5 h-3.5" />
                </button>
                <button v-if="isPresetOverridden(p.value)" @click="resetPreset(p.value)"
                  class="p-1 text-muted-c hover:text-primary" title="恢复默认">
                  <RotateCcw class="w-3.5 h-3.5" />
                </button>
              </div>
              <!-- 编辑态 -->
              <div v-else class="space-y-2">
                <input v-model="presetEditLabel" placeholder="名称"
                  class="w-full text-xs px-2 py-1 rounded border-0 outline-none"
                  style="background: var(--bg-elevated);">
                <div class="flex gap-1 flex-wrap">
                  <button v-for="c in sourceColors" :key="c" @click="presetEditColor = c"
                    class="w-5 h-5 rounded-full transition-transform"
                    :style="{ background: c, transform: presetEditColor === c ? 'scale(1.3)' : 'scale(1)', outline: presetEditColor === c ? '2px solid var(--c-primary)' : 'none' }">
                  </button>
                </div>
                <div class="flex gap-1">
                  <button @click="saveEditPreset"
                    class="flex-1 py-1 rounded text-[10px] text-white"
                    style="background: var(--c-primary);">
                    <Check class="w-3 h-3 inline -mt-0.5" /> 保存
                  </button>
                  <button @click="editingPreset = null"
                    class="flex-1 py-1 rounded text-[10px]"
                    style="background: var(--bg-elevated);">
                    <X class="w-3 h-3 inline -mt-0.5" /> 取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 自定义来源 -->
        <div class="mb-4">
          <div class="text-[9px] text-muted-c mb-1.5">自定义来源</div>
          <div v-if="customSources.length === 0" class="text-[10px] text-muted-c py-2">暂无自定义来源</div>
          <div v-else class="space-y-1.5">
            <div v-for="c in customSources" :key="c.id"
              class="flex items-center gap-2 p-2 rounded-lg" style="background: var(--bg-muted);">
              <span class="w-3 h-3 rounded-full" :style="{ background: c.color }"></span>
              <span class="flex-1 text-xs">{{ c.label }}</span>
              <button @click="delCustomSource(c.id)" class="p-1 text-muted-c hover:text-red-400">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- 新增 -->
        <div class="p-3 rounded-lg" style="background: var(--bg-muted);">
          <div class="text-[10px] text-muted-c mb-2">新增来源</div>
          <input v-model="newSourceLabel" placeholder="如：理财收益"
            class="w-full text-xs px-3 py-2 rounded-lg border-0 outline-none mb-2"
            style="background: var(--bg-elevated);">
          <div class="flex gap-1.5 mb-3">
            <button v-for="c in sourceColors" :key="c" @click="newSourceColor = c"
              class="w-5 h-5 rounded-full transition-transform"
              :style="{ background: c, transform: newSourceColor === c ? 'scale(1.3)' : 'scale(1)', outline: newSourceColor === c ? '2px solid var(--c-primary)' : 'none' }">
            </button>
          </div>
          <button @click="addCustomSource"
            class="w-full py-2 rounded-lg text-xs text-white"
            style="background: var(--c-primary);">
            添加
          </button>
        </div>

        <button @click="showSourceManager = false"
          class="w-full mt-4 py-2 rounded-lg text-xs"
          style="background: var(--bg-muted);">关闭</button>
      </div>
    </div>
  </Teleport>
  </div>
</template>
