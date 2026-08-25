<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sprout, Droplets, Sun, Wind, TrendingUp, Info } from 'lucide-vue-next'
import { store } from '../../store'

const tree = computed(() => store.state.moneyTree)

const waterAmount = ref(50)

const stageInfo = {
  seed: { label: '种子', en: 'Seed', emoji: '🌰', desc: '刚刚埋下希望' },
  sprout: { label: '嫩芽', en: 'Sprout', emoji: '🌱', desc: '冒出小脑袋' },
  sapling: { label: '树苗', en: 'Sapling', emoji: '🌿', desc: '茁壮成长中' },
  tree: { label: '小树', en: 'Tree', emoji: '🌳', desc: '枝繁叶茂' },
  flower: { label: '花树', en: 'Flower', emoji: '🌸', desc: '开花结果' },
}

const currentStage = computed(() => stageInfo[tree.value.stage])

const needExp = computed(() => tree.value.level * 100)
const expPct = computed(() => Math.min(100, (tree.value.exp / needExp.value) * 100))

const water = () => {
  if (waterAmount.value <= 0) return
  store.waterTree(waterAmount.value)
}

const wither = () => {
  store.witherTree()
}

const leavesDisplay = computed(() => {
  const n = tree.value.leaves
  if (n === 0) return ''
  if (n <= 5) return '🍃'.repeat(n)
  return '🍃'.repeat(5) + ` +${n - 5}`
})

// 模拟一周成长记录
const weekRecords = computed(() => {
  const records = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    // 简化：只显示最后浇水日之前的有数据
    const isLast = tree.value.lastWaterDate === dateStr
    records.push({
      date: dateStr.slice(5),
      watered: isLast,
      label: ['一', '二', '三', '四', '五', '六', '日'][d.getDay() === 0 ? 6 : d.getDay() - 1],
    })
  }
  return records
})
</script>

<template>
  <div class="space-y-5 max-w-2xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center" style="background: color-mix(in srgb, var(--c-positive) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c-positive) 25%, transparent);">
          <Sprout class="w-4 h-4 text-positive" />
        </div>
        <div>
          <div class="text-sm font-semibold text-strong">金钱树</div>
          <div class="text-[8px] tracking-[0.12em] text-faint-c uppercase">Money Tree</div>
        </div>
      </div>
      <div v-if="tree.withered" class="chip text-[9px] text-negative border-negative-tint bg-negative-tint">枯萎中</div>
    </div>

    <!-- 树展示 -->
    <div class="card p-6 relative overflow-hidden">
      <!-- 网格背景 -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(var(--c-primary) 1px, transparent 1px), linear-gradient(90deg, var(--c-primary) 1px, transparent 1px); background-size: 20px 20px;"></div>

      <div class="relative text-center">
        <!-- 阶段标识 -->
        <div class="flex items-center justify-center gap-2 mb-1">
          <span class="text-xs font-semibold text-strong">{{ currentStage.label }}</span>
          <span class="text-[8px] tracking-[0.12em] text-faint-c uppercase">{{ currentStage.en }} · Lv.{{ tree.level }}</span>
        </div>
        <div class="text-[10px] text-muted-c mb-4">{{ currentStage.desc }}</div>

        <!-- 树 emoji 大图 -->
        <div class="relative h-32 flex items-end justify-center mb-2">
          <div
            class="text-7xl transition-all duration-700"
            :class="tree.withered ? 'grayscale opacity-60' : ''"
            :style="{ transform: `scale(${1 + tree.level * 0.02})` }"
          >{{ tree.withered ? '🥀' : currentStage.emoji }}</div>
          <!-- 叶子飘落效果 -->
          <div v-if="tree.leaves > 0 && !tree.withered" class="absolute top-2 right-8 text-xs text-positive">{{ leavesDisplay }}</div>
        </div>

        <!-- 经验条 -->
        <div class="max-w-xs mx-auto">
          <div class="flex items-center justify-between text-[10px] mb-1">
            <span class="text-faint-c">经验</span>
            <span class="font-mono-num text-muted-c">{{ tree.exp }} / {{ needExp }}</span>
          </div>
          <div class="h-2" style="background: var(--bg-muted);">
            <div
              class="h-full transition-all duration-500 metal-v"
              :style="{ width: `${expPct}%`, '--c-primary': 'var(--c-positive)' }"
            ></div>
          </div>
        </div>

        <!-- 状态卡 -->
        <div class="grid grid-cols-3 gap-2 mt-5">
          <div class="p-2" style="background: var(--bg-muted);">
            <Droplets class="w-3 h-3 text-primary mx-auto mb-1" />
            <div class="text-[9px] text-faint-c uppercase">累计浇水</div>
            <div class="text-xs font-mono-num font-semibold text-strong">¥{{ tree.totalWatered }}</div>
          </div>
          <div class="p-2" style="background: var(--bg-muted);">
            <Wind class="w-3 h-3 text-positive mx-auto mb-1" />
            <div class="text-[9px] text-faint-c uppercase">叶子数</div>
            <div class="text-xs font-mono-num font-semibold text-strong">{{ tree.leaves }}</div>
          </div>
          <div class="p-2" style="background: var(--bg-muted);">
            <Sun class="w-3 h-3 text-accent mx-auto mb-1" />
            <div class="text-[9px] text-faint-c uppercase">最后浇水</div>
            <div class="text-[10px] font-mono-num font-semibold text-strong">{{ tree.lastWaterDate || '—' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 浇水操作 -->
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Droplets class="w-3.5 h-3.5 text-primary" />
        <div class="text-xs font-semibold text-strong">浇水</div>
        <span class="text-[10px] text-faint-c">每 ¥10 = 1 经验，每 ¥100 = 1 叶子</span>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <input v-model.number="waterAmount" type="number" placeholder="浇水金额" class="flex-1 px-3 py-2 text-sm font-mono-num bg-transparent border text-strong" style="border-color: var(--border-soft);" />
        <button @click="water" :disabled="waterAmount <= 0" class="metal-btn px-4 py-2 text-xs font-semibold disabled:opacity-40" :style="{ '--btn-bg': 'var(--c-primary)' }">
          <Droplets class="w-3.5 h-3.5 inline" /> 浇水
        </button>
      </div>
      <div class="flex gap-1.5">
        <button v-for="amt in [10, 50, 100, 500]" :key="amt" @click="waterAmount = amt" class="px-2 py-1 text-[10px] border text-muted-c transition-all" :class="waterAmount === amt ? 'border-primary text-primary bg-primary-tint' : ''" style="border-color: var(--border-soft);">
          ¥{{ amt }}
        </button>
        <button @click="wither" class="ml-auto px-2 py-1 text-[10px] border text-negative transition-all" style="border-color: var(--border-soft);">
          <Wind class="w-2.5 h-2.5 inline" /> 模拟枯萎
        </button>
      </div>
    </div>

    <!-- 一周记录 -->
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-3">
        <TrendingUp class="w-3.5 h-3.5 text-accent" />
        <div class="text-xs font-semibold text-strong">本周成长</div>
      </div>
      <div class="flex items-end justify-between gap-2 h-20">
        <div v-for="(r, i) in weekRecords" :key="i" class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div
            class="w-full transition-all duration-500"
            :style="{
              height: r.watered ? '60%' : '20%',
              background: r.watered ? 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 25%, rgba(0,0,0,0.06) 60%, rgba(0,0,0,0.18) 100%), var(--c-positive)' : 'var(--bg-muted)',
              opacity: r.watered ? 1 : 0.5
            }"
          ></div>
          <div class="text-[9px] text-faint-c">{{ r.label }}</div>
        </div>
      </div>
    </div>

    <!-- 玩法说明 -->
    <div class="card p-3 flex items-start gap-2">
      <Info class="w-3.5 h-3.5 text-faint-c shrink-0 mt-0.5" />
      <div class="text-[10px] text-muted-c leading-relaxed">
        攒下钱来浇水，树会慢慢长大；消费超标时叶子会掉落。从种子到花树共5个阶段，看着它成长，就是看着你的积蓄变厚。
      </div>
    </div>
  </div>
</template>
