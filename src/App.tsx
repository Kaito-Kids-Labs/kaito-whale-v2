import { useRef, useState, useEffect } from 'react'
import { InputPad } from './components/InputPad'
import { MessageList } from './components/MessageList'
import { Training } from './components/Training'
import { useWebSocket } from './core/useWebSocket'
import { speak } from './core/speech'
import { vibrateForWord } from './core/vibration'
import { wordToPattern } from './core/vibrationDictionary'

function App() {
  const [myId, setMyId] = useState<string>('')
  const [peerId, setPeerId] = useState<string>('')
  const [showMenu, setShowMenu] = useState(false)
  const { messages, sendMessage } = useWebSocket(myId, peerId)
  const [lastWord, setLastWord] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showDictionary, setShowDictionary] = useState(false)
  const [showTraining, setShowTraining] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const translateTimerRef = useRef<number | null>(null)

  // Tampilkan error runtime di layar untuk debugging
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

  // Load ID tersimpan dari storage saat aplikasi pertama kali dibuka
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedMyId = window.localStorage.getItem('kaito_myId')
      const savedPeerId = window.localStorage.getItem('kaito_peerId')
      if (savedMyId) setMyId(savedMyId)
      if (savedPeerId) setPeerId(savedPeerId)
    } catch {
      // abaikan jika storage tidak tersedia
    }
  }, [])

  // Simpan perubahan ID ke storage supaya tetap ada setelah app / HP direstart
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('kaito_myId', myId)
      window.localStorage.setItem('kaito_peerId', peerId)
    } catch {
      // abaikan error quota atau private mode
    }
  }, [myId, peerId])

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
    <div className="h-[100dvh] overflow-hidden bg-slate-950 text-slate-50 flex flex-col font-sans">
      {runtimeError && (
        <div className="bg-red-900 text-red-100 text-xs px-3 py-2">
          Error runtime: {runtimeError}
        </div>
      )}
      {/* Header Elegan */}
      <header className="pt-12 pb-5 px-6 bg-slate-900 rounded-b-3xl shadow-md border-b border-slate-800 flex flex-col items-center relative shrink-0">
        
        {/* Tombol Kembali (Jika sedang di Mode Latihan / Guide) */}
        {(showTraining || showGuide || showDictionary) && (
          <button
            type="button"
            onClick={() => {
              setShowTraining(false)
              setShowGuide(false)
              setShowDictionary(false)
            }}
            className="absolute top-11 left-4 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Kembali
          </button>
        )}

        <div className="flex items-center justify-center gap-3 mt-4 sm:mt-0 mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] shrink-0 bg-white">
            <img src="/assets/kaito-whale-logo.png" alt="Kaito Whale Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            KAITO <span className="text-blue-500">WHALE</span>
          </h1>
        </div>
        <p className="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          Aksesibilitas Tunanetra & Tunarungu
        </p>
        
        {/* Tombol Menu 3-Titik di Pojok Kanan Atas (Hanya tampil di halaman Chat utama) */}
        {!showTraining && !showGuide && !showDictionary && (
          <div className="absolute top-11 right-4">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-2 z-50 overflow-hidden">
              {/* Tombol Suara */}
              <button
                type="button"
                onClick={() => { setSoundOn(!soundOn); setShowMenu(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 transition-colors text-sm text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                  <path d="M4 9v6h3l4 3V6L7 9H4z" fill="currentColor" className={soundOn ? 'text-blue-400' : 'text-slate-400'} />
                  {soundOn ? (
                    <path d="M15 10.5a3 3 0 010 3m2-4.5a5 5 0 010 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400" />
                  ) : (
                    <line x1="16" y1="8" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5" className="text-red-400" />
                  )}
                </svg>
                {soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
              </button>

              {/* Tombol Mode Latihan */}
              <button
                type="button"
                onClick={() => { setShowTraining(!showTraining); if (!showTraining) setShowGuide(false); setShowMenu(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 transition-colors text-sm text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${showTraining ? 'text-amber-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Mode Latihan
              </button>

              {/* Tombol Kamus Kata */}
              <button
                type="button"
                onClick={() => { setShowDictionary(true); setShowMenu(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 transition-colors text-sm text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                Kamus Kata
              </button>

              {/* Tombol Cara Kerja */}
              <button
                type="button"
                onClick={() => { setShowGuide(true); setShowMenu(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 transition-colors text-sm text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-slate-400">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 8.5a1 1 0 100-2 1 1 0 000 2zm0 2.5v6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Cara Kerja
              </button>
            </div>
          )}
        </div>
        )}
      </header>

      {/* Input myId / peerId - HANYA TAMPIL DI HALAMAN CHAT */}
      {!showTraining && !showGuide && !showDictionary && (
        <div className="px-4 mt-4 flex gap-3 text-xs text-slate-300 shrink-0">
          <div className="flex-1">
            <label className="block mb-1">ID saya</label>
            <input
              value={myId}
              onChange={(e) => setMyId(e.target.value.trim().toLowerCase())}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
              placeholder="misal: alice"
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Kirim ke</label>
            <input
              value={peerId}
              onChange={(e) => setPeerId(e.target.value.trim().toLowerCase())}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
              placeholder="misal: bob"
            />
          </div>
        </div>
      )}

      {showTraining ? (
        <Training />
      ) : showDictionary ? (
        <main className="flex-1 py-3 px-4 overflow-y-auto">
          <section className="max-w-md mx-auto space-y-6 pb-10">
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl p-5 shadow-lg border border-blue-800/50">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                Kamus Kata
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                Berikut adalah daftar lengkap kata dan pola getarannya yang didukung oleh aplikasi ini.
              </p>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(wordToPattern).map(([word, pattern]) => (
                  <div key={word} className="bg-slate-950/50 border border-slate-800/50 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-200">{word}</span>
                    <span className="font-mono font-bold tracking-widest text-xs text-blue-400 bg-blue-900/20 px-1.5 rounded">{String(pattern)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      ) : showGuide ? (
        <main className="flex-1 py-3 px-4 overflow-y-auto">
          <section className="max-w-md mx-auto space-y-6 pb-10">
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl p-5 shadow-lg border border-blue-800/50">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-400">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                Cara Kerja Aplikasi
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                KAITO WHALE membantu komunikasi tanpa suara atau visual. Anda cukup menggunakan <strong>satu lingkaran besar</strong> dan mengingat kombinasi getaran.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-2">Koneksi & Identitas</h3>
              
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4 text-sm text-slate-300">
                <p className="leading-relaxed">
                  Sebelum mulai berkomunikasi, Anda harus mengatur <strong>ID Saya</strong> dan <strong>Kirim ke</strong> pada halaman utama.
                </p>
                <div className="space-y-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                      </svg>
                    </div>
                    <div>
                      <strong className="text-slate-200 block mb-0.5">ID Saya</strong>
                      <p className="text-xs text-slate-400">Nama/ID unik Anda sendiri. (Contoh: <code className="text-blue-300 bg-blue-900/30 px-1 rounded">alice</code>)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-900/50 text-emerald-400 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                      </svg>
                    </div>
                    <div>
                      <strong className="text-slate-200 block mb-0.5">Kirim ke</strong>
                      <p className="text-xs text-slate-400">Nama/ID unik lawan bicara Anda. (Contoh: <code className="text-emerald-300 bg-emerald-900/30 px-1 rounded">bob</code>)</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                  <p><strong>Penting:</strong> Pastikan lawan bicara Anda mengisi kebalikannya. Jika Anda <code className="font-mono">alice</code> mengirim ke <code className="font-mono">bob</code>, maka di HP lawan bicara harus diisi ID Saya: <code className="font-mono">bob</code> dan Kirim ke: <code className="font-mono">alice</code>.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-2">Dasar Input</h3>
              
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-emerald-700 flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium mb-1">Getar Pendek</h4>
                  <p className="text-slate-400 text-sm">Tekan lingkaran dan lepas dengan cepat. (Seperti titik / dot)</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-900/50 border border-amber-700 flex items-center justify-center shrink-0">
                  <div className="w-6 h-3 rounded-full bg-amber-400"></div>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium mb-1">Getar Panjang</h4>
                  <p className="text-slate-400 text-sm">Tekan dan tahan sampai HP bergetar terus, lalu lepas. (Seperti garis / dash)</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-2">Cara Berkomunikasi</h3>
              
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4 text-sm text-slate-300">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <p><strong>Buat Pola:</strong> Susun beberapa getar pendek & panjang berturut-turut tanpa jeda lama.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <p><strong>Tunggu:</strong> Angkat jari dan tunggu sebentar. Sistem akan menerjemahkan pola menjadi kata (misal: "MAKAN").</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <p><strong>Terkirim:</strong> Kata akan dibacakan (TTS) dan otomatis dikirim ke lawan bicara Anda.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-4 border border-amber-800/50">
              <h4 className="text-amber-300 font-semibold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Mode Latihan (Tombol Jam)
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Untuk belajar pola getaran kata-kata, gunakan <strong>Mode Latihan</strong>. Ada 2 mode:
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <div><strong className="text-emerald-400">Mode Belajar:</strong> Tekan sebentar = dengar ulang pola kata. Tekan lama = lanjut ke kata berikutnya. <em>Tidak ada getaran continuous saat menyentuh</em>, hanya pola kata yang diputar.</div>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <div><strong className="text-amber-400">Mode Kuis:</strong> Pendamping meminta pengguna menebak pola suatu kata. Tekan sebentar = titik, tekan lama = garis. <em>Ada getaran continuous saat jari menyentuh</em> untuk konfirmasi input pengguna.</div>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h4 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Pola Tidak Dikenal
              </h4>
              <p className="text-slate-400 text-sm">
                Jika susunan getaran belum ada di kamus, aplikasi akan memunculkan peringatan <em>"Kata tidak masuk ke dictionary"</em> dan tidak akan mengirimkannya.
              </p>
            </div>
          </section>
        </main>
      ) : (
        <main className="flex-1 flex flex-col pt-3 pb-6 gap-3 min-h-0">
          {/* Area Pesan — fleksibel mengisi ruang dan mendorong input ke bawah */}
          <div className="flex-1 min-h-0 px-4 w-full max-w-lg mx-auto flex flex-col">
            <MessageList messages={messages} currentUserId={myId} />
          </div>

          {/* Area Input & Terjemahan — selalu berada di paling bawah */}
          <div className="shrink-0 w-full max-w-md mx-auto flex flex-col items-center gap-2 px-4 mt-auto mb-6">
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

            {/* Petunjuk Aksi (Dipindah ke atas tombol getar) */}
            <div className="flex justify-center gap-2 text-[10px] font-medium w-full mb-1">
              <span className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1 rounded">Sebentar = Titik (·)</span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2 py-1 rounded">Lama = Garis (-)</span>
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
          </div>
        </main>
      )}
    </div>
  )
}

export default App
