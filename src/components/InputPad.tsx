import { useEffect, useRef, useState } from 'react'
import { globalDictionary } from '../core/vibrationDictionary'
import { vibrate } from '../core/vibration'
import {
  INPUT_DOT_MAX_MS,
  INPUT_PATTERN_END_DELAY_MS,
  INPUT_CONTINUOUS_VIBRATE_MS,
  INPUT_CONTINUOUS_GAP_MS,
} from '../core/config'

type Props = {
  onWordRecognized: (word: string, pattern: string) => void
  onUnknownPattern?: (pattern: string) => void
  onPatternStart?: () => void
}

export function InputPad({
  onWordRecognized,
  onUnknownPattern,
  onPatternStart,
}: Props) {
  const [pattern, setPattern] = useState<string>('')
  const pressStartRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const isPressingRef = useRef<boolean>(false)

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

  const startContinuousVibration = async () => {
    // Loop getaran pendek selama tombol masih ditekan
    while (isPressingRef.current) {
      await vibrate(INPUT_CONTINUOUS_VIBRATE_MS)
      if (!isPressingRef.current) break
      await sleep(INPUT_CONTINUOUS_GAP_MS)
    }
  }

  const handlePressStart = () => {
    pressStartRef.current = performance.now()
    isPressingRef.current = true
    // Saat mulai ketukan baru, batalkan timer akhir pola sebelumnya
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Jika ini adalah awal pola baru (belum ada simbol dalam pattern),
    // beritahu parent supaya bisa mulai animasi loading dari awal.
    if (!pattern && onPatternStart) {
      onPatternStart()
    }
    startContinuousVibration()
  }

  const handlePressEnd = () => {
    const now = performance.now()
    if (pressStartRef.current == null) return

    // hentikan loop getaran
    isPressingRef.current = false

    const duration = now - pressStartRef.current
    let symbol: string | null = null

    // < INPUT_DOT_MAX_MS = dot, >= INPUT_DOT_MAX_MS = dash
    if (duration > 0 && duration < INPUT_DOT_MAX_MS) {
      symbol = '.'
    } else if (duration >= INPUT_DOT_MAX_MS) {
      symbol = '-'
    }

    if (!symbol) return

    const nextPattern = pattern + symbol
    setPattern(nextPattern)

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      finalizePattern(nextPattern)
    }, INPUT_PATTERN_END_DELAY_MS)
  }

  const finalizePattern = (finalPattern: string) => {
    if (!finalPattern) return

    const word = globalDictionary[finalPattern]

    if (word) {
      onWordRecognized(word, finalPattern)
    } else if (onUnknownPattern) {
      onUnknownPattern(finalPattern)
    }

    setPattern('')
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const touchStart = (event: React.TouchEvent) => {
    event.preventDefault()
    handlePressStart()
  }

  const touchEnd = (event: React.TouchEvent) => {
    event.preventDefault()
    handlePressEnd()
  }

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={-1}
        inputMode="none"
        className="relative w-64 h-64 rounded-full bg-slate-600 active:bg-slate-500 border-4 border-slate-500 focus:outline-none shadow-2xl select-none touch-none transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.02] flex items-center justify-center overflow-hidden"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={touchStart}
        onTouchEnd={touchEnd}
        onFocus={(e) => e.target.blur()}
      >
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white/50">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold tracking-wider text-white/70">
            SENTUH DI SINI
          </span>
        </div>
        <span className="sr-only">Input getaran (tekan &amp; tahan)</span>
      </div>
    </div>
  )
}

