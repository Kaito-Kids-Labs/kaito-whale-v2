function envNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const raw = import.meta.env[key]
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Input (saat pengguna mengetuk tombol)
export const INPUT_DOT_MAX_MS = envNumber('VITE_INPUT_DOT_MAX_MS', 150)
export const INPUT_PATTERN_END_DELAY_MS = envNumber(
  'VITE_INPUT_PATTERN_END_DELAY_MS',
  2000,
)
export const INPUT_CONTINUOUS_VIBRATE_MS = envNumber(
  'VITE_INPUT_CONTINUOUS_VIBRATE_MS',
  80,
)
export const INPUT_CONTINUOUS_GAP_MS = envNumber(
  'VITE_INPUT_CONTINUOUS_GAP_MS',
  20,
)

// Output (saat menerima pesan → getaran)
export const OUTPUT_DOT_MS = envNumber('VITE_OUTPUT_DOT_MS', 180)
export const OUTPUT_DASH_MS = envNumber('VITE_OUTPUT_DASH_MS', 700)
export const OUTPUT_GAP_MS = envNumber('VITE_OUTPUT_GAP_MS', 600)

