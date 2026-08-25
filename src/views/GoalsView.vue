<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Target, Plus, TrendingUp, TrendingDown, Check, X, Trash2, MapPin, Flag, Trophy, Calendar } from 'lucide-vue-next'
import { store } from '../store'
import type { Goal, GoalType, GoalRecord } from '../types'
import { fmtMoney } from '../utils/format'

const showAdd = ref(false)
const addForm = ref({
  type: 'saving' as GoalType,
  title: '',
  targetAmount: 0,
  deadline: '',
  color: '#D4AF37',
})

const colors = ['#D4AF37', '#5E5CE6', '#0F7B6C', '#C2185B', '#EC4899', '#3b82f6', '#f97316', '#10b981']

const goals = computed(() => store.state.goals)
const activeGoals = computed(() => goals.value.filter(g => g.status === 'active'))
const doneGoals = computed(() => goals.value.filter(g => g.status === 'done'))

const totalProgress = computed(() => {
  if (activeGoals.value.length === 0) return 0
  const sum = activeGoals.value.reduce((s, g) => s + store.goalProgress(g), 0)
  return sum / activeGoals.value.length
})

const submitAdd = () => {
  if (!addForm.value.title.trim() || addForm.value.targetAmount <= 0) return
  store.addGoal({ ...addForm.value })
  showAdd.value = false
  addForm.value = { type: 'saving', title: '', targetAmount: 0, deadline: '', color: '#D4AF37' }
}

// 添加记录
const recordForm = ref<Record<string, { amount: number; note: string }>>({})

// 目标变化时预初始化 recordForm
watch(goals, (newGoals) => {
  newGoals.forEach(g => {
    if (!recordForm.value[g.id]) {
      recordForm.value[g.id] = { amount: 0, note: '' }
    }
  })
}, { immediate: true })

const addRecord = async (goal: Goal) => {
  const f = recordForm.value[goal.id]
  if (!f || f.amount <= 0) return
  await store.addGoalRecord(goal.id, {
    date: new Date().toISOString().slice(0, 10),
    amount: f.amount,
    note: f.note || '',
  })
  f.amount = 0
  f.note = ''
}

const delGoal = async (id: string) => { await store.deleteGoal(id) }
const delRecord = async (goalId: string, idx: number) => { await store.deleteGoalRecord(goalId, idx) }

const daysBetween = (d1: string, d2: string) => {
  if (!d1 || !d2) return 0
  const ms = new Date(d2).getTime() - new Date(d1).getTime()
  return Math.round(ms / 86400000)
}

const daysLeft = (deadline: string) => {
  if (!deadline) return 0
  return daysBetween(new Date().toISOString().slice(0, 10), deadline)
}

const goalDays = (goal: Goal) => {
  if (goal.records.length === 0) return 0
  const first = goal.records[0].date
  const last = goal.records[goal.records.length - 1].date
  return Math.max(daysBetween(first, last), 1)
}
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <!-- 顶部概览 -->
    <div class="grid grid-cols-3 gap-px" style="background: var(--border-soft);">
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">进行中</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Active</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <Target class="w-3 h-3 text-primary" />
          </div>
        </div>
        <div class="text-xl font-bold text-strong font-mono-num">{{ activeGoals.length }}</div>
      </div>
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">已达成</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Completed</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <Trophy class="w-3 h-3 text-positive" />
          </div>
        </div>
        <div class="text-xl font-bold text-positive font-mono-num">{{ doneGoals.length }}</div>
      </div>
      <div class="p-4" style="background: var(--bg-surface);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[9px] tracking-[0.15em] text-muted-c">平均进度</span>
            <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Avg Progress</span>
          </div>
          <div class="w-5 h-5 flex items-center justify-center" style="background: var(--bg-muted);">
            <TrendingUp class="w-3 h-3 text-accent" />
          </div>
        </div>
        <div class="text-xl font-bold text-strong font-mono-num">{{ (totalProgress * 100).toFixed(0) }}<span class="text-sm text-muted-c">%</span></div>
      </div>
    </div>

    <!-- 新建目标按钮 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
        <div class="flex flex-col leading-tight">
          <span class="text-xs font-semibold text-strong tracking-[0.15em]">目标地图</span>
          <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Goal Map</span>
        </div>
      </div>
      <button @click="showAdd = true" class="metal-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-primary)' }">
        <Plus class="w-3.5 h-3.5" /> 新建目标
      </button>
    </div>

    <!-- 目标列表 -->
    <div v-if="goals.length === 0" class="p-12 text-center" style="background: var(--bg-surface); border: 1px solid var(--border-soft);">
      <Target class="w-10 h-10 mx-auto mb-3 text-faint-c" />
      <div class="text-sm text-muted-c mb-1">还没有目标</div>
      <div class="text-[10px] text-faint-c tracking-wider">设定一个攒钱或消除目标，开始你的金钱地图</div>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="goal in goals"
        :key="goal.id"
        class="relative overflow-hidden"
        style="background: var(--bg-surface); border: 1px solid var(--border-soft);"
      >
        <!-- 左侧色条 -->
        <div class="absolute left-0 top-0 bottom-0 w-[3px]" :style="{ background: goal.color }"></div>

        <div class="p-4 pl-5">
          <!-- 头部 -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-start gap-2.5">
              <div class="w-8 h-8 flex items-center justify-center shrink-0" :style="{ background: goal.color + '15', border: `1px solid ${goal.color}30` }">
                <component :is="goal.type === 'saving' ? TrendingUp : TrendingDown" class="w-4 h-4" :style="{ color: goal.color }" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-strong">{{ goal.title }}</span>
                  <span v-if="goal.status === 'done'" class="chip text-[9px] text-positive border-positive-tint bg-positive-tint flex items-center gap-0.5">
                    <Check class="w-2.5 h-2.5" /> 已达成
                  </span>
                  <span :class="['chip text-[9px]', goal.type === 'saving' ? 'text-primary border-primary-tint bg-primary-tint' : 'text-negative border-negative-tint bg-negative-tint']">
                    {{ goal.type === 'saving' ? '积攒' : '消除' }}
                  </span>
                </div>
                <div class="text-[9px] text-faint-c mt-0.5 font-mono-num tracking-wider flex items-center gap-2">
                  <span v-if="goal.deadline"><Calendar class="w-2.5 h-2.5 inline" /> {{ goal.deadline }}</span>
                  <span v-if="goal.deadline && goal.status === 'active'">
                    <span :class="daysLeft(goal.deadline) < 30 ? 'text-negative' : 'text-muted-c'">
                      剩余 {{ daysLeft(goal.deadline) }} 天
                    </span>
                  </span>
                  <span v-if="goal.records.length > 0">{{ goalDays(goal) }} 天历程</span>
                </div>
              </div>
            </div>
            <button @click="delGoal(goal.id)" class="text-faint-c hover:text-negative transition-colors p-1">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- 进度条 -->
          <div class="mb-3">
            <div class="flex items-baseline justify-between mb-1.5">
              <span class="text-xs font-mono-num font-bold" :style="{ color: goal.color }">¥{{ fmtMoney(store.goalCurrentAmount(goal), 0) }}</span>
              <span class="text-[10px] font-mono-num text-faint-c">/ ¥{{ fmtMoney(goal.targetAmount, 0) }}</span>
            </div>
            <div class="h-2.5 w-full" style="background: var(--bg-muted);">
              <div
                class="h-full transition-all duration-500"
                :style="{
                  width: `${(store.goalProgress(goal) * 100).toFixed(1)}%`,
                  background: `linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.18) 100%), ${goal.color}`,
                  borderLeft: '1px solid rgba(255,255,255,0.4)',
                  boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.25), inset -1px 0 0 rgba(0,0,0,0.12)'
                }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-[9px] text-muted-c font-mono-num">{{ (store.goalProgress(goal) * 100).toFixed(1) }}%</span>
              <span v-if="goal.status === 'active' && goal.targetAmount > 0" class="text-[9px] text-faint-c font-mono-num">
                还需 ¥{{ fmtMoney(goal.targetAmount - store.goalCurrentAmount(goal), 0) }}
              </span>
              <span v-else-if="goal.status === 'done'" class="text-[9px] text-positive font-mono-num flex items-center gap-0.5">
                <Trophy class="w-2.5 h-2.5" /> 目标达成！
              </span>
            </div>
          </div>

          <!-- 时间地图 -->
          <div v-if="goal.records.length > 0" class="mb-3">
            <div class="flex items-center gap-1.5 mb-2">
              <MapPin class="w-3 h-3 text-muted-c" />
              <span class="text-[9px] tracking-[0.15em] text-muted-c">时间地图 <span class="text-faint-c">/ Timeline</span></span>
            </div>
            <!-- 路线图 -->
            <div class="relative pt-2 pb-1">
              <!-- 横线 -->
              <div class="absolute top-4 left-3 right-3 h-px" style="background: var(--border-strong);"></div>
              <div class="flex items-start justify-between relative">
                <!-- 起点 -->
                <div class="flex flex-col items-center gap-1 z-10">
                  <div class="w-3 h-3 rounded-full flex items-center justify-center" :style="{ background: goal.color, border: '2px solid var(--bg-surface)' }">
                    <Flag class="w-1.5 h-1.5 text-white" />
                  </div>
                  <span class="text-[8px] text-faint-c font-mono-num">{{ goal.records[0].date.slice(5) }}</span>
                  <span class="text-[7px] text-faint-c">起点</span>
                </div>
                <!-- 中间节点 -->
                <template v-if="goal.records.length > 2">
                  <div v-for="(r, i) in goal.records.slice(1, -1)" :key="i" class="flex flex-col items-center gap-1 z-10">
                    <div class="w-2 h-2 rounded-full" :style="{ background: goal.color, opacity: 0.5 + (0.5 * (i + 1) / goal.records.length), border: '2px solid var(--bg-surface)' }"></div>
                    <span class="text-[8px] text-faint-c font-mono-num">{{ r.date.slice(5) }}</span>
                    <span class="text-[7px] text-muted-c font-mono-num">+¥{{ fmtMoney(r.amount, 0) }}</span>
                  </div>
                </template>
                <!-- 终点 -->
                <div class="flex flex-col items-center gap-1 z-10">
                  <div class="w-3 h-3 rounded-full flex items-center justify-center" :style="{ background: goal.status === 'done' ? 'var(--c-positive)' : 'var(--bg-muted)', border: '2px solid var(--bg-surface)' }">
                    <component :is="goal.status === 'done' ? Trophy : Target" class="w-1.5 h-1.5" :style="{ color: goal.status === 'done' ? '#fff' : 'var(--text-muted)' }" />
                  </div>
                  <span class="text-[8px] text-faint-c font-mono-num">{{ goal.records[goal.records.length - 1].date.slice(5) }}</span>
                  <span class="text-[7px] text-faint-c">{{ goal.status === 'done' ? '终点' : '当前' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 记录列表 -->
          <div v-if="goal.records.length > 0" class="space-y-1 mb-3 max-h-32 overflow-y-auto">
            <div
              v-for="(r, i) in [...goal.records].reverse()"
              :key="i"
              class="flex items-center gap-2 py-1 px-2 text-[10px]"
              style="background: var(--bg-muted);"
            >
              <span class="text-faint-c font-mono-num w-12 shrink-0">{{ r.date.slice(5) }}</span>
              <span class="font-mono-num font-medium" :style="{ color: goal.color }">+¥{{ fmtMoney(r.amount, 0) }}</span>
              <span v-if="r.note" class="text-muted-c truncate flex-1">{{ r.note }}</span>
              <span v-else class="flex-1"></span>
              <button @click="delRecord(goal.id, goal.records.length - 1 - i)" class="text-faint-c hover:text-negative transition-colors opacity-50 hover:opacity-100">
                <X class="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <!-- 添加记录 -->
          <div v-if="goal.status === 'active'" class="flex items-center gap-2 pt-2" style="border-top: 1px solid var(--border-soft);">
            <input
              v-model.number="recordForm[goal.id].amount"
              type="number"
              placeholder="金额"
              class="flex-1 px-2 py-1 text-xs font-mono-num bg-transparent border text-strong"
              style="border-color: var(--border-soft);"
            />
            <input
              v-model="recordForm[goal.id].note"
              type="text"
              placeholder="备注（可选）"
              class="flex-1 px-2 py-1 text-xs bg-transparent border text-base-c"
              style="border-color: var(--border-soft);"
            />
            <button @click="addRecord(goal)" class="metal-btn px-3 py-1 text-xs font-medium" :style="{ '--btn-bg': goal.color }">
              <Plus class="w-3 h-3 inline" /> 记一笔
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建目标弹窗 -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAdd = false">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative card p-6 w-full max-w-md animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-[3px] h-4" style="background: var(--c-primary);"></div>
            <div class="flex flex-col leading-tight">
              <span class="text-sm font-semibold text-strong">新建目标</span>
              <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">New Goal</span>
            </div>
          </div>
          <button @click="showAdd = false" class="text-faint-c hover:text-strong transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-4">
          <!-- 类型 -->
          <div>
            <label class="text-xs text-muted-c mb-2 block">目标类型 <span class="text-faint-c">/ Type</span></label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="addForm.type = 'saving'"
                :class="['flex items-center gap-2 p-2.5 border transition-all', addForm.type === 'saving' ? 'border-primary bg-primary-tint' : 'border-soft']"
                style="border-color: var(--border-soft);"
              >
                <TrendingUp class="w-4 h-4" :class="addForm.type === 'saving' ? 'text-primary' : 'text-muted-c'" />
                <div class="text-left">
                  <div class="text-xs font-medium text-strong">积攒</div>
                  <div class="text-[8px] text-faint-c">Saving</div>
                </div>
              </button>
              <button
                @click="addForm.type = 'debt'"
                :class="['flex items-center gap-2 p-2.5 border transition-all', addForm.type === 'debt' ? 'border-negative bg-negative-tint' : '']"
                style="border-color: var(--border-soft);"
              >
                <TrendingDown class="w-4 h-4" :class="addForm.type === 'debt' ? 'text-negative' : 'text-muted-c'" />
                <div class="text-left">
                  <div class="text-xs font-medium text-strong">消除</div>
                  <div class="text-[8px] text-faint-c">Eliminate</div>
                </div>
              </button>
            </div>
          </div>

          <!-- 名称 -->
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">目标名称 <span class="text-faint-c">/ Title</span></label>
            <input v-model="addForm.title" type="text" placeholder="如：日本旅行基金 / 花呗还款" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
          </div>

          <!-- 金额 -->
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">目标金额 <span class="text-faint-c">/ Target Amount</span></label>
            <input v-model.number="addForm.targetAmount" type="number" placeholder="0" class="w-full px-3 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
          </div>

          <!-- 截止日期 -->
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">目标日期 <span class="text-faint-c">/ Deadline</span></label>
            <input v-model="addForm.deadline" type="date" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
          </div>

          <!-- 颜色 -->
          <div>
            <label class="text-xs text-muted-c mb-2 block">主题色 <span class="text-faint-c">/ Color</span></label>
            <div class="flex gap-2">
              <button
                v-for="c in colors"
                :key="c"
                @click="addForm.color = c"
                :class="['w-7 h-7 transition-all', addForm.color === c ? 'ring-2 ring-offset-2' : '']"
                :style="{ background: c, '--tw-ring-color': c, '--tw-ring-offset-color': 'var(--bg-surface)' }"
              ></button>
            </div>
          </div>

          <button @click="submitAdd" :disabled="!addForm.title.trim() || addForm.targetAmount <= 0" class="metal-btn w-full py-2.5 text-sm font-semibold" :style="{ '--btn-bg': 'var(--c-primary)' }">
            创建目标
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
