<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, X, Check, FileText, Receipt, Plane, HeartPulse, Zap, MoreHorizontal, Send, FolderArchive, ChevronRight } from 'lucide-vue-next'
import { store } from '../store'
import { fmtMoney, curMonth } from '../utils/format'
import { BILL_KIND_PRESETS, BILL_CATEGORIES } from '../types'
import type { ReimbStatus, BillKind } from '../types'

const kindIcon: Record<BillKind, any> = { invoice: FileText, receipt: Receipt, transport: Plane, medical: HeartPulse, utility: Zap, other: MoreHorizontal }
const kindColor = (k: BillKind) => BILL_KIND_PRESETS.find(p => p.kind === k)?.color || '#64748b'
const catColor = (c: string) => BILL_CATEGORIES.find(x => x.name === c)?.color || '#64748b'

const showCreate = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const newTitle = ref('')
const newNote = ref('')
const filterMonth = ref('')

// 可报销且未打包的票据
const availableBills = computed(() =>
  store.state.bills
    .filter(b => b.usage === 'reimbursable' && b.status === 'archived')
    .filter(b => !filterMonth.value || b.date.startsWith(filterMonth.value))
    .sort((a, b) => b.date.localeCompare(a.date))
)

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const selectedTotal = computed(() =>
  Array.from(selectedIds.value).reduce((s, id) => s + (store.state.bills.find(b => b.id === id)?.amount || 0), 0)
)

const createReimb = async () => {
  if (selectedIds.value.size === 0) return
  try {
    await store.addReimbursement({
      title: newTitle.value.trim() || `报销单 ${new Date().toLocaleDateString('zh-CN')}`,
      billIds: Array.from(selectedIds.value),
      note: newNote.value.trim(),
      status: 'draft',
    })
    selectedIds.value = new Set()
    newTitle.value = ''
    newNote.value = ''
    showCreate.value = false
  } catch (err) {
    console.error('[ReimbursementView] 创建报销单失败:', err)
    alert('创建报销单失败，请重试')
  }
}

const statusMeta: Record<ReimbStatus, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'text-muted-c border-soft bg-muted-c' },
  submitted: { label: '已提交', cls: 'text-accent border-accent-tint bg-accent-tint' },
  approved: { label: '已审批', cls: 'text-primary border-primary-tint bg-primary-tint' },
  paid: { label: '已打款', cls: 'text-positive border-positive-tint bg-positive-tint' },
  rejected: { label: '已驳回', cls: 'text-negative border-danger-tint bg-negative-tint' },
}

const expandedId = ref<string | null>(null)
const billsOf = (ids: string[]) => ids.map(id => store.state.bills.find(b => b.id === id)).filter(Boolean)

const submitReimb = async (id: string) => {
  try { await store.updateReimbursement(id, { status: 'submitted' }) }
  catch (err) { console.error('[ReimbursementView] 提交报销失败:', err); alert('提交失败，请重试') }
}
const markPaid = async (id: string) => {
  try { await store.updateReimbursement(id, { status: 'paid' }) }
  catch (err) { console.error('[ReimbursementView] 标记已打款失败:', err); alert('操作失败，请重试') }
}
const deleteReimb = async (id: string) => {
  if (!confirm('删除该报销单？票据将回到可报销状态')) return
  try { await store.deleteReimbursement(id) }
  catch (err) { console.error('[ReimbursementView] 删除报销单失败:', err); alert('删除失败，请重试') }
}
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <!-- 顶部统计 + 新建 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card card-glow p-5 md:col-span-2 flex items-center justify-between">
        <div>
          <div class="text-xs text-muted-c uppercase tracking-wider mb-1">可报销票据池</div>
          <div class="text-2xl font-bold text-primary font-mono">{{ availableBills.length }}<span class="text-sm text-muted-c ml-1">张待打包</span></div>
        </div>
        <button @click="showCreate = true; selectedIds = new Set()" class="btn btn-primary">
          <Plus class="w-4 h-4" /> 新建报销单
        </button>
      </div>
      <div class="card p-5">
        <div class="text-xs text-muted-c uppercase tracking-wider mb-1">报销单总数</div>
        <div class="text-2xl font-bold text-strong font-mono">{{ store.state.reimbursements.length }}<span class="text-sm text-muted-c ml-1">个</span></div>
      </div>
    </div>

    <!-- 报销单列表 -->
    <div class="card p-5">
      <div class="section-title mb-4">我的报销单</div>
      <div v-if="store.state.reimbursements.length === 0" class="py-12 text-center">
        <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-muted-c flex items-center justify-center">
          <FolderArchive class="w-7 h-7 text-faint-c" />
        </div>
        <p class="text-faint-c text-sm mb-4">还没有报销单，从可报销票据池创建一个吧</p>
        <button @click="showCreate = true" class="btn btn-primary mx-auto"><Plus class="w-4 h-4" /> 新建报销单</button>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="r in store.state.reimbursements"
          :key="r.id"
          class="rounded-2xl border border-soft bg-muted-c overflow-hidden"
        >
          <!-- 报销单头 -->
          <div class="flex items-center gap-4 p-4">
            <div class="w-11 h-11 rounded-xl bg-primary-tint border border-primary-tint flex items-center justify-center shrink-0">
              <FolderArchive class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-strong">{{ r.title }}</span>
                <span :class="['chip text-[10px]', statusMeta[r.status].cls]">{{ statusMeta[r.status].label }}</span>
              </div>
              <div class="text-xs text-faint-c mt-0.5">{{ r.billIds.length }} 张票据 · {{ r.submitDate || '未提交' }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-mono font-bold text-primary">¥{{ fmtMoney(r.totalAmount, 2) }}</div>
            </div>
            <button @click="expandedId = expandedId === r.id ? null : r.id" class="p-2 rounded-lg text-muted-c hover:bg-muted-c transition-all">
              <ChevronRight :class="['w-4 h-4 transition-transform', expandedId === r.id ? 'rotate-90' : '']" />
            </button>
          </div>

          <!-- 展开详情 -->
          <div v-if="expandedId === r.id" class="border-t border-soft p-4 space-y-2">
            <div v-for="bill in billsOf(r.billIds)" :key="bill!.id" class="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted-c">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :style="{ background: kindColor(bill!.kind) + '15', border: `1px solid ${kindColor(bill!.kind)}30` }">
                <component :is="kindIcon[bill!.kind] || MoreHorizontal" class="w-4 h-4" :style="{ color: kindColor(bill!.kind) }" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-base-c truncate">{{ bill!.merchant }}</div>
                <div class="text-[10px] text-faint-c">{{ bill!.category }} · {{ bill!.date }}</div>
              </div>
              <span class="text-sm font-mono text-base-c">¥{{ fmtMoney(bill!.amount, 2) }}</span>
            </div>

            <div v-if="r.note" class="text-xs text-muted-c px-2 pt-2">备注：{{ r.note }}</div>

            <!-- 操作按钮 -->
            <div class="flex gap-2 pt-3 border-t border-soft">
              <button v-if="r.status === 'draft'" @click="submitReimb(r.id)" class="btn btn-primary text-xs py-2 flex-1"><Send class="w-3.5 h-3.5" /> 提交报销</button>
              <button v-if="r.status === 'submitted'" @click="markPaid(r.id)" class="btn btn-primary text-xs py-2 flex-1"><Check class="w-3.5 h-3.5" /> 标记已打款</button>
              <button @click="deleteReimb(r.id)" class="btn btn-ghost text-xs py-2 text-negative hover:bg-negative-tint"><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建报销单：勾选票据 -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCreate = false">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <div class="section-title">新建报销单 · 勾选票据</div>
          <button @click="showCreate = false" class="p-1.5 rounded-lg text-muted-c hover:bg-muted-c"><X class="w-5 h-5" /></button>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">报销事由</label>
            <input v-model="newTitle" type="text" placeholder="如：8月差旅报销" class="input" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">筛选月份</label>
            <input v-model="filterMonth" type="month" class="input" />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 mb-4">
          <div v-if="availableBills.length === 0" class="text-center py-8 text-faint-c text-sm">暂无可报销票据</div>
          <div
            v-for="bill in availableBills"
            :key="bill.id"
            @click="toggleSelect(bill.id)"
            :class="[
              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
              selectedIds.has(bill.id) ? 'border-primary-tint bg-primary-tint' : 'border-soft bg-muted-c hover:border-soft'
            ]"
          >
            <div :class="['w-5 h-5 rounded-md border flex items-center justify-center shrink-0', selectedIds.has(bill.id) ? 'bg-primary border-primary' : 'border-soft']">
              <Check v-if="selectedIds.has(bill.id)" class="w-3 h-3 text-ink-950" />
            </div>
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :style="{ background: kindColor(bill.kind) + '15', border: `1px solid ${kindColor(bill.kind)}30` }">
              <component :is="kindIcon[bill.kind] || MoreHorizontal" class="w-4 h-4" :style="{ color: kindColor(bill.kind) }" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-base-c truncate">{{ bill.merchant }}</div>
              <div class="text-[10px] text-faint-c">{{ bill.category }} · {{ bill.date }}<span v-if="bill.invoiceNumber"> · {{ bill.invoiceNumber.slice(-6) }}</span></div>
            </div>
            <span class="text-sm font-mono text-base-c">¥{{ fmtMoney(bill.amount, 2) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-soft">
          <div class="text-sm">
            <span class="text-muted-c">已选 {{ selectedIds.size }} 张 · 合计 </span>
            <span class="text-primary font-mono font-bold">¥{{ fmtMoney(selectedTotal, 2) }}</span>
          </div>
          <div class="flex gap-2">
            <button @click="showCreate = false" class="btn btn-ghost">取消</button>
            <button @click="createReimb" :disabled="selectedIds.size === 0" class="btn btn-primary" :class="{ 'opacity-50 cursor-not-allowed': selectedIds.size === 0 }">创建报销单</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
