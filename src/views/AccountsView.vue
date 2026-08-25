<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, X, Banknote, CreditCard, MessageCircle, Wallet } from 'lucide-vue-next'
import { store } from '../store'
import { fmtMoney } from '../utils/format'
import { ACCOUNT_KIND_PRESETS } from '../types'
import type { AccountKind } from '../types'

const showAdd = ref(false)
const newAcc = ref({ name: '', kind: 'wechat' as AccountKind, initialBalance: 0 })
const iconMap: Record<string, any> = { Banknote, CreditCard, MessageCircle, Wallet }

const addAccount = async () => {
  if (!newAcc.value.name.trim()) return
  const preset = ACCOUNT_KIND_PRESETS.find(p => p.kind === newAcc.value.kind) || ACCOUNT_KIND_PRESETS[5]
  try {
    await store.addMainAccount({
      name: newAcc.value.name,
      kind: newAcc.value.kind,
      icon: preset.icon,
      color: preset.color,
      initialBalance: newAcc.value.initialBalance,
    })
    newAcc.value = { name: '', kind: 'wechat', initialBalance: 0 }
    showAdd.value = false
  } catch (err) {
    console.error('[AccountsView] 创建账户失败:', err)
    alert('创建账户失败，请重试')
  }
}

const deleteAcc = async (id: string) => {
  if (!confirm('删除该账户？关联票据的支付账户信息将保留但不再统计。')) return
  try { await store.deleteAccount(id) }
  catch (err) { console.error('[AccountsView] 删除账户失败:', err); alert('删除失败，请重试') }
}
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <!-- 说明 -->
    <div class="card card-glow p-5 flex items-center justify-between">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-primary-tint border border-primary-tint flex items-center justify-center shrink-0">
          <Wallet class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-strong mb-1">账户管理（辅助）</h2>
          <p class="text-sm text-muted-c leading-relaxed">账户用于辅助记录票据的支付来源，归集票据时可关联账户用于估算个人消费余额。</p>
        </div>
      </div>
      <button @click="showAdd = true" class="btn btn-primary shrink-0"><Plus class="w-4 h-4" /> 新建</button>
    </div>

    <!-- 账户列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="acc in store.mainAccounts.value" :key="acc.id" class="card p-5">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" :style="{ background: acc.color + '15', border: `1px solid ${acc.color}30` }">
            <component :is="iconMap[acc.icon] || Wallet" class="w-6 h-6" :style="{ color: acc.color }" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-strong">{{ acc.name }}</span>
              <span class="chip text-[10px]">{{ ACCOUNT_KIND_PRESETS.find(p => p.kind === acc.kind)?.label }}</span>
            </div>
            <div class="text-xs text-muted-c mt-0.5">初始 ¥{{ fmtMoney(acc.initialBalance) }}</div>
          </div>
          <button @click="deleteAcc(acc.id)" class="p-2 rounded-lg text-faint-c hover:text-negative hover:bg-negative-tint transition-all">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <div class="mt-4 pt-4 border-t border-soft">
          <div class="text-[10px] text-faint-c uppercase tracking-wider mb-1">估算余额（个人消费票据扣减）</div>
          <div class="text-xl font-mono font-bold" :class="store.accountBalance(acc.id) >= 0 ? 'text-positive' : 'text-negative'">¥{{ fmtMoney(store.accountBalance(acc.id)) }}</div>
        </div>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAdd = false">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative card p-6 w-full max-w-md animate-slide-up">
        <div class="section-title mb-5">新建账户</div>
        <div class="space-y-4">
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">账户类型</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="preset in ACCOUNT_KIND_PRESETS.filter(p => p.kind !== 'custom')"
                :key="preset.kind"
                @click="newAcc.kind = preset.kind; newAcc.name = newAcc.name || preset.label"
                :class="['p-3 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1.5', newAcc.kind === preset.kind ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']"
              >
                <component :is="iconMap[preset.icon] || Wallet" class="w-5 h-5" />
                {{ preset.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">账户名称</label>
            <input v-model="newAcc.name" type="text" placeholder="如：微信钱包" class="input" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">初始余额</label>
            <input v-model.number="newAcc.initialBalance" type="number" min="0" placeholder="0.00" class="input font-mono" />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showAdd = false" class="btn btn-ghost flex-1">取消</button>
          <button @click="addAccount" :disabled="!newAcc.name.trim()" class="btn btn-primary flex-1" :class="{ 'opacity-50 cursor-not-allowed': !newAcc.name.trim() }">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>
