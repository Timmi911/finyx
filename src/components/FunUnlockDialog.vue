<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Sparkles, Check, X } from 'lucide-vue-next'
import { store } from '../store'
import { setUnlockHandler } from '../utils/funBus'
import type { FunFeatureKey } from '../types'

const visible = ref(false)
const feature = ref<FunFeatureKey | null>(null)
const resolveFn = ref<((v: boolean) => void) | null>(null)

interface FeatureMeta {
  label: string
  en: string
  icon: string
  desc: string
  demo: string
}

const META: Record<FunFeatureKey, FeatureMeta> = {
  mouthpiece: {
    label: '金句嘴替', en: 'Mouthpiece',
    icon: '💬',
    desc: '大额消费后弹一句吐槽或鼓励，给钱包一点情绪',
    demo: '「钱包在哭泣，但你说值就值」',
  },
  fortune: {
    label: '消费运势', en: 'Fortune',
    icon: '🔮',
    desc: '每日生成一张消费运势卡，宜攒钱忌冲动',
    demo: '今日财运3星 · 宜理性 · 忌剁手',
  },
  achievements: {
    label: '成就徽章', en: 'Achievements',
    icon: '🏆',
    desc: '达成各种奇葩成就，解锁金属徽章',
    demo: '「连续7天无外卖」「攒满第一个1万」',
  },
  selfbet: {
    label: '自赌挑战', en: 'Self Bet',
    icon: '🎲',
    desc: '和自己打赌，押注赌金+惩罚，赢了解锁动画',
    demo: '「本月外卖不超500，输了发红包」',
  },
  moneytree: {
    label: '金钱树', en: 'Money Tree',
    icon: '🌱',
    desc: '攒钱浇水让树长大，消费超标掉叶子',
    demo: '从种子长到开花，见证你的积蓄成长',
  },
  pkchallenge: {
    label: '好友PK', en: 'PK Challenge',
    icon: '⚔️',
    desc: '发起挑战邀请好友，实时排行榜+赌约',
    demo: '「30天攒钱赛，输的请客」',
  },
}

const currentMeta = ref<FeatureMeta | null>(null)

onMounted(() => {
  setUnlockHandler((key: FunFeatureKey) => {
    return new Promise<boolean>((resolve) => {
      if (store.isFunUnlocked(key)) {
        resolve(true)
        return
      }
      feature.value = key
      currentMeta.value = META[key]
      visible.value = true
      resolveFn.value = resolve
    })
  })
})

onBeforeUnmount(() => {
  setUnlockHandler(null)
})

const handleConfirm = () => {
  if (feature.value) store.unlockFun(feature.value)
  visible.value = false
  resolveFn.value?.(true)
  resolveFn.value = null
}

const handleCancel = () => {
  visible.value = false
  resolveFn.value?.(false)
  resolveFn.value = null
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[999] flex items-center justify-center p-4" @click.self="cancel">
      <div class="absolute inset-0 bg-overlay backdrop-blur-sm"></div>
      <div class="relative w-full max-w-sm animate-slide-up overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--border-strong);">
        <!-- 顶部装饰条 -->
        <div class="h-1" style="background: linear-gradient(90deg, var(--c-primary), var(--c-accent));"></div>

        <div class="p-5">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 flex items-center justify-center text-2xl" style="background: var(--bg-muted); border: 1px solid var(--border-soft);">
                {{ currentMeta?.icon }}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-strong">{{ currentMeta?.label }}</span>
                  <span class="chip text-[8px] text-accent border-accent-tint bg-accent-tint">
                    <Sparkles class="w-2 h-2" /> 待解锁
                  </span>
                </div>
                <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">{{ currentMeta?.en }}</div>
              </div>
            </div>
            <button @click="handleCancel" class="text-faint-c hover:text-strong transition-colors">
              <X class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-base-c leading-relaxed mb-3">{{ currentMeta?.desc }}</p>

          <!-- 演示预览 -->
          <div class="p-3 mb-4 text-center" style="background: var(--bg-muted); border-left: 2px solid var(--c-primary);">
            <div class="text-[10px] text-faint-c tracking-wider uppercase mb-1">预览</div>
            <div class="text-xs text-strong italic">{{ currentMeta?.demo }}</div>
          </div>

          <div class="flex gap-2">
            <button @click="handleCancel" class="btn btn-ghost flex-1 text-xs py-2">下次再说</button>
            <button @click="handleConfirm" class="metal-btn flex-1 text-xs py-2 font-semibold" :style="{ '--btn-bg': 'var(--c-primary)' }">
              <Check class="w-3.5 h-3.5 inline" /> 解锁功能
            </button>
          </div>
          <div class="text-[9px] text-faint-c text-center mt-3">解锁后可在「趣味中心」随时关闭</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
