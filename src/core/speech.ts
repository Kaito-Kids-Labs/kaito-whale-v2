import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

export async function speak(text: string) {
  if (!text) return

  // Jika berjalan sebagai app native (Android/iOS), gunakan plugin TTS native
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop()
      await TextToSpeech.speak({
        text,
        lang: 'id-ID',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      })
      return
    } catch (error) {
      console.error('Native TTS error', error)
      // fallback ke web jika gagal
    }
  }

  // Fallback: browser / dev di desktop pakai Web Speech API
  if (typeof window === 'undefined') return
  if (!('speechSynthesis' in window)) return

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'id-ID'
  utterance.rate = 1.0
  utterance.pitch = 1.0

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}


