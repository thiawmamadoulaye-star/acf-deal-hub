export interface ExtractedFinancials {
  fiscal_year?: number
  revenue?: number
  ebitda?: number
  net_income?: number
  total_debt?: number
  total_equity?: number
  cash_flow_operations?: number
}

const KEYWORD_MAP: { key: keyof ExtractedFinancials; patterns: RegExp[] }[] = [
  { key: 'revenue', patterns: [/chiffre d.affaires/i, /\bca\b/i, /revenue/i, /ventes nettes/i, /produits d.exploitation/i] },
  { key: 'ebitda', patterns: [/ebitda/i, /excédent brut d.exploitation/i, /\bebe\b/i] },
  { key: 'net_income', patterns: [/résultat net/i, /resultat net/i, /net income/i, /bénéfice net/i] },
  { key: 'total_debt', patterns: [/dette totale/i, /dettes financières/i, /endettement/i, /total debt/i, /emprunts/i] },
  { key: 'total_equity', patterns: [/capitaux propres/i, /fonds propres/i, /total equity/i, /shareholders.? equity/i] },
  { key: 'cash_flow_operations', patterns: [/flux de trésorerie/i, /cash.?flow/i, /trésorerie d.exploitation/i, /capacité d.autofinancement/i] },
]

export function parseAmount(raw: string): number | null {
  if (!raw) return null
  let cleaned = raw.replace(/\u00A0/g, ' ').replace(/FCFA|XOF|F\s?CFA/gi, '').trim()
  const frenchDecimalMatch = cleaned.match(/^-?[\d.\s]+,\d{1,2}$/)
  if (frenchDecimalMatch) {
    cleaned = cleaned.replace(/[.\s]/g, '').replace(',', '.')
  } else {
    cleaned = cleaned.replace(/[.\s,]/g, '')
  }
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

export function extractFromLines(lines: string[]): ExtractedFinancials {
  const result: ExtractedFinancials = {}
  for (const line of lines) {
    for (const { key, patterns } of KEYWORD_MAP) {
      if (result[key] !== undefined) continue
      if (patterns.some((p) => p.test(line))) {
        const numberMatches = line.match(/-?[\d][\d\s.,\u00A0]{3,}/g)
        if (numberMatches && numberMatches.length > 0) {
          const candidates = numberMatches.map((n) => parseAmount(n)).filter((n): n is number => n !== null && Math.abs(n) > 100)
          if (candidates.length > 0) result[key] = Math.max(...candidates.map(Math.abs))
        }
      }
    }
  }
  const currentYear = new Date().getFullYear()
  for (const line of lines) {
    const yearMatch = line.match(/\b(20[1-3]\d)\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10)
      if (year >= 2015 && year <= currentYear + 1) { result.fiscal_year = year; break }
    }
  }
  return result
}

export async function extractFromExcelFile(file: File): Promise<ExtractedFinancials> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const lines: string[] = []
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
    rows.forEach((row) => {
      const line = row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))).join('  ')
      if (line.trim()) lines.push(line)
    })
  })
  return extractFromLines(lines)
}

export async function extractFromPdfFile(file: File): Promise<ExtractedFinancials> {
  const pdfjsLib = await import('pdfjs-dist')
  // @ts-ignore
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const lines: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const rowsByY = new Map<number, string[]>()
    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5])
      const arr = rowsByY.get(y) ?? []
      arr.push(item.str)
      rowsByY.set(y, arr)
    })
    Array.from(rowsByY.entries()).sort((a, b) => b[0] - a[0]).forEach(([, texts]) => lines.push(texts.join(' ')))
  }
  return extractFromLines(lines)
}
