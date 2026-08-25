<script setup lang="ts">
import { ref, computed } from 'vue'
import { UserPlus, Trash2, User, Baby, Shield, Receipt } from 'lucide-vue-next'
import { store } from '../store'
import { fmtMoney } from '../utils/format'
import { BILL_KIND_PRESETS, BILL_CATEGORIES } from '../types'
import type { BillKind, FamilyRole } from '../types'

const showAdd = ref(false)
const newMember = ref({ name: '', role: 'child' as FamilyRole, avatar: '🧒' })
const avatarOptions = ['🧒', '👦', '👧', '👨', '👩', '👴', '👵', '🧑']
const colorOptions = ['#a78bfa', '#22d3ee', '#34d399', '#f472b6', '#fbbf24', '#f87171']
const expandedMember = ref<string | null>(null)

const family = computed(() => store.state.family)

const addMember = async () => {
  if (!newMember.value.name.trim()) return
  try {
    await store.addFamilyMember({
      ...newMember.value,
      color: colorOptions[family.value.length % colorOptions.length],
    })
    newMember.value = { name: '', role: 'child', avatar: '🧒' }
    showAdd.value = false
  } catch (err) {
    console.error('[FamilyView] 添加成员失败:', err)
    alert('添加成员失败，请重试')
  }
}

const deleteMember = async (id: string) => {
  try { await store.deleteFamilyMember(id) }
  catch (err) { console.error('[FamilyView] 删除成员失败:', err); alert('删除失败，请重试') }
}

// 成员票据（暂用备注匹配，第二阶段对接独立账户）
const memberBills = (memberId: string) => {
  // 简化：演示用，按创建时间倒序展示部分票据
  return store.state.bills
    .filter(b => b.note.includes(family.value.find(m => m.id === memberId)?.name || '___'))
    .slice(0, 5)
}

const memberStats = (memberId: string) => {
  const bills = memberBills(memberId)
  return {
    count: bills.length,
    amount: bills.reduce((s, b) => s + b.amount, 0),
  }
}

const catColor = (c: string) => BILL_CATEGORIES.find(x => x.name === c)?.color || '#64748b'
const kindColor = (k: BillKind) => BILL_KIND_PRESETS.find(p => p.kind === k)?.color || '#64748b'
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <!-- 说明 -->
    <div class="card card-glow p-5">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-secondary-tint border border-secondary-tint flex items-center justify-center shrink-0">
          <Shield class="w-6 h-6 text-secondary" />
        </div>
        <div class="flex-1">
          <h2 class="text-base font-semibold text-strong mb-1">家庭票据对接</h2>
          <p class="text-sm text-muted-c leading-relaxed">
            添加家庭成员（如孩子），家庭成员的票据可在此汇总查看。第二阶段企业端接入后，家庭成员票据可一键推送到对应单位报销。
          </p>
        </div>
        <button @click="showAdd = true" class="btn btn-primary shrink-0">
          <UserPlus class="w-4 h-4" /> 添加成员
        </button>
      </div>
    </div>

    <!-- 成员列表 -->
    <div v-if="family.length === 0" class="card p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted-c flex items-center justify-center">
        <UserPlus class="w-8 h-8 text-faint-c" />
      </div>
      <p class="text-faint-c text-sm mb-4">还没有家庭成员，添加一个开始对接</p>
      <button @click="showAdd = true" class="btn btn-primary mx-auto">
        <UserPlus class="w-4 h-4" /> 添加成员
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="m in family" :key="m.id" class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl" :style="{ background: m.color + '15', border: `1px solid ${m.color}30` }">{{ m.avatar }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-strong">{{ m.name }}</span>
              <span :class="['chip text-[10px]', m.role === 'parent' ? 'text-primary border-primary-tint bg-primary-tint' : 'text-secondary border-secondary-tint bg-secondary-tint']">
                {{ m.role === 'parent' ? '家长' : '孩子' }}
              </span>
            </div>
            <div class="text-xs text-muted-c mt-0.5">{{ memberStats(m.id).count }} 张票据 · ¥{{ fmtMoney(memberStats(m.id).amount, 0) }}</div>
          </div>
          <button @click="deleteMember(m.id)" class="p-2 rounded-lg text-faint-c hover:text-negative hover:bg-negative-tint transition-all">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-1.5">
          <div v-for="bill in memberBills(m.id)" :key="bill.id" class="flex items-center gap-3 py-2 px-2 rounded-lg bg-muted-c">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :style="{ background: kindColor(bill.kind) + '15', border: `1px solid ${kindColor(bill.kind)}30` }">
              <Receipt class="w-3.5 h-3.5" :style="{ color: kindColor(bill.kind) }" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-base-c truncate">{{ bill.merchant }}</div>
              <div class="text-[10px] text-faint-c">{{ bill.date }}</div>
            </div>
            <span class="text-xs font-mono text-base-c">¥{{ fmtMoney(bill.amount, 0) }}</span>
          </div>
          <div v-if="memberBills(m.id).length === 0" class="text-center py-4 text-xs text-faint-c">暂无关联票据（备注含成员名即归集到此）</div>
        </div>
      </div>
    </div>

    <!-- 添加成员弹窗 -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAdd = false">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative card p-6 w-full max-w-sm animate-slide-up">
        <div class="section-title mb-5">添加家庭成员</div>
        <div class="space-y-4">
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">姓名</label>
            <input v-model="newMember.name" type="text" placeholder="如：小明" class="input" />
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">角色</label>
            <div class="flex gap-2">
              <button @click="newMember.role = 'parent'; newMember.avatar = '👨'" :class="['flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5', newMember.role === 'parent' ? 'bg-primary-tint border-primary-tint text-primary' : 'bg-muted-c border-soft text-muted-c']">
                <User class="w-4 h-4" /> 家长
              </button>
              <button @click="newMember.role = 'child'; newMember.avatar = '🧒'" :class="['flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5', newMember.role === 'child' ? 'bg-secondary-tint border-secondary-tint text-secondary' : 'bg-muted-c border-soft text-muted-c']">
                <Baby class="w-4 h-4" /> 孩子
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-muted-c mb-1.5 block">头像</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="a in avatarOptions" :key="a" @click="newMember.avatar = a" :class="['w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all', newMember.avatar === a ? 'bg-primary-tint border-primary-tint' : 'bg-muted-c border-soft']">{{ a }}</button>
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="showAdd = false" class="btn btn-ghost flex-1">取消</button>
          <button @click="addMember" :disabled="!newMember.name.trim()" class="btn btn-primary flex-1" :class="{ 'opacity-50 cursor-not-allowed': !newMember.name.trim() }">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>
