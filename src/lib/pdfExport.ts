import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib'
import type { InvestmentMemo, Mandate } from '@/types/database'

const NAVY = rgb(0x15 / 255, 0x24 / 255, 0x47 / 255)
const GOLD = rgb(0xd4 / 255, 0x9a / 255, 0x1e / 255)
const GRAY = rgb(0.35, 0.38, 0.42)
const LIGHT_GRAY = rgb(0.55, 0.58, 0.62)

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

interface DrawContext { doc: PDFDocument; page: PDFPage; font: PDFFont; fontBold: PDFFont; y: number }

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > maxWidth && currentLine) { lines.push(currentLine); currentLine = word } else { currentLine = testLine }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

async function addNewPage(ctx: DrawContext): Promise<DrawContext> {
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawFooter(page, ctx.font)
  return { ...ctx, page, y: PAGE_HEIGHT - MARGIN }
}

function drawFooter(page: PDFPage, font: PDFFont) {
  page.drawText('ACF DEAL HUB — Advanced Capital & Finance — Document confidentiel', { x: MARGIN, y: 24, size: 7, font, color: LIGHT_GRAY })
}

async function ensureSpace(ctx: DrawContext, neededHeight: number): Promise<DrawContext> {
  if (ctx.y - neededHeight < MARGIN + 20) return addNewPage(ctx)
  return ctx
}

async function drawSectionTitle(ctx: DrawContext, title: string): Promise<DrawContext> {
  ctx = await ensureSpace(ctx, 40)
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 4, width: 4, height: 16, color: GOLD })
  ctx.page.drawText(title, { x: MARGIN + 12, y: ctx.y, size: 13, font: ctx.fontBold, color: NAVY })
  return { ...ctx, y: ctx.y - 24 }
}

async function drawParagraph(ctx: DrawContext, text: string): Promise<DrawContext> {
  const fontSize = 10
  const lineHeight = 15
  const lines = wrapText(text, ctx.font, fontSize, CONTENT_WIDTH)
  for (const line of lines) {
    ctx = await ensureSpace(ctx, lineHeight)
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: fontSize, font: ctx.font, color: GRAY })
    ctx = { ...ctx, y: ctx.y - lineHeight }
  }
  return { ...ctx, y: ctx.y - 10 }
}

async function drawKeyValueRow(ctx: DrawContext, label: string, value: string): Promise<DrawContext> {
  ctx = await ensureSpace(ctx, 16)
  ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: 9, font: ctx.fontBold, color: NAVY })
  ctx.page.drawText(value, { x: MARGIN + 160, y: ctx.y, size: 9, font: ctx.font, color: GRAY })
  return { ...ctx, y: ctx.y - 16 }
}

export async function exportMemoToPdf(memo: InvestmentMemo, mandate?: Mandate | null): Promise<void> {
  const doc = await PDFDocument.create()
  doc.setTitle(memo.title)
  doc.setAuthor('ACF — Advanced Capital & Finance')
  doc.setSubject("Mémorandum d'investissement")

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 90, width: PAGE_WIDTH, height: 90, color: NAVY })
  page.drawText('ACF DEAL HUB', { x: MARGIN, y: PAGE_HEIGHT - 40, size: 20, font: fontBold, color: GOLD })
  page.drawText('Advanced Capital & Finance — Dakar, Sénégal', { x: MARGIN, y: PAGE_HEIGHT - 58, size: 10, font, color: rgb(0.7, 0.75, 0.85) })
  page.drawText("MÉMORANDUM D'INVESTISSEMENT", { x: MARGIN, y: PAGE_HEIGHT - 76, size: 11, font: fontBold, color: rgb(1, 1, 1) })
  drawFooter(page, font)

  let ctx: DrawContext = { doc, page, font, fontBold, y: PAGE_HEIGHT - 120 }

  const titleLines = wrapText(memo.title, fontBold, 15, CONTENT_WIDTH)
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 15, font: ctx.fontBold, color: NAVY })
    ctx = { ...ctx, y: ctx.y - 20 }
  }
  ctx = { ...ctx, y: ctx.y - 6 }

  if (mandate) {
    ctx = await drawKeyValueRow(ctx, 'Référence mandat', mandate.reference)
    ctx = await drawKeyValueRow(ctx, 'Type de mandat', mandate.mandate_type)
    if (mandate.sector) ctx = await drawKeyValueRow(ctx, 'Secteur', mandate.sector)
  }
  ctx = await drawKeyValueRow(ctx, 'Statut du document', memo.status === 'final' ? 'Version finale' : memo.status === 'review' ? 'En revue' : 'Brouillon')
  ctx = await drawKeyValueRow(ctx, 'Date de génération', new Date().toLocaleDateString('fr-FR'))
  ctx = { ...ctx, y: ctx.y - 10 }

  if (memo.executive_summary) {
    ctx = await ensureSpace(ctx, 60)
    const boxY = ctx.y
    const summaryLines = wrapText(memo.executive_summary, ctx.font, 9.5, CONTENT_WIDTH - 24)
    const boxHeight = summaryLines.length * 14 + 30

    ctx.page.drawRectangle({ x: MARGIN, y: boxY - boxHeight + 14, width: CONTENT_WIDTH, height: boxHeight, color: rgb(0.945, 0.949, 0.976), borderColor: GOLD, borderWidth: 1 })
    ctx.page.drawText('RÉSUMÉ EXÉCUTIF', { x: MARGIN + 12, y: boxY, size: 9, font: ctx.fontBold, color: NAVY })
    let sy = boxY - 16
    for (const line of summaryLines) { ctx.page.drawText(line, { x: MARGIN + 12, y: sy, size: 9.5, font: ctx.font, color: GRAY }); sy -= 14 }
    ctx = { ...ctx, y: boxY - boxHeight - 10 }
  }

  const sections: { key: string; label: string }[] = [
    { key: 'context', label: 'Contexte de la mission' },
    { key: 'financial_summary', label: 'Analyse financière' },
    { key: 'risks', label: 'Analyse des risques' },
    { key: 'recommendation', label: "Recommandation d'ACF" },
  ]
  const content = (memo.content ?? {}) as Record<string, string>

  for (const section of sections) {
    const text = content[section.key]
    if (!text) continue
    ctx = await drawSectionTitle(ctx, section.label)
    ctx = await drawParagraph(ctx, text)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${memo.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
