import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react'
import { Eraser, Type, PenTool } from 'lucide-react'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
  signatoryName?: string
}

export default function SignaturePad({ onChange, signatoryName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState(signatoryName ?? '')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0d1730'
  }, [mode])

  function getCoords(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  function stopDrawing() {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas && hasDrawn) onChange(canvas.toDataURL('image/png'))
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange(null)
  }

  function handleTypedName(value: string) {
    setTypedName(value)
    if (!value.trim()) { onChange(null); return }
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 150
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0d1730'
    ctx.font = 'italic 48px "Brush Script MT", cursive, serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(value, 20, canvas.height / 2)
    onChange(canvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => { setMode('draw'); clearCanvas() }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'draw' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <PenTool size={14} /> Dessiner
        </button>
        <button type="button" onClick={() => { setMode('type'); onChange(null) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'type' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <Type size={14} /> Saisir mon nom
        </button>
      </div>

      {mode === 'draw' ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
          <canvas
            ref={canvasRef} width={500} height={180} className="w-full touch-none cursor-crosshair"
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          />
          {!hasDrawn && <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">Signez ici avec votre doigt ou votre souris</div>}
          <button type="button" onClick={clearCanvas} className="absolute top-2 right-2 bg-white shadow rounded-full p-1.5 text-gray-500 hover:text-red-600"><Eraser size={14} /></button>
        </div>
      ) : (
        <div>
          <input className="input-field text-2xl italic" style={{ fontFamily: '"Brush Script MT", cursive, serif' }} placeholder="Votre nom complet" value={typedName} onChange={(e) => handleTypedName(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Votre nom sera converti en signature manuscrite stylisée.</p>
        </div>
      )}
    </div>
  )
}
