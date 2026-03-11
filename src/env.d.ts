/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string
  readonly VITE_INPUT_DOT_MAX_MS?: string
  readonly VITE_INPUT_PATTERN_END_DELAY_MS?: string
  readonly VITE_INPUT_CONTINUOUS_VIBRATE_MS?: string
  readonly VITE_INPUT_CONTINUOUS_GAP_MS?: string
  readonly VITE_OUTPUT_DOT_MS?: string
  readonly VITE_OUTPUT_DASH_MS?: string
  readonly VITE_OUTPUT_GAP_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
