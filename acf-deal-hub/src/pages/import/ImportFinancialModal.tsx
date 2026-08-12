import { useState, ChangeEvent } from 'react'
import { X, FileSpreadsheet, FileText, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { extractFromExcelFile, extractFromPdfFile, ExtractedFinancials } from './financialExtraction'
import FinancialAnalysisFormModal from '../financial/FinancialAnalysisFormModal'

interface Props { mandateId: string; onClose: () => void; onCreated: () => void }

export default function ImportFinancialModal({ mandateId, onClose, onCreated }: Props) {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedFinancials | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')

  async function handleExcelUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError(null)
    try {
      const result = await extractFromExcelFile(file)
      finalizeExtraction(result, file.name)
    } catch (err) {
      setError("Impossible d'analyser ce fichier Excel : " + (err as Error).message)
    } finally { setParsing(false) }
  }

  async function handlePdfUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError(null)
    try {
      const result = await extractFromPdfFile(file)
      finalizeExtraction(result, file.name)
    } catch (err) {
      setError("Impossible d'analyser ce fichier PDF : " + (err as Error).message)
    } finally { setParsing(false) }
  }

  function finalizeExtraction(result: ExtractedFinancials, filename: string) {
    const found = Object.keys(result).filter((k) => k !== 'fiscal_year').length
    setExtracted(result)
    setSourceLabel(`${filename} — ${found} champ(s) financier(s) détecté(s) automatiquement`)
  }

  if (extracted) {
    return <FinancialAnalysisFormModal mandateId={mandateId} initialValues={extracted} importSourceLabel={sourceLabel} onClose={onClose} onCreated={onCreated} />
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Sparkles size={18} className="text-gold-500" /> Importer des états financiers</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Déposez un fichier Excel ou PDF (compte de résultat, bilan). Le système tentera de détecter automatiquement les principaux indicateurs.
          <strong> Vous validerez chaque valeur avant l'enregistrement.</strong>
        </p>

        {parsing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
            <Loader2 size={32} className="animate-spin text-navy-700" />
            <span className="text-sm">Analyse du document en cours…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer hover:border-navy-400 hover:bg-navy-50 transition-colors">
              <FileSpreadsheet size={32} className="text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Fichier Excel</span>
              <span className="text-xs text-gray-400">.xlsx / .xls</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer hover:border-navy-400 hover:bg-navy-50 transition-colors">
              <FileText size={32} className="text-red-500" />
              <span className="text-sm font-medium text-gray-700">Fichier PDF</span>
              <span className="text-xs text-gray-400">.pdf</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mt-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700 mt-5">
          L'extraction est basée sur la reconnaissance de mots-clés financiers et peut nécessiter des ajustements manuels.
        </div>
      </div>
    </div>
  )
}
