import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { wordToPattern } from './vibrationDictionary'
import { OUTPUT_DASH_MS, OUTPUT_DOT_MS, OUTPUT_GAP_MS } from './config'

export const VibrationPatterns = {
  dot: [40],
  dash: [120],
  patternRecognized: [80],
  error: [50, 50, 50, 50, 50],
  messageSent: [200],
} as const

/**
 * Getaran: di HP (Capacitor) pakai Haptics native, di browser pakai Web Vibration API.
 * Mengembalikan Promise yang resolve setelah getaran benar-benar selesai,
 * agar bisa di-await dan jeda antar simbol tidak tumpang tindih.
 */
export async function vibrate(pattern: number | readonly number[]): Promise<void> {
  const patternArr = typeof pattern === 'number' ? [pattern] : pattern

  if (Capacitor.isNativePlatform()) {
    await runNativePattern(patternArr)
    return
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern as number | number[])
    const totalMs = patternArr.reduce((sum, v) => sum + v, 0)
    if (totalMs > 0) await sleep(totalMs)
  }
}

async function runNativePattern(pattern: readonly number[]) {
  for (let i = 0; i < pattern.length; i++) {
    const ms = pattern[i]
    if (i % 2 === 0) {
      if (ms > 0) {
        await Haptics.vibrate({ duration: ms })
        await sleep(ms)
      }
    } else {
      if (ms > 0) await sleep(ms)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function vibrateForWord(word: string) {
  const pattern = wordToPattern[word]
  if (!pattern) return

  for (const ch of pattern) {
    if (ch === '.') {
      await vibrate(OUTPUT_DOT_MS)
    } else if (ch === '-') {
      await vibrate(OUTPUT_DASH_MS)
    }
    await sleep(OUTPUT_GAP_MS)
  }
}

