<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Camera, ScanLine, FileUp, FileText, Receipt, Plane, HeartPulse, Zap, MoreHorizontal, X, Sparkles, Loader2, Check, FileInput } from 'lucide-vue-next'
import { store } from '../store'
import { BILL_KIND_PRESETS, BILL_CATEGORIES, INVOICE_TYPE_PRESETS } from '../types'
import type { BillKind, BillSource, BillUsage, InvoiceType } from '../types'
import { useRouter } from 'vue-router'

const router = useRouter()
const kindIcon: Record<BillKind, any> = { invoice: FileText, receipt: Receipt, transport: Plane, medical: HeartPulse, utility: Zap, other: MoreHorizontal }

type Mode = 'menu' | 'form' | 'ocr' | 'import'
const mode = ref<Mode>('menu')

const fileInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

const form = ref({
  kind: 'invoice' as BillKind,
  invoiceType: 'general' as InvoiceType,
  merchant: '',
  amount: '' as string | number,
  taxAmount: '' as string | number,
  invoiceNumber: '',
  date: new Date().toISOString().slice(0, 10),
  category: '餐饮',
  usage: 'personal' as BillUsage,
  note: '',
  imageUrl: '',
  source: 'manual' as BillSource,
})

const ocrLoading = ref(false)
const ocrProgress = ref(0)
const ocrStatus = ref('')
const ocrError = ref('')

const isInvoice = computed(() => form.value.kind === 'invoice')

const resetForm = () => {
  form.value = {
    kind: 'invoice', invoiceType: 'general', merchant: '', amount: '', taxAmount: '',
    invoiceNumber: '', date: new Date().toISOString().slice(0, 10), category: '餐饮',
    usage: 'personal', note: '', imageUrl: '', source: 'manual',
  }
}

const startUpload = (source: BillSource) => {
  form.value.source = source
  fileInput.value?.click()
}

const onFilePicked = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.value.imageUrl = reader.result as string
    mode.value = 'form'
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const runOcr = async () => {
  if (!form.value.imageUrl) return
  ocrLoading.value = true
  ocrProgress.value = 0
  ocrStatus.value = '准备识别...'
  ocrError.value = ''
  mode.value = 'ocr'

  try {
    const { recognizeBill } = await import('../utils/ocr')
    const result = await recognizeBill(form.value.imageUrl, (p, status) => {
      ocrProgress.value = p
      ocrStatus.value = status
    })

    // 填充识别出的字段（仅覆盖非空结果，保留用户已填的）
    if (result.merchant) form.value.merchant = result.merchant
    if (result.amount > 0) form.value.amount = result.amount
    if (result.taxAmount > 0) form.value.taxAmount = result.taxAmount
    if (result.invoiceNumber) form.value.invoiceNumber = result.invoiceNumber
    if (result.date) form.value.date = result.date
    if (result.kind) form.value.kind = result.kind
    if (result.category) form.value.category = result.category
    form.value.invoiceType = result.kind === 'invoice' ? (form.value.invoiceType || 'general') : ''
    form.value.source = 'ocr'

    // 识别准确率提示
    if (result.confidence < 60) {
      ocrError.value = `识别准确率较低（${Math.round(result.confidence)}%），请核对字段`
    }
  } catch (err: any) {
    console.error('OCR failed', err)
    ocrError.value = `识别失败：${err?.message || '请检查图片清晰度后重试'}`
  } finally {
    ocrLoading.value = false
    mode.value = 'form'
  }
}

const submit = async () => {
  const amt = parseFloat(String(form.value.amount)) || 0
  if (amt <= 0) return
  try {
    await store.addBill({
      kind: form.value.kind,
      invoiceType: isInvoice.value ? form.value.invoiceType : '',
      merchant: form.value.merchant.trim(),
      amount: amt,
      taxAmount: parseFloat(String(form.value.taxAmount)) || 0,
      invoiceNumber: form.value.invoiceNumber.trim(),
      date: form.value.date,
      category: form.value.category,
      usage: form.value.usage,
      note: form.value.note.trim(),
      imageUrl: form.value.imageUrl,
      source: form.value.source,
    })
    resetForm()
    mode.value = 'menu'
    router.push('/bills')
  } catch (err: any) {
    alert(`保存失败：${err?.message || '请稍后重试'}`)
  }
}

// 导入电子发票包（模拟解析 JSON）
const onImportPicked = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result as string)
      const list = Array.isArray(data) ? data : [data]
      let count = 0
      for (const d of list) {
        if (d && typeof d === 'object') {
          try {
            await store.addBill({
              kind: d.kind || 'invoice',
              invoiceType: d.invoiceType || 'general',
              merchant: d.merchant || '导入票据',
              amount: Number(d.amount) || 0,
              taxAmount: Number(d.taxAmount) || 0,
              invoiceNumber: d.invoiceNumber || '',
              date: d.date || new Date().toISOString().slice(0, 10),
              category: d.category || '其他',
              usage: d.usage || 'personal',
              note: d.note || '从发票包导入',
              source: 'import',
            })
            count++
          } catch (err: any) {
            console.error('导入单张票据失败:', err)
          }
        }
      }
      input.value = ''
      if (count > 0) {
        alert(`成功导入 ${count} 张票据`)
        router.push('/bills')
      } else {
        alert('未识别到有效票据数据，请上传 JSON 格式的发票包')
      }
    } catch {
      // 非 JSON 时模拟导入示例
      for (let i = 0; i < 3; i++) {
        try {
          await store.addBill({
            kind: 'invoice', invoiceType: 'general',
            merchant: ['美团点评', '滴滴出行', '京东自营'][i],
            amount: [58.5, 32.0, 199.0][i],
            taxAmount: 3.32, invoiceNumber: Math.random().toString().slice(2, 14),
            date: new Date().toISOString().slice(0, 10),
            category: ['餐饮', '交通', '购物'][i], usage: 'reimbursable',
            note: '从发票包导入', source: 'import',
          })
        } catch (err: any) {
          console.error('模拟导入失败:', err)
        }
      }
      input.value = ''
      alert('已模拟导入 3 张示例票据')
      router.push('/bills')
    }
  }
  reader.readAsText(file)
}

const downloadSample = () => {
  const sample = [
    { kind: 'invoice', invoiceType: 'general', merchant: '示例科技有限公司', amount: 580.00, taxAmount: 32.83, invoiceNumber: '24400213456789012', date: '2026-08-01', category: '办公', usage: 'reimbursable', note: '办公用品采购' },
    { kind: 'transport', merchant: '中国铁路12306', amount: 553.00, date: '2026-08-05', category: '差旅', usage: 'reimbursable', note: '出差高铁' },
  ]
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '发票包示例.json'
  a.click()
  URL.revokeObjectURL(url)
}

const entryOptions = [
  { source: 'upload' as BillSource, icon: Upload, label: '上传图片', desc: '选择发票/小票照片', color: '#22d3ee' },
  { source: 'ocr' as BillSource, icon: ScanLine, label: '拍照识别', desc: 'OCR 智能提取信息', color: '#a78bfa' },
  { source: 'manual' as BillSource, icon: FileText, label: '手动录入', desc: '逐项填写票据信息', color: '#34d399' },
  { source: 'import' as BillSource, icon: FileUp, label: '导入发票包', desc: '批量导入 JSON 文件', color: '#fbbf24' },
]
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFilePicked" />
    <input ref="importInput" type="file" accept=".json,.xml" class="hidden" @change="onImportPicked" />

    <!-- 选择录入方式 -->
    <template v-if="mode === 'menu'">
      <div class="card card-glow p-6">
        <div class="text-center mb-6">
          <h2 class="text-xl font-bold text-strong mb-2">票据归集</h2>
          <p class="text-sm text-muted-c">把生活中零散的电子票据统一收纳到此处</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="opt in entryOptions"
            :key="opt.source"
            @click="opt.source === 'import' ? importInput?.click() : opt.source === 'manual' ? (mode = 'form', form.source = 'manual') : startUpload(opt.source)"
            class="group flex items-center gap-4 p-5 rounded-2xl border border-soft bg-muted-c hover:bg-muted-c hover:border-soft transition-all text-left"
          >
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" :style="{ background: opt.color + '15', border: `1px solid ${opt.color}30` }">
              <component :is="opt.icon" class="w-6 h-6" :style="{ color: opt.color }" />
            </div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-strong">{{ opt.label }}</div>
              <div class="text-xs text-muted-c mt-0.5">{{ opt.desc }}</div>
            </div>
          </button>
        </div>
        <button @click="downloadSample" class="mt-4 text-xs text-faint-c hover:text-primary mx-auto block transition-colors">
          <FileInput class="w-3.5 h-3.5 inline mr-1" />下载发票包示例文件
        </button>
      </div>
    </template>

    <!-- OCR 识别中 -->
    <template v-else-if="mode === 'ocr'">
      <div class="card p-10 text-center">
        <Loader2 class="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <div class="text-base font-semibold text-strong mb-2">正在智能识别票据信息</div>
        <div class="text-xs text-muted-c mb-5">{{ ocrStatus || '提取开票方、金额、税额、发票号码等字段' }}</div>
        <div class="max-w-xs mx-auto h-1.5 bg-muted-c rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full transition-all duration-300" :style="{ width: `${ocrProgress}%` }"></div>
        </div>
        <div class="text-xs text-primary mt-2 font-mono">{{ ocrProgress }}%</div>
        <div class="text-[10px] text-faint-c mt-3">首次识别需下载中文模型（约 2-4MB），请稍候</div>
      </div>
    </template>

    <!-- 录入表单 -->
    <template v-else>
      <div class="card p-6">
        <div class="flex items-center justify-between mb-5">
          <div class="section-title">填写票据信息</div>
          <button @click="mode = 'menu'; resetForm()" class="p-1.5 rounded-lg text-muted-c hover:bg-muted-c"><X class="w-5 h-5" /></button>
        </div>

        <!-- 图片预览 + OCR -->
        <div v-if="form.imageUrl" class="mb-5">
          <div class="relative rounded-xl overflow-hidden border border-soft max-h-64">
            <img :src="form.imageUrl" class="w-full object-contain max-h-64" />
          </div>
          <div class="flex gap-2 mt-2">
            <button v-if="form.source === 'upload'" @click="runOcr" :disabled="ocrLoading" class="btn btn-primary text-xs py-2">
              <Sparkles class="w-3.5 h-3.5" /> {{ ocrLoading ? '识别中...' : '智能识别信息' }}
            </button>
            <span v-if="form.source === 'ocr'" class="inline-flex items-center gap-1 text-xs text-positive px-2 py-1">
              <Check class="w-3.5 h-3.5" /> 已自动识别
            </span>
          </div>
          <div v-if="ocrError" class="mt-2 text-[11px] text-negative px-2 py-1.5 rounded" style="background: var(--bg-negative-tint, rgba(178,58,72,0.08));">
            {{ ocrError }}
          </div>
        </div>

        <!-- 票据类型 -->
        <div class="mb-4">
          <label class="text-xs text-muted-c mb-2 block">票据类型</label>
          <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
            <button
              v-for="p in BILL_KIND_PRESETS"
              :key="p.kind"
              @click="form.kind = p.kind; form.invoiceType = p.kind === 'invoice' ? 'general' : ''"
              :class="['p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1', form.kind === p.kind ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c hover:text-base-c']"
            >
              <component :is="kindIcon[p.kind] || MoreHorizontal" class="w-5 h-5" />
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- 发票类型 -->
        <div v-if="isInvoice" class="mb-4">
          <label class="text-xs text-muted-c mb-2 block">发票类型</label>
          <div class="flex gap-2">
            <button
              v-for="p in INVOICE_TYPE_PRESETS"
              :key="p.value"
              @click="form.invoiceType = p.value"
              :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', form.invoiceType === p.value ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']"
            >{{ p.label }}</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">开票方 / 商户</label>
            <input v-model="form.merchant" type="text" placeholder="如：京东信息技术有限公司" class="input" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">日期</label>
            <input v-model="form.date" type="date" class="input" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">金额（价税合计）</label>
            <input v-model="form.amount" type="number" min="0" step="0.01" placeholder="0.00" class="input font-mono" />
          </div>
          <div v-if="isInvoice">
            <label class="text-xs text-muted-c mb-1.5 block">税额</label>
            <input v-model="form.taxAmount" type="number" min="0" step="0.01" placeholder="0.00" class="input font-mono" />
          </div>
          <div v-if="isInvoice" class="md:col-span-2">
            <label class="text-xs text-muted-c mb-1.5 block">发票号码</label>
            <input v-model="form.invoiceNumber" type="text" placeholder="发票号码" class="input font-mono" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">用途分类</label>
            <select v-model="form.category" class="input">
              <option v-for="c in BILL_CATEGORIES" :key="c.name" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">用途</label>
            <div class="flex gap-2">
              <button @click="form.usage = 'personal'" :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', form.usage === 'personal' ? 'bg-muted-c border-soft text-strong' : 'bg-muted-c border-soft text-muted-c']">个人消费</button>
              <button @click="form.usage = 'reimbursable'" :class="['flex-1 py-2 rounded-lg border text-xs font-medium transition-all', form.usage === 'reimbursable' ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']">可报销</button>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-muted-c mb-1.5 block">备注</label>
            <input v-model="form.note" type="text" placeholder="选填，如：办公用品采购" class="input" />
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="mode = 'menu'; resetForm()" class="btn btn-ghost flex-1">取消</button>
          <button @click="submit" :disabled="!parseFloat(String(form.amount))" class="btn btn-primary flex-1" :class="{ 'opacity-50 cursor-not-allowed': !parseFloat(String(form.amount)) }">归集到票据库</button>
        </div>
      </div>
    </template>
  </div>
</template>
