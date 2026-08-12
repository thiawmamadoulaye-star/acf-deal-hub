import type { Mandate, FinancialAnalysis, RiskAssessment, Deal } from '@/types/database'

interface GenerateInput {
  mandate: Mandate
  financialAnalysis: FinancialAnalysis | null | undefined
  riskAssessment: RiskAssessment | null | undefined
  deals: Deal[]
}

const mandateTypeLabels: Record<string, string> = {
  debt_raising: 'une levée de dette', equity_raising: 'une levée de fonds propres',
  project_finance: 'un financement de projet (Project Finance)', restructuring: 'une opération de restructuration',
  ma_advisory: 'une opération de fusion-acquisition', strategy_advisory: 'une mission de conseil en stratégie', other: 'une mission de conseil',
}

function formatFCFA(value: number | null | undefined) {
  if (!value) return 'non communiqué'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} milliards de FCFA`
  return `${(value / 1_000_000).toFixed(0)} millions de FCFA`
}

export function generateMemoContent({ mandate, financialAnalysis, riskAssessment, deals }: GenerateInput) {
  const client = (mandate as any).client?.name ?? 'le client'
  const typeLabel = mandateTypeLabels[mandate.mandate_type] ?? 'une mission de conseil financier'
  const totalDealValue = deals.reduce((s, d) => s + (d.deal_value ?? 0), 0)

  const context = `${client} a mandaté ACF (Advanced Capital & Finance) pour ${typeLabel} d'un montant ` +
    `recherché de ${formatFCFA(mandate.amount_requested)}${mandate.sector ? ` dans le secteur ${mandate.sector}` : ''}. ` +
    `Le mandat porte la référence ${mandate.reference} et vise un closing au ` +
    `${mandate.target_close_date ? new Date(mandate.target_close_date).toLocaleDateString('fr-FR') : 'calendrier à confirmer'}.` +
    (mandate.description ? `\n\nDescription de l'opération : ${mandate.description}` : '')

  let financial_summary: string
  if (financialAnalysis) {
    const fa = financialAnalysis
    const margin = fa.ebitda && fa.revenue ? ((fa.ebitda / fa.revenue) * 100).toFixed(1) : null
    financial_summary =
      `Sur l'exercice ${fa.fiscal_year}, la société a réalisé un chiffre d'affaires de ` +
      `${formatFCFA(fa.revenue)} pour un EBITDA de ${formatFCFA(fa.ebitda)}` +
      `${margin ? ` (marge EBITDA de ${margin}%)` : ''}. ` +
      `Le résultat net s'élève à ${formatFCFA(fa.net_income)}. ` +
      `La structure bilancielle fait apparaître une dette totale de ${formatFCFA(fa.total_debt)} ` +
      `pour des capitaux propres de ${formatFCFA(fa.total_equity)}.\n\n` +
      `Ratios clés : DSCR de ${fa.dscr?.toFixed(2) ?? 'non calculé'}, ` +
      `levier financier (Dette/EBITDA) de ${fa.leverage_ratio?.toFixed(2) ?? 'non calculé'}x, ` +
      `ROE de ${fa.roe?.toFixed(1) ?? 'non calculé'}% et ROA de ${fa.roa?.toFixed(1) ?? 'non calculé'}%.` +
      (fa.dscr && fa.dscr < 1.2 ? '\n\n⚠ Point de vigilance : le DSCR est en-deçà du seuil bancaire usuel de 1.2x.' : '') +
      (fa.leverage_ratio && fa.leverage_ratio > 3.5 ? "\n\n⚠ Le niveau d'endettement (>3.5x EBITDA) est élevé." : '')
    financial_summary += '\n\n[Analyse à compléter par l\'analyste sur la base des états financiers audités.]'
  } else {
    financial_summary = "Aucune analyse financière n'a encore été enregistrée pour ce mandat."
  }

  let risks: string
  if (riskAssessment) {
    const scores = [
      { label: 'crédit', value: riskAssessment.credit_risk_score },
      { label: 'opérationnel', value: riskAssessment.operational_risk_score },
      { label: 'réglementaire', value: riskAssessment.regulatory_risk_score },
      { label: 'pays', value: riskAssessment.country_risk_score },
    ].filter((s) => s.value !== null) as { label: string; value: number }[]

    const avg = scores.length ? scores.reduce((a, b) => a + b.value, 0) / scores.length : 0
    const level = avg <= 30 ? 'faible' : avg <= 60 ? 'modéré' : 'élevé'
    const highest = scores.sort((a, b) => b.value - a.value)[0]

    risks = `Le niveau de risque global de l'opération est jugé ${level} (score moyen de ${avg.toFixed(0)}/100). ` +
      scores.map((s) => `Risque ${s.label} : ${s.value}/100.`).join(' ') +
      (highest ? `\n\nLe risque ${highest.label} constitue le point d'attention principal.` : '') +
      (riskAssessment.comments ? `\n\nCommentaire de l'analyste : ${riskAssessment.comments}` : '')
  } else {
    risks = "Aucune notation de risque n'a encore été réalisée pour ce mandat."
  }

  const recommendation = `Sur la base des éléments disponibles, ACF recommande de ` +
    `${riskAssessment && financialAnalysis ? "poursuivre la structuration sous réserve des points de vigilance identifiés" : "compléter l'analyse financière et la notation des risques"}. ` +
    (totalDealValue > 0 ? `Le pipeline associé représente une valeur totale de ${formatFCFA(totalDealValue)} sur ${deals.length} deal(s).` : '') +
    "\n\n[Section à valider par le Manager avant transmission au Comité d'Investissement.]"

  const executive_summary = `${client} sollicite ${typeLabel} de ${formatFCFA(mandate.amount_requested)}` +
    `${mandate.sector ? ` (secteur : ${mandate.sector})` : ''}. ` +
    `${riskAssessment ? `Risque global jugé ${riskAssessment.overall_risk_level ?? 'à évaluer'}. ` : ''}` +
    `Mandat suivi sous la référence ${mandate.reference}.`

  return { executive_summary, context, financial_summary, risks, recommendation }
}
