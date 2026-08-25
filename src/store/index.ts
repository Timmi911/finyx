import { reactive, computed, watch } from 'vue'
import type { Bill, Reimbursement, Account, FamilyMember, Profile, Goal, GoalRecord, FunFeatureKey, FunFeatureState, MouthpieceLog, DailyFortune, Achievement, SelfBet, MoneyTree, PkChallenge, IncomeRecord, IncomeSource, CustomIncomeSource, IncomeSourceOverride } from '../types'
import { INCOME_SOURCE_PRESETS } from '../types'
import { authStore } from '../stores/auth'
import { billsApi, type BillInput } from '../services/bills'
import { reimbursementsApi, type ReimbInput } from '../services/reimbursements'
import { accountsApi, type AccountInput } from '../services/accounts'
import { familyApi, type FamilyInput } from '../services/family'
import { incomeRecordsApi, customSourcesApi, sourceOverridesApi, type IncomeRecordInput, type CustomSourceInput, type UpsertSourceOverrideInput } from '../services/incomes'
import { goalsApi, type GoalInput, type GoalRecordInput } from '../services/goals'

const STORAGE_KEY = 'finyx-data-v2'
const THEME_KEY = 'finyx-theme'

export type ThemeName = 'light' | 'dark' | 'candy' | 'pink'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface StoreState {
  profile: Profile
  bills: Bill[]
  reimbursements: Reimbursement[]
  accounts: Account[]
  family: FamilyMember[]
  goals: Goal[]
  activeAccountId: string | null
  // 趣味功能
  funFeatures: FunFeatureState[]
  mouthpieceLogs: MouthpieceLog[]
  dailyFortune: DailyFortune | null
  achievements: Achievement[]
  selfBets: SelfBet[]
  moneyTree: MoneyTree
  pkChallenges: PkChallenge[]
  incomeRecords: IncomeRecord[]
  customIncomeSources: CustomIncomeSource[]
  incomeSourceOverrides: IncomeSourceOverride[]
}

class Store {
  state: StoreState
  theme = reactive<{ current: ThemeName }>({ current: 'light' })

  constructor() {
    this.state = reactive<StoreState>({
      profile: { name: '我的票据夹', avatar: '👤' },
      bills: [],
      reimbursements: [],
      accounts: [],
      family: [],
      goals: [],
      activeAccountId: null,
      funFeatures: [
        { key: 'mouthpiece', unlocked: false, unlockedAt: null, enabled: false },
        { key: 'fortune', unlocked: false, unlockedAt: null, enabled: false },
        { key: 'achievements', unlocked: false, unlockedAt: null, enabled: false },
        { key: 'selfbet', unlocked: false, unlockedAt: null, enabled: false },
        { key: 'moneytree', unlocked: false, unlockedAt: null, enabled: false },
        { key: 'pkchallenge', unlocked: false, unlockedAt: null, enabled: false },
      ],
      mouthpieceLogs: [],
      dailyFortune: null,
      achievements: [],
      selfBets: [],
      moneyTree: { level: 1, exp: 0, leaves: 0, totalWatered: 0, lastWaterDate: '', withered: false, stage: 'seed' },
      pkChallenges: [],
      incomeRecords: [],
      customIncomeSources: [],
      incomeSourceOverrides: [],
    })
  }

  async init() {
    this.loadTheme()
    // 注意：authStore.bootstrap() 已在 main.ts 里更早执行（先于 router.use），避免路由守卫拿不到登录态
    await this.load()
    this.applyTheme()
    // 仅持久化本地字段（bills/reimbursements/accounts/family/goals/incomes 均由后端管理）
    watch(
      () => JSON.stringify({
        profile: this.state.profile,
        funFeatures: this.state.funFeatures,
        mouthpieceLogs: this.state.mouthpieceLogs,
        dailyFortune: this.state.dailyFortune,
        achievements: this.state.achievements,
        selfBets: this.state.selfBets,
        moneyTree: this.state.moneyTree,
        pkChallenges: this.state.pkChallenges,
      }),
      () => this.save(),
    )
  }

  // ===== 主题 =====
  loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null
    if (saved && ['light', 'dark', 'candy', 'pink'].includes(saved)) {
      this.theme.current = saved
    }
  }

  setTheme(t: ThemeName) {
    this.theme.current = t
    localStorage.setItem(THEME_KEY, t)
    this.applyTheme()
  }

  applyTheme() {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme.current)
    }
  }

  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        this.state.profile = data.profile || this.state.profile
        // bills/reimbursements/accounts/family/goals/incomes 均由后端管理，不再从 localStorage 读
        if (data.funFeatures) this.state.funFeatures = data.funFeatures
        if (data.mouthpieceLogs) this.state.mouthpieceLogs = data.mouthpieceLogs
        if (data.dailyFortune !== undefined) this.state.dailyFortune = data.dailyFortune
        if (data.achievements) this.state.achievements = data.achievements
        if (data.selfBets) this.state.selfBets = data.selfBets
        if (data.moneyTree) this.state.moneyTree = data.moneyTree
        if (data.pkChallenges) this.state.pkChallenges = data.pkChallenges
      }
      // 后端管理模块：已登录并行拉取，未登录维持空数组
      if (authStore.isAuthenticated.value) {
        try {
          const [billsRes, reimbRes, accRes, famRes, incRes, srcRes, ovRes, goalsRes] = await Promise.all([
            billsApi.list(),
            reimbursementsApi.list(),
            accountsApi.list(),
            familyApi.list(),
            incomeRecordsApi.list(),
            customSourcesApi.list(),
            sourceOverridesApi.list(),
            goalsApi.list(),
          ])
          this.state.bills = billsRes.items
          this.state.reimbursements = reimbRes.items
          this.state.accounts = accRes.items
          this.state.family = famRes.items
          this.state.incomeRecords = incRes.items
          this.state.customIncomeSources = srcRes.items
          this.state.incomeSourceOverrides = ovRes.items
          this.state.goals = goalsRes.items
        } catch (err) {
          console.error('[store] 从后端加载数据失败:', err)
          this.state.bills = []
          this.state.reimbursements = []
          this.state.accounts = []
          this.state.family = []
          this.state.incomeRecords = []
          this.state.customIncomeSources = []
          this.state.incomeSourceOverrides = []
          this.state.goals = []
        }
      } else {
        this.state.bills = []
        this.state.reimbursements = []
        this.state.accounts = []
        this.state.family = []
        this.state.incomeRecords = []
        this.state.customIncomeSources = []
        this.state.incomeSourceOverrides = []
        this.state.goals = []
      }
    } catch (err) {
      console.error('[store] load 失败:', err)
      this.state.bills = []
    }
    if (!this.state.activeAccountId && this.state.accounts.length) {
      this.state.activeAccountId = this.state.accounts.find(a => a.tier === 'main')?.id || null
    }
  }

  save() {
    // 仅持久化本地字段，bills/reimbursements/accounts/family/goals/incomes 由后端管理
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: this.state.profile,
      funFeatures: this.state.funFeatures,
      mouthpieceLogs: this.state.mouthpieceLogs,
      dailyFortune: this.state.dailyFortune,
      achievements: this.state.achievements,
      selfBets: this.state.selfBets,
      moneyTree: this.state.moneyTree,
      pkChallenges: this.state.pkChallenges,
    }))
  }

  /** 重新拉取 bills（reimbursements 变更会联动 bill 状态，用此方法同步本地） */
  private async refreshBills() {
    try {
      const result = await billsApi.list()
      this.state.bills = result.items
    } catch (err) {
      console.error('[store] refreshBills 失败:', err)
    }
  }

  // ===== 票据操作 =====
  get mainAccounts() { return computed(() => this.state.accounts.filter(a => a.tier === 'main')) }
  get subAccounts() { return computed(() => this.state.accounts.filter(a => a.tier === 'sub')) }

  subAccountsOf(mainId: string) {
    return this.state.accounts.filter(a => a.tier === 'sub' && a.parentId === mainId)
  }

  async addBill(data: Partial<Bill>): Promise<Bill> {
    // pessimistic：先调后端，成功后用返回的 bill 入集合（保证 id/createdAt 一致）
    const bill = await billsApi.create(data as BillInput)
    this.state.bills.unshift(bill)
    return bill
  }

  async updateBill(id: string, data: Partial<Bill>): Promise<void> {
    const updated = await billsApi.update(id, data as Partial<BillInput>)
    const idx = this.state.bills.findIndex(b => b.id === id)
    if (idx >= 0) Object.assign(this.state.bills[idx], updated)
  }

  async deleteBill(id: string): Promise<void> {
    await billsApi.remove(id)
    const bill = this.state.bills.find(b => b.id === id)
    // 服务端已清理 reimbursements.billIds，前端也同步更新本地状态
    if (bill?.reimbursementId) {
      const r = this.state.reimbursements.find(x => x.id === bill.reimbursementId)
      if (r) {
        r.billIds = r.billIds.filter(bid => bid !== id)
        r.totalAmount = r.billIds.reduce((s, bid) => s + (this.state.bills.find(b => b.id === bid)?.amount || 0), 0)
      }
    }
    this.state.bills = this.state.bills.filter(b => b.id !== id)
  }

  // ===== 报销单操作 =====
  async addReimbursement(data: Partial<Reimbursement>): Promise<Reimbursement> {
    const payload: ReimbInput = {
      title: data.title || '报销单',
      billIds: data.billIds || [],
      status: data.status,
      approver: data.approver,
      note: data.note,
    }
    const r = await reimbursementsApi.create(payload)
    this.state.reimbursements.unshift(r)
    // 后端已联动 bills 状态，刷新本地 bills 保持一致
    await this.refreshBills()
    return r
  }

  async updateReimbursement(id: string, data: Partial<Reimbursement>): Promise<void> {
    const patch: Partial<ReimbInput> = {}
    if (data.title !== undefined) patch.title = data.title
    if (data.billIds !== undefined) patch.billIds = data.billIds
    if (data.status !== undefined) patch.status = data.status
    if (data.approver !== undefined) patch.approver = data.approver
    if (data.note !== undefined) patch.note = data.note
    const updated = await reimbursementsApi.update(id, patch)
    const idx = this.state.reimbursements.findIndex(r => r.id === id)
    if (idx >= 0) this.state.reimbursements[idx] = updated
    // billIds 或 status 变更会触发后端 bills 状态联动
    if (data.billIds !== undefined || data.status !== undefined) {
      await this.refreshBills()
    }
  }

  async deleteReimbursement(id: string): Promise<void> {
    await reimbursementsApi.remove(id)
    this.state.reimbursements = this.state.reimbursements.filter(r => r.id !== id)
    // 后端已回滚关联 bills 状态
    await this.refreshBills()
  }

  // ===== 账户操作（辅助）=====
  async addMainAccount(data: Partial<Account>): Promise<Account> {
    const payload: AccountInput = {
      name: data.name || '账户',
      tier: 'main',
      kind: data.kind || 'custom',
      icon: data.icon || 'Wallet',
      color: data.color || '#a78bfa',
      initialBalance: data.initialBalance ?? 0,
    }
    const acc = await accountsApi.create(payload)
    this.state.accounts.push(acc)
    return acc
  }

  async deleteAccount(id: string): Promise<void> {
    await accountsApi.remove(id)
    // 后端已级联删除子账户 + 清空 bills.accountId，本地同步
    const childIds = this.state.accounts
      .filter(a => a.parentId === id)
      .map(a => a.id)
    const removeIds = [id, ...childIds]
    this.state.accounts = this.state.accounts.filter(a => !removeIds.includes(a.id))
    for (const b of this.state.bills) {
      if (b.accountId && removeIds.includes(b.accountId)) b.accountId = null
    }
    if (this.state.activeAccountId && removeIds.includes(this.state.activeAccountId)) {
      this.state.activeAccountId = this.state.accounts.find(a => a.tier === 'main')?.id || null
    }
  }

  accountBalance(accountId: string): number {
    const acc = this.state.accounts.find(a => a.id === accountId)
    if (!acc) return 0
    // 辅助记账：用 personal 票据金额估算支出
    let bal = acc.initialBalance
    this.state.bills
      .filter(b => b.accountId === accountId && b.usage === 'personal' && b.status !== 'void')
      .forEach(b => { bal -= b.amount })
    return bal
  }

  totalBalance(): number {
    return this.mainAccounts.value.reduce((sum, a) => sum + this.accountBalance(a.id), 0)
  }

  // ===== 票据统计 =====
  /** 个人消费统计（排除已报销/可报销票据） */
  personalStats(month?: string) {
    let amount = 0, count = 0
    this.state.bills
      .filter(b => b.usage === 'personal' && b.status !== 'void')
      .filter(b => !month || b.date.startsWith(month))
      .forEach(b => { amount += b.amount; count++ })
    return { amount, count }
  }

  /** 报销统计 */
  reimbursableStats() {
    const pending = this.state.bills.filter(b => b.usage === 'reimbursable' && b.status === 'archived')
    const reimbursed = this.state.bills.filter(b => b.status === 'reimbursed')
    return {
      pendingAmount: pending.reduce((s, b) => s + b.amount, 0),
      pendingCount: pending.length,
      reimbursedAmount: reimbursed.reduce((s, b) => s + b.amount, 0),
      reimbursedCount: reimbursed.length,
    }
  }

  /** 按月统计票据金额 */
  monthBillStats(month: string) {
    let amount = 0, count = 0, reimbursed = 0
    this.state.bills
      .filter(b => b.date.startsWith(month) && b.status !== 'void')
      .forEach(b => {
        amount += b.amount
        count++
        if (b.status === 'reimbursed') reimbursed += b.amount
      })
    return { amount, count, netAmount: amount - reimbursed }
  }

  // ===== 家庭成员 =====
  async addFamilyMember(data: Partial<FamilyMember>): Promise<FamilyMember> {
    const payload: FamilyInput = {
      name: data.name || '成员',
      role: data.role,
      avatar: data.avatar,
      color: data.color,
      linkedAccountIds: data.linkedAccountIds,
    }
    const m = await familyApi.create(payload)
    this.state.family.push(m)
    return m
  }

  async deleteFamilyMember(id: string): Promise<void> {
    await familyApi.remove(id)
    this.state.family = this.state.family.filter(m => m.id !== id)
  }

  // ===== 目标管理 =====
  goalProgress(goal: Goal): number {
    const total = goal.records.reduce((s, r) => s + r.amount, 0)
    return goal.targetAmount > 0 ? Math.min(total / goal.targetAmount, 1) : 0
  }

  goalCurrentAmount(goal: Goal): number {
    return goal.records.reduce((s, r) => s + r.amount, 0)
  }

  async addGoal(data: Partial<GoalInput>): Promise<Goal> {
    const payload: GoalInput = {
      type: data.type || 'saving',
      title: data.title || '新目标',
      targetAmount: data.targetAmount || 0,
      records: data.records || [],
      status: data.status || 'active',
      color: data.color || '#D4AF37',
      deadline: data.deadline || '',
    }
    const g = await goalsApi.create(payload)
    this.state.goals.unshift(g)
    return g
  }

  async addGoalRecord(goalId: string, record: GoalRecordInput): Promise<void> {
    const updated = await goalsApi.addRecord(goalId, record)
    const idx = this.state.goals.findIndex(x => x.id === goalId)
    if (idx >= 0) this.state.goals[idx] = updated
  }

  async deleteGoalRecord(goalId: string, index: number): Promise<void> {
    const updated = await goalsApi.deleteRecord(goalId, index)
    const idx = this.state.goals.findIndex(x => x.id === goalId)
    if (idx >= 0) this.state.goals[idx] = updated
  }

  async deleteGoal(id: string): Promise<void> {
    await goalsApi.remove(id)
    this.state.goals = this.state.goals.filter(g => g.id !== id)
  }

  // ===== 趣味功能 =====
  funFeature(key: FunFeatureKey): FunFeatureState | undefined {
    return this.state.funFeatures.find(f => f.key === key)
  }

  isFunUnlocked(key: FunFeatureKey): boolean {
    return !!this.funFeature(key)?.unlocked
  }

  isFunEnabled(key: FunFeatureKey): boolean {
    const f = this.funFeature(key)
    return !!f && f.unlocked && f.enabled
  }

  unlockFun(key: FunFeatureKey) {
    const f = this.funFeature(key)
    if (f && !f.unlocked) {
      f.unlocked = true
      f.unlockedAt = Date.now()
      f.enabled = true
    }
  }

  toggleFun(key: FunFeatureKey) {
    const f = this.funFeature(key)
    if (f && f.unlocked) f.enabled = !f.enabled
  }

  // 金句嘴替
  addMouthpieceLog(log: MouthpieceLog) {
    this.state.mouthpieceLogs.unshift(log)
    if (this.state.mouthpieceLogs.length > 100) this.state.mouthpieceLogs.pop()
  }

  // 消费运势
  setDailyFortune(f: DailyFortune) {
    this.state.dailyFortune = f
  }

  // 自赌挑战
  addSelfBet(bet: SelfBet) {
    this.state.selfBets.unshift(bet)
  }

  updateSelfBet(id: string, patch: Partial<SelfBet>) {
    const b = this.state.selfBets.find(x => x.id === id)
    if (b) Object.assign(b, patch)
  }

  deleteSelfBet(id: string) {
    this.state.selfBets = this.state.selfBets.filter(b => b.id !== id)
  }

  // 金钱树
  waterTree(amount: number) {
    const t = this.state.moneyTree
    t.exp += Math.floor(amount / 10)
    t.totalWatered += amount
    t.leaves += Math.floor(amount / 100)
    t.lastWaterDate = new Date().toISOString().slice(0, 10)
    t.withered = false
    // 升级 + 阶段
    const need = t.level * 100
    if (t.exp >= need) {
      t.exp -= need
      t.level++
    }
    t.stage = t.level < 2 ? 'seed' : t.level < 4 ? 'sprout' : t.level < 7 ? 'sapling' : t.level < 10 ? 'tree' : 'flower'
  }

  witherTree() {
    this.state.moneyTree.withered = true
    this.state.moneyTree.leaves = Math.max(0, this.state.moneyTree.leaves - 5)
  }

  // 好友PK
  addPkChallenge(c: PkChallenge) {
    this.state.pkChallenges.unshift(c)
  }

  updatePkChallenge(id: string, patch: Partial<PkChallenge>) {
    const c = this.state.pkChallenges.find(x => x.id === id)
    if (c) Object.assign(c, patch)
  }

  deletePkChallenge(id: string) {
    this.state.pkChallenges = this.state.pkChallenges.filter(c => c.id !== id)
  }

  // ===== 月度收入记录 =====
  async addIncomeRecord(data: Partial<IncomeRecordInput>): Promise<IncomeRecord> {
    const payload: IncomeRecordInput = {
      month: data.month || monthStr(),
      date: data.date || todayStr(),
      source: data.source || 'salary',
      amount: data.amount || 0,
      note: data.note || '',
    }
    const r = await incomeRecordsApi.create(payload)
    this.state.incomeRecords.unshift(r)
    return r
  }

  async updateIncomeRecord(id: string, patch: Partial<IncomeRecordInput>): Promise<void> {
    const updated = await incomeRecordsApi.update(id, patch)
    const idx = this.state.incomeRecords.findIndex(r => r.id === id)
    if (idx >= 0) Object.assign(this.state.incomeRecords[idx], updated)
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    await incomeRecordsApi.remove(id)
    this.state.incomeRecords = this.state.incomeRecords.filter(r => r.id !== id)
  }

  /** 某月收入合计（默认不含报销/退款，避免与已报销票据重复） */
  monthIncome(month: string, opts?: { includeRefund?: boolean }): number {
    const includeRefund = opts?.includeRefund ?? false
    return this.state.incomeRecords
      .filter(r => r.month === month)
      .filter(r => includeRefund || r.source !== 'refund')
      .reduce((s, r) => s + r.amount, 0)
  }

  /** 某月报销/退款金额 */
  monthRefundIncome(month: string): number {
    return this.state.incomeRecords
      .filter(r => r.month === month && r.source === 'refund')
      .reduce((s, r) => s + r.amount, 0)
  }

  /** 某月收入明细列表 */
  monthIncomeRecords(month: string): IncomeRecord[] {
    return this.state.incomeRecords.filter(r => r.month === month)
  }

  /** 年度收入合计（默认不含报销/退款，可选过滤来源） */
  yearIncome(year: number, source?: IncomeSource, opts?: { includeRefund?: boolean }): number {
    const prefix = String(year)
    const includeRefund = opts?.includeRefund ?? false
    return this.state.incomeRecords
      .filter(r => r.month.startsWith(prefix))
      .filter(r => includeRefund || r.source !== 'refund')
      .filter(r => !source || r.source === source)
      .reduce((s, r) => s + r.amount, 0)
  }

  /** 年度报销/退款金额合计 */
  yearRefundIncome(year: number): number {
    const prefix = String(year)
    return this.state.incomeRecords
      .filter(r => r.month.startsWith(prefix) && r.source === 'refund')
      .reduce((s, r) => s + r.amount, 0)
  }

  // ===== 自定义收入来源 =====
  /** 全部来源（预设+覆盖 + 自定义） */
  allIncomeSources(): { value: string; label: string; color: string; custom?: boolean }[] {
    return [
      ...INCOME_SOURCE_PRESETS.map(p => {
        const ov = this.state.incomeSourceOverrides.find(o => o.value === p.value)
        return {
          value: p.value,
          label: ov?.label ?? p.label,
          color: ov?.color ?? p.color,
          custom: false,
        }
      }),
      ...this.state.customIncomeSources.map(c => ({ value: c.id, label: c.label, color: c.color, custom: true })),
    ]
  }

  /** 来源元数据（label + color，合并 override） */
  sourceMeta(value: string): { label: string; color: string } {
    const preset = INCOME_SOURCE_PRESETS.find(p => p.value === value)
    if (preset) {
      const ov = this.state.incomeSourceOverrides.find(o => o.value === value)
      return { label: ov?.label ?? preset.label, color: ov?.color ?? preset.color }
    }
    const custom = this.state.customIncomeSources.find(c => c.id === value)
    if (custom) return { label: custom.label, color: custom.color }
    return { label: '其他', color: '#64748b' }
  }

  /** 更新预设来源覆盖 */
  async updateIncomeSourceOverride(value: string, patch: { label?: string; color?: string }): Promise<void> {
    const ov = await sourceOverridesApi.upsert({ value, label: patch.label, color: patch.color })
    const idx = this.state.incomeSourceOverrides.findIndex(o => o.value === value)
    if (idx >= 0) this.state.incomeSourceOverrides[idx] = ov
    else this.state.incomeSourceOverrides.push(ov)
  }

  /** 重置某个预设来源为默认 */
  async resetIncomeSourceOverride(value: string): Promise<void> {
    await sourceOverridesApi.reset(value)
    this.state.incomeSourceOverrides = this.state.incomeSourceOverrides.filter(o => o.value !== value)
  }

  async addCustomIncomeSource(label: string, color: string): Promise<CustomIncomeSource> {
    const payload: CustomSourceInput = {
      label: label.trim() || '自定义',
      color: color || '#a78bfa',
    }
    const s = await customSourcesApi.create(payload)
    this.state.customIncomeSources.push(s)
    return s
  }

  async deleteCustomIncomeSource(id: string): Promise<void> {
    await customSourcesApi.remove(id)
    this.state.customIncomeSources = this.state.customIncomeSources.filter(s => s.id !== id)
  }

  // 成就
  setAchievements(list: Achievement[]) {
    this.state.achievements = list
  }
  unlockAchievement(key: string) {
    const a = this.state.achievements.find(x => x.key === key)
    if (a && !a.unlocked) {
      a.unlocked = true
      a.unlockedAt = Date.now()
      a.progress = 100
    }
  }
}

export const store = new Store()
