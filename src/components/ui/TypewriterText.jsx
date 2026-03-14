import { useState, useEffect } from 'react'

// Frases que rotan en el lado de la imagen del login/registro
const DEFAULT_PHRASES = [
  'Capture every move.',
  'Play on, always.',
  'Tu partida, siempre contigo.',
  'Reconoce. Guarda. Retransmite.',
]

export default function TypewriterText({
  phrases = DEFAULT_PHRASES,
  typingSpeed = 60,      // ms por carácter al escribir
  deletingSpeed = 35,    // ms por carácter al borrar
  pauseAfter = 2200,     // ms de pausa con texto completo
  className = '',
}) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]

    if (isPaused) {
      const t = setTimeout(() => {
        setIsPaused(false)
        setIsDeleting(true)
      }, pauseAfter)
      return () => clearTimeout(t)
    }

    if (!isDeleting) {
      // Escribiendo
      if (displayed.length < current.length) {
        const t = setTimeout(
          () => setDisplayed(current.slice(0, displayed.length + 1)),
          typingSpeed
        )
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setIsPaused(true), 0)
        return () => clearTimeout(t)
      }
    } else {
      // Borrando
      if (displayed.length > 0) {
        const t = setTimeout(
          () => setDisplayed(current.slice(0, displayed.length - 1)),
          deletingSpeed
        )
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => {
          setIsDeleting(false)
          setPhraseIdx(i => (i + 1) % phrases.length)
        }, 0)
        return () => clearTimeout(t)
      }
    }
  }, [displayed, isDeleting, isPaused, phraseIdx, phrases, typingSpeed, deletingSpeed, pauseAfter])

  return (
    <span className={className}>
      {displayed}
      {/* Cursor parpadeante */}
      <span className="inline-block w-[2px] h-[1.1em] bg-cr-primary ml-0.5 align-middle animate-blink" />
    </span>
  )
}
