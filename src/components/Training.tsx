import { useEffect, useRef, useState } from 'react'
import { trainingLevels, globalDictionary, wordToPattern } from '../core/vibrationDictionary'
import {
  vibrate,
  vibrateForWord,
} from '../core/vibration'
import {
  INPUT_DOT_MAX_MS,
  INPUT_PATTERN_END_DELAY_MS,
  INPUT_CONTINUOUS_VIBRATE_MS,
  INPUT_CONTINUOUS_GAP_MS,
} from '../core/config'

type Mode = 'belajar' | 'kuis'
type Phase =
  | 'idle'
  | 'playing'
  | 'waiting'
  | 'input'
  | 'feedback'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Alur haptic untuk tunanetra + tunarungu:
 *
 * MODE BELAJAR (mengenal pola):
 *   sinyal "mulai" → pola kata → sinyal "selesaiKata" → tunggu input
 *   Pengguna tekan lingkaran:
 *     - Getar pendek (tekan sebentar) = ulangi kata yang sama
 *     - Getar panjang (tekan lama)   = lanjut ke kata berikutnya
 *   Setelah semua kata habis → sinyal "levelSelesai"
 *
 * MODE KUIS (menguji pemahaman):
 *   sinyal "mulai" → pola kata → sinyal "giliranmu" → tunggu input pola
 *   Pengguna membuat pola getaran (tekan pendek = dot, tahan lama = dash)
 *   Setelah selesai input:
 *     - Benar → sinyal "benar" → pola kata ulang → sinyal "selesaiKata"
 *     - Salah → sinyal "salah" → pola kata yang benar → sinyal "selesaiKata"
 *   Otomatis lanjut ke kata berikutnya
 */
export function Training() {
  const [levelIndex, setLevelIndex] = useState(0)
  const [mode, setMode] = useState<Mode>('belajar')
  const [wordIndex, setWordIndex] = useState(0)
  const [quizWord, setQuizWord] = useState<string | null>(null) // Pindah ke sini
  const [phase, setPhase] = useState<Phase>('idle')
  const [statusText, setStatusText] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const cancelRef = useRef(false)
  const pressStartRef = useRef<number | null>(null)
  const isPressingRef = useRef(false)

  const level = trainingLevels[levelIndex]
  const words = level?.words ?? []
  
  // Kata yang sedang aktif (belajar = sesuai index, kuis = kata random)
  const activeWord = mode === 'belajar' ? (words[wordIndex] ?? null) : quizWord
  const activePattern = activeWord ? wordToPattern[activeWord] ?? '' : ''
  const activeWordIndex = activeWord ? words.indexOf(activeWord) : 0

  // --- helpers ---
  const isCancelled = () => cancelRef.current

  const playWordBelajar = async (word: string) => {
    // Mode belajar: HANYA putar pola kata, tanpa sinyal tambahan (agar tidak rancu)
    await vibrateForWord(word)
  }

  // --- MODE BELAJAR ---
  const runBelajar = async (idx: number) => {
    const w = words[idx]
    if (!w) return
    setPhase('playing')
    setStatusText(`Memutar pola: ${w} (${wordToPattern[w]})`)

    await playWordBelajar(w)
    if (isCancelled()) return

    setPhase('waiting')
    setStatusText(`Menunggu pengguna — pendek: ulangi "${w}", panjang: lanjut`)
  }

  useEffect(() => {
    if (mode !== 'belajar') return
    cancelRef.current = false
    void runBelajar(wordIndex)
    return () => { cancelRef.current = true }
  }, [mode, wordIndex, levelIndex])

  const handleBelajarPress = () => {
    if (phase !== 'waiting') return
    pressStartRef.current = performance.now()
    // TIDAK pakai continuous vibration di mode belajar (agar tidak rancu dengan pola kata)
  }

  const handleBelajarRelease = () => {
    if (pressStartRef.current == null || phase !== 'waiting') return
    const duration = performance.now() - pressStartRef.current
    pressStartRef.current = null

    // Tekan sebentar = ulangi kata yang sama
    if (duration > 0 && duration < INPUT_DOT_MAX_MS) {
      void runBelajar(wordIndex)
      return
    }
    
    // Tekan lama = lanjut ke kata berikutnya
    if (duration >= INPUT_DOT_MAX_MS) {
      const next = wordIndex + 1
      if (next >= words.length) {
        // Semua kata di level ini sudah selesai
        setPhase('feedback')
        setStatusText('Level selesai!')
        void (async () => {
          await sleep(1500)
          if (!isCancelled()) {
            setWordIndex(0)
          }
        })()
      } else {
        setWordIndex(next)
      }
    }
  }

  // --- MODE KUIS ---
  const [inputPattern, setInputPattern] = useState('')
  const inputTimeoutRef = useRef<number | null>(null)

  const pickRandomWord = () => words[Math.floor(Math.random() * words.length)]

  const runKuis = async (word: string) => {
    // Mode kuis: Langsung masuk ke fase input tanpa memberikan contoh getaran
    setPhase('input')
    setInputPattern('')
    setStatusText(`Giliran pengguna membuat pola untuk: ${word}`)
  }

  const startQuiz = () => {
    const w = pickRandomWord()
    setQuizWord(w)
    void runKuis(w)
  }

  useEffect(() => {
    if (mode !== 'kuis') return
    cancelRef.current = false
    startQuiz()
    return () => {
      cancelRef.current = true
      if (inputTimeoutRef.current) window.clearTimeout(inputTimeoutRef.current)
    }
  }, [mode, levelIndex])

  const handleKuisPress = () => {
    if (phase !== 'input') return
    pressStartRef.current = performance.now()
    isPressingRef.current = true
    if (inputTimeoutRef.current) {
      window.clearTimeout(inputTimeoutRef.current)
      inputTimeoutRef.current = null
    }
    void startContinuousVibration()
  }

  const handleKuisRelease = () => {
    isPressingRef.current = false
    if (pressStartRef.current == null || phase !== 'input') return
    const duration = performance.now() - pressStartRef.current
    pressStartRef.current = null

    let symbol: string | null = null
    if (duration > 0 && duration < INPUT_DOT_MAX_MS) symbol = '.'
    else if (duration >= INPUT_DOT_MAX_MS) symbol = '-'
    if (!symbol) return

    const next = inputPattern + symbol
    setInputPattern(next)

    if (inputTimeoutRef.current) window.clearTimeout(inputTimeoutRef.current)
    inputTimeoutRef.current = window.setTimeout(() => {
      void finalizeKuis(next)
    }, INPUT_PATTERN_END_DELAY_MS)
  }

  const finalizeKuis = async (finalPattern: string) => {
    if (!quizWord) return
    setPhase('feedback')
    const recognized = globalDictionary[finalPattern]
    const correct = recognized === quizWord

    if (correct) {
      setStatusText(`BENAR! Pola "${finalPattern}" = ${quizWord}`)
    } else {
      const expectedPattern = wordToPattern[quizWord] ?? ''
      setStatusText(
        `SALAH. Pola "${finalPattern}" ≠ ${quizWord}. Yang benar: "${expectedPattern}"`,
      )
    }

    await sleep(1500) // Beri waktu pendamping membaca status di layar

    if (isCancelled()) return
    startQuiz()
  }

  // --- Continuous vibration saat tombol ditekan (KRITIS: agar pengguna tahu jari mereka menyentuh) ---
  const startContinuousVibration = async () => {
    while (isPressingRef.current) {
      await vibrate(INPUT_CONTINUOUS_VIBRATE_MS)
      if (!isPressingRef.current) break
      await sleep(INPUT_CONTINUOUS_GAP_MS)
    }
  }

  const handleSelectWord = (word: string, idx: number) => {
    cancelRef.current = true
    if (inputTimeoutRef.current) window.clearTimeout(inputTimeoutRef.current)
    
    setTimeout(() => {
      cancelRef.current = false
      setInputPattern('')
      
      if (mode === 'belajar') {
        setWordIndex(idx)
        // useEffect mode === 'belajar' akan otomatis menjalankan runBelajar
      } else {
        setQuizWord(word)
        void runKuis(word)
      }
    }, 50)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      cancelRef.current = true
      if (inputTimeoutRef.current) window.clearTimeout(inputTimeoutRef.current)
    }
  }, [])

  // --- Press handlers (gabung belajar / kuis) ---
  const handlePress = () => {
    if (mode === 'belajar') handleBelajarPress()
    else handleKuisPress()
  }
  const handleRelease = () => {
    if (mode === 'belajar') handleBelajarRelease()
    else handleKuisRelease()
  }

  return (
    <main className="flex-1 flex flex-col pt-3 pb-6 gap-3 min-h-0 w-full max-w-md mx-auto">
      {/* Area Atas — bisa di-scroll (info & kontrol untuk pendamping) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 flex flex-col gap-4">
        
        {/* Info Pendamping (Collapsible) */}
        <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl overflow-hidden shrink-0 transition-all duration-300">
          <button 
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-blue-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-blue-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-blue-300">Peran Pendamping</h3>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor" 
              className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${showGuide ? 'rotate-180' : ''}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className={`px-3 pb-3 pt-0 transition-all duration-300 ${showGuide ? 'block' : 'hidden'}`}>
            <p className="text-xs text-blue-100/80 leading-relaxed ml-8">
              Mode ini dirancang untuk digunakan bersama pendamping. Pendamping memandu tangan pengguna ke lingkaran, memilih level/kata, dan memantau layar untuk memberikan feedback fisik (seperti tepukan di bahu) jika diperlukan.
            </p>
          </div>
        </div>

        {/* Header & Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'belajar') return
                  cancelRef.current = true
                  setTimeout(() => { setMode('belajar'); setWordIndex(0); setPhase('idle') }, 50)
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  mode === 'belajar' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Belajar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'kuis') return
                  cancelRef.current = true
                  setTimeout(() => { setMode('kuis'); setQuizWord(null); setInputPattern(''); setPhase('idle') }, 50)
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  mode === 'kuis' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Kuis
              </button>
            </div>

            {/* Level Selector */}
            <select
              value={levelIndex}
              onChange={(e) => {
                cancelRef.current = true
                const i = parseInt(e.target.value, 10)
                setTimeout(() => { setLevelIndex(i); setWordIndex(0); setQuizWord(null); setInputPattern(''); setPhase('idle') }, 50)
              }}
              className="flex-1 bg-slate-900/80 border border-slate-800 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {trainingLevels.map((lvl, i) => (
                <option key={i} value={i}>{lvl.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stage Utama (Fokus) */}
        <div className="flex flex-col items-center justify-center py-4 px-4 relative border border-slate-700/30 rounded-xl my-0 shadow-sm shrink-0 min-h-[140px]">
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'belajar' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {mode === 'belajar' ? 'Belajar' : 'Kuis'}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-semibold mb-1 mt-4 uppercase tracking-widest">
            Target Kata ({activeWordIndex + 1}/{words.length})
          </div>
          
          {activeWord ? (
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-black text-white tracking-widest">{activeWord}</div>
              <div className={`text-xl font-mono font-bold px-3 py-0.5 rounded border ${
                mode === 'belajar' 
                  ? 'text-emerald-400 border-emerald-800/60' 
                  : 'text-amber-400 border-amber-800/60'
              }`}>
                {activePattern}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic text-sm py-2">Menyiapkan...</div>
          )}

          <div className={`text-xs mt-2 font-medium text-center min-h-[1.25rem] transition-colors ${
            phase === 'feedback' && statusText.includes('BENAR') ? 'text-emerald-400' : 
            phase === 'feedback' && statusText.includes('SALAH') ? 'text-red-400' : 'text-slate-400'
          }`}>
            {statusText || '...'}
          </div>
        </div>

          {/* Kamus Level (Simple List) & Petunjuk Aksi dalam satu baris fleksibel */}
        <div className="mt-auto">
          {mode === 'belajar' && (
            <div className="text-xs text-slate-400 mb-2 italic">
              💡 <strong>Tips:</strong> Klik salah satu kata di bawah ini untuk langsung memutar getarannya.
            </div>
          )}
          
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-800 pb-1.5 flex justify-between">
            <span>Kamus & Petunjuk</span>
            <span className="text-slate-600">Aksi Lingkaran</span>
          </div>
          
          <div className="flex justify-between items-start gap-3">
            
            {/* Daftar Kata Kamus (Kiri) */}
            <div className="flex flex-wrap gap-1.5 flex-1">
              {trainingLevels[levelIndex].words.map((w, idx) => {
                const isActive = mode === 'belajar' ? wordIndex === idx : quizWord === w;
                return (
                  <button 
                    key={w}
                    type="button"
                    onClick={() => handleSelectWord(w, idx)}
                    className={`rounded border px-2.5 py-1.5 flex items-center gap-1.5 transition-all ${
                      isActive 
                        ? (mode === 'belajar' 
                            ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' 
                            : 'bg-amber-900/30 border-amber-700/50 text-amber-300')
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-medium">{w}</span>
                    <span className="font-mono font-bold tracking-widest text-xs opacity-70">{wordToPattern[w]}</span>
                  </button>
                )
              })}
            </div>

            {/* Petunjuk Aksi LINGKARAN (Kanan) */}
            <div className="flex gap-1.5 shrink-0 items-center">
              {mode === 'belajar' ? (
                <>
                  <div className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">
                    Sebentar = <strong className="text-white">Ulangi</strong>
                  </div>
                  <div className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">
                    Lama = <strong className="text-white">Lanjut</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">
                    Sebentar = <strong className="text-white">Titik (·)</strong>
                  </div>
                  <div className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">
                    Lama = <strong className="text-white">Garis (-)</strong>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* LINGKARAN BESAR — area interaksi */}
      <div className="shrink-0 flex flex-col items-center px-4 pt-1 pb-6">
        <div
          role="button"
          tabIndex={-1}
          inputMode="none"
          className={`relative w-64 h-64 shrink-0 rounded-full flex items-center justify-center touch-none select-none shadow-2xl transition-all duration-300 ease-in-out border-4 overflow-hidden ${
            phase === 'playing' || phase === 'feedback'
              ? 'bg-slate-800 border-slate-700 opacity-70 scale-95'
              : phase === 'input'
                ? 'bg-amber-700 active:bg-amber-600 border-amber-500 shadow-amber-900/50 cursor-pointer hover:scale-[1.02]'
                : 'bg-slate-600 active:bg-slate-500 border-slate-500 cursor-pointer hover:scale-[1.02]'
          }`}
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handlePress()
          }}
          onTouchEnd={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleRelease()
          }}
          onFocus={(e) => e.target.blur()}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 ${phase === 'playing' || phase === 'feedback' ? 'text-slate-600' : 'text-white/50'}`}>
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
            <span className={`text-sm font-semibold tracking-wider ${phase === 'playing' || phase === 'feedback' ? 'text-slate-500' : 'text-white/70'}`}>
              {phase === 'playing' || phase === 'feedback' ? 'TUNGGU...' : 'SENTUH DI SINI'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
