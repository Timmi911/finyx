<script setup lang="ts">
import { ref, computed } from 'vue'
import { Swords, Plus, X, Trash2, Crown, Medal, Users, Clock } from 'lucide-vue-next'
import { store } from '../../store'
import type { PkChallenge, PkParticipant, PkStatus } from '../../types'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const showAdd = ref(false)
const addForm = ref({
  title: '',
  type: 'save' as PkChallenge['type'],
  target: 1000,
  days: 30,
  stake: 50,
  friends: '' as string,
})

const challenges = computed(() => store.state.pkChallenges)
const activeChallenges = computed(() => challenges.value.filter(c => c.status !== 'finished'))
const finishedChallenges = computed(() => challenges.value.filter(c => c.status === 'finished'))

const typeLabel: Record<PkChallenge['type'], string> = {
  save: '攒钱赛',
  no_spend: '不消费日',
  less_spend: '少花赛',
}

const typeDesc: Record<PkChallenge['type'], string> = {
  save: '期限内谁攒得多',
  no_spend: '期限内谁不消费天数多',
  less_spend: '期限内谁总消费少',
}

// 模拟好友列表
const friendAvatars = ['🐱', '🐶', '🐰', '🦊', '🐼', '🐨']

const submitAdd = () => {
  if (!addForm.value.title.trim() || addForm.value.target <= 0) return
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + addForm.value.days)

  // 解析朋友名字
  const friendNames = addForm.value.friends
    .split(/[,，\s]+/)
    .map(s => s.trim())
    .filter(s => s)
    .slice(0, 5)

  const participants: PkParticipant[] = [
    { name: '我', avatar: '👤', score: 0, isMe: true },
    ...friendNames.map((name, i) => ({
      name,
      avatar: friendAvatars[i % friendAvatars.length],
      score: Math.floor(Math.random() * addForm.value.target * 0.8), // 模拟初始进度
      isMe: false,
    })),
  ]

  const c: PkChallenge = {
    id: genId(),
    title: addForm.value.title,
    type: addForm.value.type,
    target: addForm.value.target,
    startDate: today.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    stake: addForm.value.stake,
    participants,
    status: 'active',
    createdAt: Date.now(),
  }
  store.addPkChallenge(c)
  showAdd.value = false
  addForm.value = { title: '', type: 'save', target: 1000, days: 30, stake: 50, friends: '' }
}

const daysLeft = (end: string) => Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000))

const sortedParticipants = (c: PkChallenge) => {
  return [...c.participants].sort((a, b) => {
    // no_spend / less_spend: 越少越好（暂统一处理为越多越好，简单化）
    return b.score - a.score
  })
}

const myScore = (c: PkChallenge) => {
  const me = c.participants.find(p => p.isMe)
  return me ? me.score : 0
}

const myRank = (c: PkChallenge) => {
  const sorted = sortedParticipants(c)
  return sorted.findIndex(p => p.isMe) + 1
}

const addMyProgress = (c: PkChallenge, amount: number) => {
  const me = c.participants.find(p => p.isMe)
  if (me) me.score += amount
}

const finishChallenge = (c: PkChallenge) => {
  store.updatePkChallenge(c.id, { status: 'finished' })
}

const statusInfo = (s: PkStatus) => {
  if (s === 'active') return { label: '进行中', color: 'var(--c-accent)' }
  if (s === 'invited') return { label: '待接受', color: 'var(--c-primary)' }
  return { label: '已结束', color: 'var(--c-faint)' }
}

const rankIcon = (rank: number) => {
  if (rank === 1) return Crown
  if (rank === 2 || rank === 3) return Medal
  return null
}
</script>

<template>
  <div class="space-y-5 max-w-3xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-negative) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-negative) 25%, transparent);">
          <Swords class="w-4 h-4 text-negative" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">好友PK</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">PK Challenge</div>
        </div>
      </div>
      <button @click="showAdd = true" class="metal-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" :style="{ '--btn-bg': 'var(--c-primary)' }">
        <Plus class="w-3.5 h-3.5" /> 发起挑战
      </button>
    </div>

    <div class="card p-3 flex items-start gap-2">
      <Users class="w-3.5 h-3.5 text-faint-c shrink-0 mt-0.5" />
      <div class="text-[10px] text-muted-c leading-relaxed">
        演示模式：好友数据为本地模拟。发起挑战后邀请好友加入，按规则比拼，输的请客。
      </div>
    </div>

    <!-- 进行中 -->
    <div>
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock class="w-3 h-3" /> 进行中 · {{ activeChallenges.length }}
      </div>
      <div v-if="activeChallenges.length === 0" class="card p-8 text-center">
        <Swords class="w-8 h-8 mx-auto mb-2 text-faint-c" />
        <div class="text-xs text-muted-c">还没有进行中的挑战</div>
        <div class="text-[10px] text-faint-c mt-1">发起一场友谊赛，让攒钱变好玩</div>
      </div>
      <div v-else class="space-y-3">
        <div v-for="c in activeChallenges" :key="c.id" class="card p-4">
          <!-- 头部 -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-strong">{{ c.title }}</span>
                <span class="chip text-[8px] text-negative border-negative-tint bg-negative-tint">{{ typeLabel[c.type] }}</span>
              </div>
              <div class="text-[10px] text-faint-c">{{ typeDesc[c.type] }} · 赌注 ¥{{ c.stake }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-[9px] text-faint-c uppercase">剩余</div>
              <div class="text-base font-bold font-mono-num" :class="daysLeft(c.endDate) <= 3 ? 'text-negative' : 'text-strong'">{{ daysLeft(c.endDate) }}</div>
              <div class="text-[9px] text-faint-c">天</div>
            </div>
          </div>

          <!-- 排行榜 -->
          <div class="space-y-1.5 mb-3">
            <div
              v-for="(p, i) in sortedParticipants(c)"
              :key="p.name"
              class="flex items-center gap-2 p-2 transition-all"
              :style="{
                background: p.isMe ? 'color-mix(in srgb, var(--c-primary) 8%, transparent)' : 'var(--bg-muted)',
                borderLeft: i === 0 ? '2px solid var(--c-accent)' : '2px solid transparent'
              }"
            >
              <div class="w-5 text-center text-xs font-bold font-mono-num" :class="i === 0 ? 'text-accent' : 'text-faint-c'">{{ i + 1 }}</div>
              <div class="text-base">{{ p.avatar }}</div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium truncate" :class="p.isMe ? 'text-primary' : 'text-strong'">{{ p.name }}<span v-if="p.isMe" class="text-[9px] text-faint-c">（你）</span></div>
              </div>
              <div class="text-right">
                <div class="text-xs font-mono-num font-semibold text-strong">{{ p.score }}</div>
                <div class="text-[8px] text-faint-c">/ {{ c.target }}</div>
              </div>
              <component v-if="rankIcon(i + 1)" :is="rankIcon(i + 1)" class="w-3.5 h-3.5 text-accent" />
            </div>
          </div>

          <!-- 我的操作 -->
          <div class="flex items-center gap-2 pt-2" style="border-top: 1px solid var(--border-soft);">
            <div class="flex-1 text-[10px] text-muted-c">
              我的排名：<span class="font-mono-num font-semibold text-strong">第 {{ myRank(c) }}</span> · 当前 <span class="font-mono-num text-strong">{{ myScore(c) }}</span>
            </div>
            <button @click="addMyProgress(c, Math.ceil(c.target * 0.1))" class="metal-btn px-2 py-1 text-[10px] font-medium" :style="{ '--btn-bg': 'var(--c-primary)' }">
              +攒 {{ Math.ceil(c.target * 0.1) }}
            </button>
            <button @click="finishChallenge(c)" class="text-[10px] text-faint-c hover:text-strong">结束</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已结束 -->
    <div v-if="finishedChallenges.length > 0">
      <div class="text-[10px] text-muted-c uppercase tracking-wider mb-3">已结束 · {{ finishedChallenges.length }}</div>
      <div class="space-y-2">
        <div v-for="c in finishedChallenges" :key="c.id" class="card p-3 flex items-center gap-3 opacity-75">
          <Crown class="w-4 h-4 text-accent shrink-0" v-if="myRank(c) === 1" />
          <Medal class="w-4 h-4 text-faint-c shrink-0" v-else />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-strong truncate">{{ c.title }}</div>
            <div class="text-[9px] text-faint-c">第 {{ myRank(c) }} 名 · {{ c.startDate }} → {{ c.endDate }}</div>
          </div>
          <button @click="store.deletePkChallenge(c.id)" class="text-faint-c hover:text-negative transition-colors">
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <Teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 z-[999] flex items-center justify-center p-4" @click.self="showAdd = false">
        <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
        <div class="relative w-full max-w-md max-h-[90vh] overflow-y-auto" style="background: var(--bg-surface); border: 1px solid var(--border-strong);">
          <div class="sticky top-0 flex items-center justify-between p-4" style="background: var(--bg-surface); border-bottom: 1px solid var(--border-soft);">
            <div>
              <div class="text-sm font-semibold text-strong">发起挑战</div>
              <div class="text-[9px] text-faint-c">邀请好友一起较劲</div>
            </div>
            <button @click="showAdd = false" class="text-faint-c hover:text-strong"><X class="w-4 h-4" /></button>
          </div>

          <div class="p-4 space-y-4">
            <div>
              <label class="text-xs text-muted-c mb-1.5 block">挑战名称</label>
              <input v-model="addForm.title" type="text" placeholder="如：30天攒钱赛" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
            </div>

            <div>
              <label class="text-xs text-muted-c mb-1.5 block">挑战类型</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="(label, key) in typeLabel"
                  :key="key"
                  @click="addForm.type = key as PkChallenge['type']"
                  :class="['p-2 text-xs border transition-all', addForm.type === key ? 'border-negative text-negative bg-negative-tint' : 'text-base-c']"
                  style="border-color: var(--border-soft);"
                >{{ label }}</button>
              </div>
              <div class="text-[10px] text-faint-c mt-1.5">{{ typeDesc[addForm.type] }}</div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-c mb-1.5 block">目标</label>
                <input v-model.number="addForm.target" type="number" class="w-full px-2 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              </div>
              <div>
                <label class="text-xs text-muted-c mb-1.5 block">天数</label>
                <input v-model.number="addForm.days" type="number" class="w-full px-2 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              </div>
              <div>
                <label class="text-xs text-muted-c mb-1.5 block">赌注</label>
                <input v-model.number="addForm.stake" type="number" class="w-full px-2 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              </div>
            </div>

            <div>
              <label class="text-xs text-muted-c mb-1.5 block">邀请好友 <span class="text-faint-c">/ 用逗号分隔</span></label>
              <input v-model="addForm.friends" type="text" placeholder="如：小明, 小红, 阿强" class="w-full px-3 py-2 text-sm bg-transparent border text-strong" style="border-color: var(--border-soft);" />
              <div class="text-[10px] text-faint-c mt-1">演示模式：好友数据本地模拟</div>
            </div>

            <button @click="submitAdd" :disabled="!addForm.title.trim() || addForm.target <= 0" class="metal-btn w-full py-2.5 text-sm font-semibold disabled:opacity-40" :style="{ '--btn-bg': 'var(--c-primary)' }">
              发起挑战
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
