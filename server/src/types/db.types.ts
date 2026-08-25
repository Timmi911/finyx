import type {
  Bill, Reimbursement, Account, FamilyMember, User,
  Goal, IncomeRecord, CustomIncomeSource, IncomeSourceOverride,
} from './domain.types.js'

export interface Database {
  users: User[]
  bills: Bill[]
  reimbursements: Reimbursement[]
  accounts: Account[]
  families: FamilyMember[]
  goals: Goal[]
  incomeRecords: IncomeRecord[]
  customIncomeSources: CustomIncomeSource[]
  incomeSourceOverrides: IncomeSourceOverride[]
}

export const emptyDatabase: Database = {
  users: [],
  bills: [],
  reimbursements: [],
  accounts: [],
  families: [],
  goals: [],
  incomeRecords: [],
  customIncomeSources: [],
  incomeSourceOverrides: [],
}
