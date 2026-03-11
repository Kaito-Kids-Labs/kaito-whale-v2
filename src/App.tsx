import { useRef, useState, useEffect } from 'react'
import { InputPad } from './components/InputPad'
import { MessageList } from './components/MessageList'
import { useWebSocket } from './core/useWebSocket'
import { speak } from './core/speech'
import { vibrateForWord } from './core/vibration'

function App() {
  const [myId, setMyId] = useState<string>('')
  const [peerId, setPeerId] = useState<string>('')
  const { messages, sendMessage } = useWebSocket(myId, peerId)
  const [lastWord, setLastWord] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const translateTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setRuntimeError(event.message ?? 'Unknown error')
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      setRuntimeError(String(event.reason) ?? 'Promise rejection')
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      if (translateTimerRef.current) {
        window.clearTimeout(translateTimerRef.current)
      }
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  const handleWordRecognized = (word: string, pattern: string) => {
    sendMessage(word)
    // Tampilkan efek \"loading\" sebentar sebelum menampilkan terjemahan
    if (translateTimerRef.current) {
      window.clearTimeout(translateTimerRef.current)
    }
    setIsTranslating(true)
    setLastWord(null)
    translateTimerRef.current = window.setTimeout(() => {
      setLastWord(word)
      setIsTranslating(false)
      if (soundOn) {
        void speak(word)
      }
    }, 350)
    console.log('Pattern:', pattern, 'Word:', word)
  }

  const handleUnknownPattern = (pattern: string) => {
    // Pola tidak ada di kamus: tampilkan pesan khusus, tapi jangan kirim ke server
    if (translateTimerRef.current) {
      window.clearTimeout(translateTimerRef.current)
    }
    setIsTranslating(true)
    setLastWord(null)
    translateTimerRef.current = window.setTimeout(() => {
      const msg = 'Kata tidak masuk ke dictionary'
      setLastWord(msg)
      setIsTranslating(false)
      if (soundOn) {
        void speak(msg)
      }
    }, 350)
    console.log('Unknown pattern:', pattern)
  }

  // Mainkan getaran + TTS untuk pesan masuk dari lawan bicara
  const lastHandledIndexRef = useRef<number>(-1)
  useEffect(() => {
    if (!messages.length) return
    const lastIndex = messages.length - 1
    if (lastIndex === lastHandledIndexRef.current) return

    const msg = messages[lastIndex]
    lastHandledIndexRef.current = lastIndex

    if (msg.from !== myId) {
      void vibrateForWord(msg.text)
      if (soundOn) {
        void speak(msg.text)
      }
    }
  }, [messages, myId, soundOn])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
      {runtimeError && (
        <div className="bg-red-900 text-red-100 text-xs px-3 py-2">
          Error runtime: {runtimeError}
        </div>
      )}
      {/* Header Elegan (sedikit lebih rapat untuk layar kecil) */}
      <header className="pt-10 pb-5 px-6 bg-slate-900 rounded-b-3xl shadow-md border-b border-slate-800 flex flex-col items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          KAITO <span className="text-blue-500">WHALE</span>
        </h1>
        <p className="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          Aksesibilitas Tunanetra & Tunarungu
        </p>
      </header>

      {/* Kontrol identitas & tombol di bawah header */}
      <div className="px-4 mt-3 flex justify-between items-center gap-3">
        <button
          type="button"
          onClick={() => setSoundOn((v) => !v)}
          className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-md transition-colors ${
            soundOn
              ? 'bg-blue-600 border-blue-400'
              : 'bg-slate-800 border-slate-600'
          }`}
          aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
        >
          {/* Icon speaker sederhana */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-5 h-5"
          >
            <path
              d="M4 9v6h3l4 3V6L7 9H4z"
              fill="currentColor"
              className={soundOn ? 'text-white' : 'text-slate-300'}
            />
            {soundOn ? (
              <path
                d="M15 10.5a3 3 0 010 3m2-4.5a5 5 0 010 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-white"
              />
            ) : (
              <line
                x1="16"
                y1="8"
                x2="20"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-red-400"
              />
            )}
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-10 h-10 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center shadow-md transition-colors hover:bg-slate-700"
          aria-label={showGuide ? 'Tutup panduan' : 'Buka panduan penggunaan'}
        >
          {/* Icon info/guide */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-5 h-5 text-slate-100"
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 8.5a1 1 0 100-2 1 1 0 000 2zm0 2.5v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Input myId / peerId */}
      <div className="px-4 mt-2 flex gap-3 text-xs text-slate-300">
        <div className="flex-1">
          <label className="block mb-1">ID saya</label>
          <input
            value={myId}
            onChange={(e) => setMyId(e.target.value.trim())}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
            placeholder="misal: alice"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">Kirim ke</label>
          <input
            value={peerId}
            onChange={(e) => setPeerId(e.target.value.trim())}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
            placeholder="misal: bob"
          />
        </div>
      </div>

      {showGuide ? (
        <main className="flex-1 py-3 px-4">
          <section className="max-w-xl mx-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 text-sm leading-relaxed">
            <h2 className="text-lg font-semibold text-white">Panduan Singkat Penggunaan KAITO WHALE</h2>
            <p className="text-slate-300">
              Aplikasi ini membantu komunikasi dengan menggunakan pola getaran. Anda cukup menekan lingkaran
              besar dan mengingat pola <span className="font-semibold">getar pendek</span> dan{' '}
              <span className="font-semibold">getar panjang</span> untuk setiap arti kata.
            </p>

            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>
                <span className="font-semibold">Posisi jari</span>: letakkan satu jari di tengah lingkaran abu-abu.
              </li>
              <li>
                <span className="font-semibold">Getar pendek</span>:
                tekan dan lepas dengan cepat. Sistem akan merasakan itu sebagai satu getaran pendek.
              </li>
              <li>
                <span className="font-semibold">Getar panjang</span>:
                tekan dan tahan lebih lama sampai HP ikut bergetar terus, lalu lepas. Itu dihitung sebagai satu getaran panjang.
              </li>
              <li>
                <span className="font-semibold">Membuat satu kata</span>:
                susun beberapa getaran pendek/panjang tanpa jeda terlalu lama di antaranya. Setelah berhenti
                beberapa saat, aplikasi akan menerjemahkan pola tersebut menjadi kata (misalnya YA, TIDAK,
                MAKAN, MINUM, dan lain-lain).
              </li>
              <li>
                <span className="font-semibold">Mendengar hasil</span>:
                jika suara diaktifkan, setelah teks muncul aplikasi akan membacakan kata tersebut.
              </li>
              <li>
                <span className="font-semibold">Pola tidak dikenal</span>:
                jika susunan getaran belum terdaftar di kamus, aplikasi akan menampilkan pesan bahwa kata tidak
                masuk ke dictionary.
              </li>
              <li>
                <span className="font-semibold">Percakapan</span>:
                setiap kata yang berhasil diterjemahkan juga akan muncul di daftar pesan di bagian atas layar,
                sehingga bisa dibaca oleh pendamping atau lawan bicara.
              </li>
            </ol>

            <p className="text-slate-400">
              Tips: latih dulu beberapa kali untuk membedakan rasa <span className="font-semibold">getar pendek</span>{' '}
              dan <span className="font-semibold">getar panjang</span> agar pola terasa natural di jari Anda.
            </p>
          </section>
        </main>
      ) : (
        <main className="flex-1 flex flex-col py-3 gap-3 min-h-0">
          {/* Area Pesan — tinggi maksimal, scroll internal */}
          <div className="min-h-0 max-h-[30vh] overflow-y-auto px-4 w-full max-w-lg mx-auto">
            <MessageList messages={messages} currentUserId={myId} />
          </div>

          {/* Area Input & Terjemahan — selalu tetap di tempatnya */}
          <div className="shrink-0 w-full max-w-md mx-auto flex flex-col items-center gap-4 pb-6 px-4">
            {/* Tampilan Terjemahan / Loading */}
            <div className="h-12 flex items-center justify-center w-full">
              {isTranslating ? (
                <div className="flex flex-col items-center gap-2 text-blue-400">
                  <div className="dots-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest">Menerjemahkan</div>
                </div>
              ) : lastWord ? (
                <div className="max-w-xs px-4 text-center text-3xl font-black text-white tracking-wide animate-fade-in">
                  {lastWord}
                </div>
              ) : (
                <div className="text-sm text-slate-500 font-medium">
                  Pola belum dimasukkan
                </div>
              )}
            </div>

            <InputPad
              onWordRecognized={handleWordRecognized}
              onUnknownPattern={handleUnknownPattern}
              onPatternStart={() => {
                // Mulai animasi loading dari awal saat pola baru dimulai
                if (translateTimerRef.current) {
                  window.clearTimeout(translateTimerRef.current)
                }
                setIsTranslating(true)
                setLastWord(null)
              }}
            />
            
            <div className="text-center px-4 mt-1 w-full">
              <p className="text-sm text-slate-400 leading-relaxed">
                Tekan dan tahan lingkaran abu-abu.
              </p>
              <div className="flex justify-center gap-3 mt-2 text-xs font-medium text-slate-500">
                <span className="bg-slate-800 px-2 py-1 rounded-md">Sebentar = getar pendek</span>
                <span className="bg-slate-800 px-2 py-1 rounded-md">Lama = getar panjang</span>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
