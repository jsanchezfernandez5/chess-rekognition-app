import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function TypewriterText({
    phrases: externalPhrases,
    typingSpeed = 60,
    deletingSpeed = 35,
    pauseAfter = 2200,
    className = '',
}) {
    const { t } = useTranslation()
    const defaultPhrases = t('typewriter.phrases', { returnObjects: true })
    const phrases = externalPhrases || defaultPhrases

    const [displayed, setDisplayed] = useState('')
    const [phraseIdx, setPhraseIdx] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isPaused, setIsPaused] = useState(false)

    useEffect(() => {
        const current = phrases[phraseIdx]

        if (isPaused) {
            const timer = setTimeout(() => {
                setIsPaused(false)
                setIsDeleting(true)
            }, pauseAfter)
            return () => clearTimeout(timer)
        }

        if (!isDeleting) {
            if (displayed.length < current.length) {
                const timer = setTimeout(
                    () => setDisplayed(current.slice(0, displayed.length + 1)),
                    typingSpeed
                )
                return () => clearTimeout(timer)
            } else {
                const timer = setTimeout(() => setIsPaused(true), 0)
                return () => clearTimeout(timer)
            }
        } else {
            if (displayed.length > 0) {
                const timer = setTimeout(
                    () => setDisplayed(current.slice(0, displayed.length - 1)),
                    deletingSpeed
                )
                return () => clearTimeout(timer)
            } else {
                const timer = setTimeout(() => {
                    setIsDeleting(false)
                    setPhraseIdx(i => (i + 1) % phrases.length)
                }, 0)
                return () => clearTimeout(timer)
            }
        }
    }, [displayed, isDeleting, isPaused, phraseIdx, phrases, typingSpeed, deletingSpeed, pauseAfter])

    return (
        <span className={className}>
            {displayed}
            <span className="inline-block w-[2px] h-[1.1em] bg-cr-primary ml-0.5 align-middle animate-blink" />
        </span>
    )
}
