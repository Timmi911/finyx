<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Trash2, FileText, Receipt, Plane, HeartPulse, Zap, MoreHorizontal, Image as ImageIcon, Check, X, Filter, Pencil, Upload, Save } from 'lucide-vue-next'
import { store } from '../store'
import { fmtMoney } from '../utils/format'
import { BILL_KIND_PRESETS, BILL_CATEGORIES, INVOICE_TYPE_PRESETS } from '../types'
import type { Bill, BillKind, BillStatus, BillUsage, InvoiceType } from '../types'

const kindIcon: Record<BillKind, any> = { invoice: FileText, receipt: Receipt, transport: Plane, medical: HeartPulse, utility: Zap, other: MoreHorizontal }

const viewMode = ref<'grid' | 'list'>('grid')
const filterKind = ref<BillKind | 'all'>('all')
const filterUsage = ref<BillUsage | 'all'>('all')
const filterStatus = ref<BillStatus | 'all'>('all')
const filterMonth = ref('')
const searchQuery = ref('')
const selectedIds = ref<Set<string>>(new Set())
const selectMode = ref(false)

const filtered = computed(() => {
  let list = [...store.state.bills]
  if (filterKind.value !== 'all') list = list.filter(b => b.kind === filterKind.value)
  if (filterUsage.value !== 'all') list = list.filter(b => b.usage === filterUsage.value)
  if (filterStatus.value !== 'all') list = list.filter(b => b.status === filterStatus.value)
  if (filterMonth.value) list = list.filter(b => b.date.startsWith(filterMonth.value))
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(b => b.merchant.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.invoiceNumber.includes(q) || b.note.toLowerCase().includes(q))
  }
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
})

const kindLabel = (k: BillKind) => BILL_KIND_PRESETS.find(p => p.kind === k)?.label || '其他'
const kindColor = (k: BillKind) => BILL_KIND_PRESETS.find(p => p.kind === k)?.color || '#64748b'
const invoiceTypeLabel = (t: string) => INVOICE_TYPE_PRESETS.find(p => p.value === t)?.label || ''
const catColor = (c: string) => BILL_CATEGORIES.find(x => x.name === c)?.color || '#64748b'

const statusMeta: Record<BillStatus, { label: string; cls: string }> = {
  archived: { label: '已归档', cls: 'text-muted-c border-soft bg-muted-c' },
  pending: { label: '待报销', cls: 'text-accent border-accent-tint bg-accent-tint' },
  reimbursed: { label: '已报销', cls: 'text-positive border-positive-tint bg-positive-tint' },
  void: { label: '已作废', cls: 'text-faint-c border-soft bg-muted-c line-through' },
}

const usageMeta: Record<BillUsage, { label: string; cls: string }> = {
  personal: { label: '个人', cls: 'text-muted-c' },
  reimbursable: { label: '可报销', cls: 'text-primary' },
}

// ===== 状态渲染诊断日志 =====
// bills/筛选任意变化时打印 status 分布，便于排查运行时数据与枚举不一致
watch(filtered, (list) => {
  const dist = (arr: Bill[]) => {
    const m: Record<string, number> = {}
    for (const b of arr) m[b.status] = (m[b.status] || 0) + 1
    return m
  }
  console.log('[BillsView] 渲染数据', {
    全部: store.state.bills.length,
    全部status分布: dist(store.state.bills),
    过滤后: list.length,
    过滤后status分布: dist(list),
    筛选: { status: filterStatus.value, usage: filterUsage.value, kind: filterKind.value, month: filterMonth.value },
  })
})

// 状态元数据查询：渲染时调用，遇未知 status 打印警告（捕捉 status 与枚举不一致）
const STATUS_FALLBACK = { label: '未知', cls: 'text-muted-c border-soft bg-muted-c' }
const statusMetaOf = (bill?: Bill): { label: string; cls: string } => {
  if (!bill) {
    console.warn('[BillsView] statusMetaOf 收到空 bill')
    return STATUS_FALLBACK
  }
  const meta = statusMeta[bill.status]
  if (!meta) {
    console.warn('[BillsView] 未知 status:', JSON.stringify(bill.status), 'billId=', bill.id, 'merchant=', bill.merchant)
    return STATUS_FALLBACK
  }
  return meta
}

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const exitSelect = () => { selectMode.value = false; selectedIds.value = new Set() }

const batchDelete = async () => {
  if (selectedIds.value.size === 0) return
  if (confirm(`确认删除选中的 ${selectedIds.value.size} 张票据？`)) {
    const ids = Array.from(selectedIds.value)
    let failed = 0
    for (const id of ids) {
      try {
        await store.deleteBill(id)
      } catch (err: any) {
        failed++
        console.error('删除失败:', id, err)
      }
    }
    if (failed > 0) alert(`${ids.length - failed} 张删除成功，${failed} 张失败`)
    exitSelect()
  }
}

const deleteBill = async (id: string, e: Event) => {
  e.stopPropagation()
  if (!confirm('确认删除该票据？')) return
  try {
    await store.deleteBill(id)
  } catch (err: any) {
    alert(`删除失败：${err?.message || '请稍后重试'}`)
  }
}

const previewBill = ref<string | null>(null)
const previewData = computed(() => store.state.bills.find(b => b.id === previewBill.value))

// ===== 编辑模式 =====
const editMode = ref(false)
const editForm = ref<Partial<Bill>>({})
const editImageInput = ref<HTMLInputElement | null>(null)

const startEdit = () => {
  if (!previewData.value) return
  // 浅拷贝当前票据数据进编辑表单
  const b = previewData.value
  editForm.value = {
    kind: b.kind,
    invoiceType: b.invoiceType,
    merchant: b.merchant,
    amount: b.amount,
    taxAmount: b.taxAmount,
    invoiceNumber: b.invoiceNumber,
    date: b.date,
    category: b.category,
    usage: b.usage,
    status: b.status,
    note: b.note,
    imageUrl: b.imageUrl,
  }
  editMode.value = true
}

const cancelEdit = () => {
  editMode.value = false
  editForm.value = {}
}

const saveEdit = async () => {
  if (!previewBill.value) return
  const f = editForm.value
  // 金额校验
  const amt = parseFloat(String(f.amount ?? 0))
  if (amt <= 0) {
    alert('金额必须大于 0')
    return
  }
  // 发票类型：非发票清空
  const patch: Partial<Bill> = {
    kind: f.kind,
    invoiceType: f.kind === 'invoice' ? (f.invoiceType || 'general') : '',
    merchant: (f.merchant || '').trim(),
    amount: amt,
    taxAmount: f.kind === 'invoice' ? (parseFloat(String(f.taxAmount ?? 0)) || 0) : 0,
    invoiceNumber: f.kind === 'invoice' ? (f.invoiceNumber || '').trim() : '',
    date: f.date || new Date().toISOString().slice(0, 10),
    category: f.category || '其他',
    usage: f.usage,
    status: f.status,
    note: (f.note || '').trim(),
    imageUrl: f.imageUrl || '',
  }
  try {
    await store.updateBill(previewBill.value, patch)
    editMode.value = false
    editForm.value = {}
  } catch (err: any) {
    alert(`保存失败：${err?.message || '请稍后重试'}`)
  }
}

const onEditImagePicked = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    editForm.value.imageUrl = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const removeEditImage = () => {
  editForm.value.imageUrl = ''
}

const closePreview = () => {
  previewBill.value = null
  editMode.value = false
  editForm.value = {}
}
</script>

<template>
  <div class="space-y-5 max-w-6xl mx-auto">
    <!-- 工具栏 -->
    <div class="card p-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[180px]">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint-c" />
          <input v-model="searchQuery" type="text" placeholder="搜索开票方/分类/发票号/备注..." class="input pl-9" />
        </div>
        <input v-model="filterMonth" type="month" class="input w-auto" />
        <select v-model="filterKind" class="input w-auto">
          <option value="all">全部类型</option>
          <option v-for="p in BILL_KIND_PRESETS" :key="p.kind" :value="p.kind">{{ p.label }}</option>
        </select>
        <select v-model="filterUsage" class="input w-auto">
          <option value="all">全部用途</option>
          <option value="personal">个人消费</option>
          <option value="reimbursable">可报销</option>
        </select>
        <select v-model="filterStatus" class="input w-auto">
          <option value="all">全部状态</option>
          <option value="archived">已归档</option>
          <option value="pending">待报销</option>
          <option value="reimbursed">已报销</option>
          <option value="void">已作废</option>
        </select>
        <div class="flex items-center gap-0.5 bg-muted-c rounded-lg p-0.5 border border-soft">
          <button @click="viewMode = 'grid'" :class="['p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-primary-tint text-primary' : 'text-muted-c hover:text-base-c']">
            <Filter class="w-4 h-4" />
          </button>
          <button @click="viewMode = 'list'" :class="['p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-primary-tint text-primary' : 'text-muted-c hover:text-base-c']">
            <Receipt class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 选择操作栏 -->
      <div class="flex items-center justify-between mt-3 pt-3 border-t border-soft">
        <div class="flex items-center gap-3">
          <button v-if="!selectMode" @click="selectMode = true" class="text-xs text-muted-c hover:text-primary transition-colors">批量管理</button>
          <template v-else>
            <span class="text-xs text-muted-c">已选 {{ selectedIds.size }} 项</span>
            <button @click="batchDelete" :disabled="selectedIds.size === 0" class="text-xs text-negative hover:text-negative-300 disabled:opacity-30">删除</button>
            <button @click="exitSelect" class="text-xs text-muted-c hover:text-base-c">取消</button>
          </template>
        </div>
        <span class="text-xs text-faint-c font-mono">共 {{ filtered.length }} 张</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filtered.length === 0" class="card p-16 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted-c flex items-center justify-center">
        <Receipt class="w-8 h-8 text-faint-c" />
      </div>
      <p class="text-faint-c text-sm">未找到匹配的票据，去"归集"添加吧</p>
    </div>

    <!-- 网格视图 -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="bill in filtered"
        :key="bill.id"
        @click="selectMode ? toggleSelect(bill.id) : previewBill = bill.id"
        :class="[
          'card p-4 cursor-pointer transition-all relative group',
          selectMode && selectedIds.has(bill.id) ? 'border-primary-tint bg-primary-tint' : 'hover:border-soft'
        ]"
      >
        <!-- 选择框 -->
        <div v-if="selectMode" :class="['absolute top-3 right-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all', selectedIds.has(bill.id) ? 'bg-primary border-primary' : 'border-soft']">
          <Check v-if="selectedIds.has(bill.id)" class="w-3 h-3 text-ink-950" />
        </div>

        <!-- 图标区 -->
        <div class="flex items-start gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :style="{ background: kindColor(bill.kind) + '15', border: `1px solid ${kindColor(bill.kind)}30` }">
            <component :is="kindIcon[bill.kind] || MoreHorizontal" class="w-5 h-5" :style="{ color: kindColor(bill.kind) }" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-strong truncate">{{ bill.merchant || '未填写' }}</div>
            <div class="text-[10px] text-faint-c mt-0.5">{{ kindLabel(bill.kind) }}<span v-if="bill.invoiceType"> · {{ invoiceTypeLabel(bill.invoiceType) }}</span></div>
          </div>
        </div>

        <!-- 金额 -->
        <div class="text-lg font-mono font-bold text-strong mb-2">¥{{ fmtMoney(bill.amount, 2) }}</div>

        <!-- 标签 -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border" :style="{ color: catColor(bill.category), borderColor: catColor(bill.category) + '30', background: catColor(bill.category) + '10' }">
            {{ bill.category }}
          </span>
          <span :class="['text-[10px]', usageMeta[bill.usage].cls]">{{ usageMeta[bill.usage].label }}</span>
          <span :class="['chip text-[10px]', statusMetaOf(bill).cls]">{{ statusMetaOf(bill).label }}</span>
        </div>

        <div class="text-[10px] text-faint-c mt-2 font-mono">{{ bill.date }}</div>

        <!-- 悬浮删除 -->
        <button v-if="!selectMode" @click="deleteBill(bill.id, $event)" class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-negative-tint text-faint-c hover:text-negative transition-all">
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="card p-2">
      <div
        v-for="bill in filtered"
        :key="bill.id"
        @click="selectMode ? toggleSelect(bill.id) : previewBill = bill.id"
        :class="[
          'flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer transition-all group',
          selectMode && selectedIds.has(bill.id) ? 'bg-primary-tint' : 'hover:bg-muted-c'
        ]"
      >
        <div v-if="selectMode" :class="['w-5 h-5 rounded-md border flex items-center justify-center shrink-0', selectedIds.has(bill.id) ? 'bg-primary border-primary' : 'border-soft']">
          <Check v-if="selectedIds.has(bill.id)" class="w-3 h-3 text-ink-950" />
        </div>
        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: kindColor(bill.kind) + '15', border: `1px solid ${kindColor(bill.kind)}30` }">
          <component :is="kindIcon[bill.kind] || MoreHorizontal" class="w-4 h-4" :style="{ color: kindColor(bill.kind) }" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-strong truncate">{{ bill.merchant || '未填写' }}</span>
            <span class="chip text-[10px]" :style="{ color: catColor(bill.category), borderColor: catColor(bill.category) + '30', background: catColor(bill.category) + '10' }">{{ bill.category }}</span>
            <span :class="['chip text-[10px]', statusMetaOf(bill).cls]">{{ statusMetaOf(bill).label }}</span>
          </div>
          <div class="text-[11px] text-faint-c mt-0.5">{{ kindLabel(bill.kind) }}<span v-if="bill.invoiceType"> · {{ invoiceTypeLabel(bill.invoiceType) }}</span> · {{ bill.date }}<span v-if="bill.invoiceNumber"> · {{ bill.invoiceNumber }}</span></div>
        </div>
        <span class="text-sm font-mono text-base-c">¥{{ fmtMoney(bill.amount, 2) }}</span>
        <button v-if="!selectMode" @click="deleteBill(bill.id, $event)" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-negative-tint text-faint-c hover:text-negative transition-all">
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 票据预览弹窗 -->
    <div v-if="previewData" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closePreview">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <input ref="editImageInput" type="file" accept="image/*" class="hidden" @change="onEditImagePicked" />

        <!-- 顶栏：图标 + 标题 + 操作按钮 -->
        <div class="flex items-start gap-4 mb-5">
          <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" :style="{ background: kindColor((editMode ? editForm.kind : previewData.kind)!) + '15', border: `1px solid ${kindColor((editMode ? editForm.kind : previewData.kind)!)}30` }">
            <component :is="kindIcon[(editMode ? editForm.kind : previewData.kind)!] || MoreHorizontal" class="w-7 h-7" :style="{ color: kindColor((editMode ? editForm.kind : previewData.kind)!) }" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-lg font-semibold text-strong">{{ previewData.merchant || '未填写' }}</div>
            <div class="text-xs text-muted-c mt-1">{{ kindLabel(previewData.kind) }}<span v-if="previewData.invoiceType"> · {{ invoiceTypeLabel(previewData.invoiceType) }}</span></div>
          </div>
          <!-- 操作按钮组 -->
          <div class="flex items-center gap-1">
            <button v-if="!editMode" @click="startEdit" class="p-1.5 rounded-lg text-muted-c hover:bg-muted-c hover:text-primary transition-all" title="编辑">
              <Pencil class="w-4 h-4" />
            </button>
            <button @click="closePreview" class="p-1.5 rounded-lg text-muted-c hover:bg-muted-c"><X class="w-5 h-5" /></button>
          </div>
        </div>

        <!-- ===== 查看模式 ===== -->
        <template v-if="!editMode">
          <div class="text-center py-4 mb-4 rounded-xl bg-muted-c border border-soft">
            <div class="text-xs text-muted-c mb-1">价税合计</div>
            <div class="text-3xl font-bold text-primary font-mono">¥{{ fmtMoney(previewData.amount, 2) }}</div>
            <div v-if="previewData.taxAmount > 0" class="text-xs text-muted-c mt-1">其中税额 ¥{{ fmtMoney(previewData.taxAmount, 2) }}</div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="p-3 rounded-lg bg-muted-c"><div class="text-[10px] text-faint-c mb-1">日期</div><div class="text-base-c font-mono">{{ previewData.date }}</div></div>
            <div class="p-3 rounded-lg bg-muted-c"><div class="text-[10px] text-faint-c mb-1">分类</div><div class="text-base-c">{{ previewData.category }}</div></div>
            <div class="p-3 rounded-lg bg-muted-c"><div class="text-[10px] text-faint-c mb-1">用途</div><div :class="usageMeta[previewData.usage].cls">{{ usageMeta[previewData.usage].label }}</div></div>
            <div class="p-3 rounded-lg bg-muted-c"><div class="text-[10px] text-faint-c mb-1">状态</div><div :class="statusMetaOf(previewData).cls">{{ statusMetaOf(previewData).label }}</div></div>
            <div v-if="previewData.invoiceNumber" class="p-3 rounded-lg bg-muted-c col-span-2"><div class="text-[10px] text-faint-c mb-1">发票号码</div><div class="text-base-c font-mono text-xs">{{ previewData.invoiceNumber }}</div></div>
            <div v-if="previewData.note" class="p-3 rounded-lg bg-muted-c col-span-2"><div class="text-[10px] text-faint-c mb-1">备注</div><div class="text-base-c text-xs">{{ previewData.note }}</div></div>
          </div>

          <div v-if="previewData.imageUrl" class="mt-4 rounded-xl overflow-hidden border border-soft">
            <img :src="previewData.imageUrl" class="w-full" />
          </div>
          <div v-else class="mt-4 p-8 rounded-xl border border-dashed border-soft flex flex-col items-center gap-2 text-faint-c">
            <ImageIcon class="w-8 h-8" />
            <span class="text-xs">未上传票据图片</span>
          </div>
        </template>

        <!-- ===== 编辑模式 ===== -->
        <template v-else>
          <!-- 票据类型 -->
          <div class="mb-4">
            <label class="text-xs text-muted-c mb-2 block">票据类型</label>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
              <button
                v-for="p in BILL_KIND_PRESETS"
                :key="p.kind"
                @click="editForm.kind = p.kind; editForm.invoiceType = p.kind === 'invoice' ? (editForm.invoiceType || 'general') : ''"
                :class="['p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1', editForm.kind === p.kind ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c hover:text-base-c']"
              >
                <component :is="kindIcon[p.kind] || MoreHorizontal" class="w-5 h-5" />
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- 发票类型 -->
          <div v-if="editForm.kind === 'invoice'" class="mb-4">
            <label class="text-xs text-muted-c mb-2 block">发票类型</label>
            <div class="flex gap-2">
              <button
                v-for="p in INVOICE_TYPE_PRESETS"
                :key="p.value"
                @click="editForm.invoiceType = p.value"
                :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', editForm.invoiceType === p.value ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']"
              >{{ p.label }}</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">开票方 / 商户</label>
              <input v-model="editForm.merchant" type="text" placeholder="如：京东信息技术有限公司" class="input" />
            </div>
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">日期</label>
              <input v-model="editForm.date" type="date" class="input" />
            </div>
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">金额（价税合计）</label>
              <input v-model="editForm.amount" type="number" min="0" step="0.01" placeholder="0.00" class="input font-mono" />
            </div>
            <div v-if="editForm.kind === 'invoice'">
              <label class="text-xs text-muted-c mb-1.5 block">税额</label>
              <input v-model="editForm.taxAmount" type="number" min="0" step="0.01" placeholder="0.00" class="input font-mono" />
            </div>
            <div v-if="editForm.kind === 'invoice'" class="md:col-span-2">
              <label class="text-xs text-muted-c mb-1.5 block">发票号码</label>
              <input v-model="editForm.invoiceNumber" type="text" placeholder="发票号码" class="input font-mono" />
            </div>
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">用途分类</label>
              <select v-model="editForm.category" class="input">
                <option v-for="c in BILL_CATEGORIES" :key="c.name" :value="c.name">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">用途</label>
              <div class="flex gap-2">
                <button @click="editForm.usage = 'personal'" :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', editForm.usage === 'personal' ? 'bg-muted-c border-soft text-strong' : 'bg-muted-c border-soft text-muted-c']">个人消费</button>
                <button @click="editForm.usage = 'reimbursable'" :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', editForm.usage === 'reimbursable' ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']">可报销</button>
              </div>
            </div>
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">状态</label>
              <select v-model="editForm.status" class="input">
                <option value="archived">已归档</option>
                <option value="pending">待报销</option>
                <option value="reimbursed">已报销</option>
                <option value="void">已作废</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-muted-c mb-1.5 block">备注</label>
              <input v-model="editForm.note" type="text" placeholder="选填" class="input" />
            </div>
          </div>

          <!-- 图片上传/替换 -->
          <div class="mb-5">
            <label class="text-xs text-muted-c mb-2 block">票据图片</label>
            <div v-if="editForm.imageUrl" class="relative rounded-xl overflow-hidden border border-soft">
              <img :src="editForm.imageUrl" class="w-full max-h-48 object-contain" />
              <div class="absolute top-2 right-2 flex gap-1">
                <button @click="editImageInput?.click()" class="p-1.5 rounded-lg bg-ink-950/60 text-white hover:bg-ink-950/80 backdrop-blur-sm" title="替换图片">
                  <Upload class="w-3.5 h-3.5" />
                </button>
                <button @click="removeEditImage" class="p-1.5 rounded-lg bg-ink-950/60 text-white hover:bg-negative/80 backdrop-blur-sm" title="删除图片">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button v-else @click="editImageInput?.click()" class="w-full p-6 rounded-xl border border-dashed border-soft flex flex-col items-center gap-2 text-faint-c hover:text-primary hover:border-primary-tint transition-all">
              <Upload class="w-6 h-6" />
              <span class="text-xs">上传票据图片</span>
            </button>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3">
            <button @click="cancelEdit" class="btn btn-ghost flex-1">取消</button>
            <button @click="saveEdit" class="btn btn-primary flex-1">
              <Save class="w-4 h-4" /> 保存修改
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
