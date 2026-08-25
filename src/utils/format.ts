/** 金额格式化 */
export function fmtMoney(n: number, decimals = 2): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** 简短金额：1234 -> 1.2k */
export function fmtShort(n: number): string {
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

/** 当前月份字符串 YYYY-MM */
export function curMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 月份偏移 */
export function shiftMonth(month: string, delta: number): string {
  const d = new Date(month + '-01')
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 月份标签 08 -> 8月 */
export function monthLabel(month: string): string {
  return parseInt(month.slice(5)) + '月'
}

// ===== 图表坐标计算 =====
export interface ChartPoint { x: number; y: number; v: number }

export function lineChartPath(
  values: number[],
  opts: { width: number; height: number; padX: number; padY: number; max?: number },
): string {
  const { width, height, padX, padY } = opts
  const max = opts.max || Math.max(...values, 1)
  const stepX = (width - padX * 2) / Math.max(values.length - 1, 1)
  return values
    .map((v, i) => {
      const x = padX + i * stepX
      const y = height - padY - (v / max) * (height - padY * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function lineChartArea(
  values: number[],
  opts: { width: number; height: number; padX: number; padY: number; max?: number },
): string {
  const { width, height, padX, padY } = opts
  const max = opts.max || Math.max(...values, 1)
  const stepX = (width - padX * 2) / Math.max(values.length - 1, 1)
  let d = ''
  values.forEach((v, i) => {
    const x = padX + i * stepX
    const y = height - padY - (v / max) * (height - padY * 2)
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `
  })
  const lastX = padX + (values.length - 1) * stepX
  d += `L ${lastX.toFixed(1)} ${height - padY} L ${padX} ${height - padY} Z`
  return d
}

export function lineChartPoints(
  values: number[],
  opts: { width: number; height: number; padX: number; padY: number; max?: number },
): ChartPoint[] {
  const { width, height, padX, padY } = opts
  const max = opts.max || Math.max(...values, 1)
  const stepX = (width - padX * 2) / Math.max(values.length - 1, 1)
  return values.map((v, i) => {
    const x = padX + i * stepX
    const y = height - padY - (v / max) * (height - padY * 2)
    return { x, y, v }
  })
}
