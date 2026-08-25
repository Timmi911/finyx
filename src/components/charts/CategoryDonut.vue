<script setup lang="ts">
import { computed } from 'vue'
import { fmtMoney } from '../../utils/format'

const props = defineProps<{
  segments: { name: string; value: number }[]
}>()

const total = computed(() => props.segments.reduce((s, c) => s + c.value, 0))
const sorted = computed(() => [...props.segments].sort((a, b) => b.value - a.value))

// 主色深浅梯度：全部使用主色，按排名从 100% → 30% 透明度递减
const colorFor = (index: number, total: number) => {
  if (total <= 1) return 'var(--c-primary)'
  // 从 1.0 线性递减到 0.3
  const ratio = 1 - (index / (total - 1)) * 0.7
  return `color-mix(in srgb, var(--c-primary) ${Math.round(ratio * 100)}%, transparent)`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-baseline justify-between pb-2" style="border-bottom: 1px solid var(--border-soft);">
      <span class="text-[10px] uppercase tracking-[0.15em] text-muted-c">Total</span>
      <span class="text-lg font-bold text-strong font-mono-num">¥{{ fmtMoney(total, 0) }}</span>
    </div>
    <div v-if="sorted.length === 0" class="text-center py-6 text-faint-c text-xs uppercase tracking-wider">No Data</div>
    <div v-else class="space-y-2.5">
      <div
        v-for="(seg, i) in sorted"
        :key="i"
        class="space-y-1"
      >
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-base-c flex items-center gap-1.5">
            <span class="w-1.5 h-1.5" :style="{ background: colorFor(i, sorted.length) }"></span>
            {{ seg.name }}
          </span>
          <span class="font-mono-num text-muted-c">{{ ((seg.value / (total || 1)) * 100).toFixed(1) }}%</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5" style="background: var(--bg-muted);">
            <div
              class="h-full transition-all"
              :style="{
                width: `${((seg.value / (total || 1)) * 100).toFixed(1)}%`,
                background: `linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.18) 100%), ${colorFor(i, sorted.length)}`,
                borderLeft: '1px solid rgba(255,255,255,0.4)',
                boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.25), inset -1px 0 0 rgba(0,0,0,0.12)'
              }"
            ></div>
          </div>
          <span class="text-[10px] font-mono-num text-muted-c w-16 text-right">¥{{ fmtMoney(seg.value, 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

