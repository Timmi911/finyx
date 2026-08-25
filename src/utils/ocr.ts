import Tesseract from 'tesseract.js'
import type { BillKind } from '../types'

/** OCR 识别出的结构化字段 */
export interface OcrResult {
  raw: string
  merchant: string
  amount: number
  taxAmount: number
  invoiceNumber: string
  date: string
  kind: BillKind
  category: string
  confidence: number
}

type ProgressCb = (p: number, status: string) => void

/** 图片预处理：缩放 + 灰度 + 对比度增强，提升 OCR 准确率 */
async function preprocess(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 限制最大边 1600px，避免 Tesseract 处理过慢
      const maxSide = 1600
      let w = img.width
      let h = img.height
      if (w > maxSide || h > maxSide) {
        const ratio = Math.min(maxSide / w, maxSide / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h)
      const px = data.data
      for (let i = 0; i < px.length; i += 4) {
        // 灰度化
        const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
        // 提升对比度（系数 1.4，偏移 -20）
        let v = (gray - 128) * 1.4 + 128 - 20
        v = v < 0 ? 0 : v > 255 ? 255 : v
        px[i] = px[i + 1] = px[i + 2] = v
      }
      ctx.putImageData(data, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl) // 预处理失败用原图
    img.src = dataUrl
  })
}

/** 正则提取金额（支持 ¥、￥、小数） */
function matchAmount(text: string, ...labels: string[]): number {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:：￥¥]*\\s*([0-9]+(?:[,，.][0-9]{1,2})?)`, 'i')
    const m = text.match(re)
    if (m) {
      const n = parseFloat(m[1].replace(/[,，]/g, '.'))
      if (!isNaN(n) && n > 0) return n
    }
  }
  return 0
}

/** 提取发票号码（8-20 位数字串） */
function matchInvoiceNumber(text: string): string {
  // 优先匹配"发票号码"标签后跟的数字
  const labeled = text.match(/(?:发票号码|发票号|号码|No\.?)\s*[:：]?\s*([0-9]{8,20})/i)
  if (labeled) return labeled[1]
  // 兜底：任意连续 8+ 位数字串中选最长的
  const nums = text.match(/\b\d{10,20}\b/g)
  if (nums) return nums.sort((a, b) => b.length - a.length)[0]
  return ''
}

/** 提取日期（支持 yyyy-mm-dd / yyyy/mm/dd / yyyy年mm月dd日） */
function matchDate(text: string): string {
  const m = text.match(/(20\d{2})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})/)
  if (m) {
    const y = m[1]
    const mo = m[2].padStart(2, '0')
    const d = m[3].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return ''
}

/** 提取商户名（销售方/开票方后跟的公司名） */
function matchMerchant(text: string): string {
  // 销售方 / 开票方 / 销方 名称：xxx公司
  const patterns = [
    /(?:销售方|销方|开票方|收款方)\s*[:：]?\s*([\u4e00-\u9fa5（）()A-Za-z0-9·&]{2,40}(?:公司|中心|店|行|部|所|院|局|站|集团|工作室))/
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return m[1].trim()
  }
  // 兜底：找含"公司"的连续中文串
  const fallback = text.match(/([\u4e00-\u9fa5（）()A-Za-z0-9·&]{3,40}公司)/)
  if (fallback) return fallback[1].trim()
  return ''
}

/** 票据类型与分类推断 */
function inferKindAndCategory(text: string, merchant: string): { kind: BillKind, category: string } {
  const t = text + merchant
  // 关键词判定
  if (/(车票|机票|航班|高铁|火车|出租|滴滴|出行|地铁|公交|航空|铁路)/.test(t)) {
    return { kind: 'transport', category: '差旅' }
  }
  if (/(医院|诊所|药店|药品|门诊|住院|医疗)/.test(t)) {
    return { kind: 'medical', category: '医疗' }
  }
  if (/(电费|水费|燃气|物业|房租|宽带|电网|供水)/.test(t)) {
    return { kind: 'invoice', category: '居住' }
  }
  if (/(餐饮|餐厅|咖啡|茶|饭店|面馆|外卖|美团|饿了么|星巴克|肯德基|麦当劳)/.test(t)) {
    return { kind: 'receipt', category: '餐饮' }
  }
  if (/(办公用品|文具|耗材|打印|复印|办公)/.test(t)) {
    return { kind: 'invoice', category: '办公' }
  }
  // 发票特征词
  if (/(增值税|发票代码|发票号码|价税合计|税率)/.test(t)) {
    return { kind: 'invoice', category: '其他' }
  }
  return { kind: 'receipt', category: '其他' }
}

/**
 * 主入口：识别图片并提取结构化票据字段
 * @param dataUrl 图片 data:URL 或 blob URL
 * @param onProgress 进度回调 (0-100, status)
 */
export async function recognizeBill(
  dataUrl: string,
  onProgress?: ProgressCb
): Promise<OcrResult> {
  // 1. 预处理
  onProgress?.(2, '预处理图片')
  const processed = await preprocess(dataUrl)

  // 2. Tesseract 识别（中文 + 英文/数字）
  onProgress?.(8, '加载识别引擎')
  const result = await Tesseract.recognize(
    processed,
    'chi_sim+eng',
    {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          // 进度从 8 到 92
          const p = 8 + Math.floor(m.progress * 84)
          onProgress?.(p, '识别文本')
        } else if (m.status === 'loading tesseract core') {
          onProgress?.(4, '加载核心')
        } else if (m.status === 'initializing tesseract') {
          onProgress?.(6, '初始化')
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(10, '加载中文模型')
        }
      },
    }
  )

  const raw: string = (result?.data?.text || '').trim()
  const confidence = result?.data?.confidence || 0
  onProgress?.(95, '提取字段')

  // 3. 正则提取关键字段
  const merchant = matchMerchant(raw)
  const amount = matchAmount(raw, '价税合计', '合计', '金额', '小写', '总计', '实付', '应付')
  const taxAmount = matchAmount(raw, '税额', '税')
  const invoiceNumber = matchInvoiceNumber(raw)
  const date = matchDate(raw)
  const { kind, category } = inferKindAndCategory(raw, merchant)

  onProgress?.(100, '完成')

  return {
    raw,
    merchant,
    amount,
    taxAmount,
    invoiceNumber,
    date,
    kind,
    category,
    confidence,
  }
}
