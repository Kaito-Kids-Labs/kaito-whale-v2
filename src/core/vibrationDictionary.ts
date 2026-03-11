export type Pattern = string

type Dictionary = Record<Pattern, string>

export const kategoriJawaban: Dictionary = {
  '.': 'YA',
  '-': 'TIDAK',
}

export const kategoriKebutuhan: Dictionary = {
  '..': 'MAKAN',
  '--': 'MINUM',
  '.-': 'MANDI',
  '-.': 'TIDUR',
}

export const kategoriKondisi: Dictionary = {
  '...': 'LAPAR',
  '---': 'HAUS',
  '.-.': 'SAKIT',
  '-.-': 'CAPEK',
  '..-': 'DINGIN',
  '--.': 'PANAS',
}

export const kategoriBantuan: Dictionary = {
  '....': 'TOLONG',
  '----': 'DARURAT',
  '.--.': 'PULANG',
  '-..-': 'BUTUH BANTUAN',
  '..--': 'ULANGI',
  '--..': 'SELESAI',
}

export const globalDictionary: Dictionary = {
  ...kategoriJawaban,
  ...kategoriKebutuhan,
  ...kategoriKondisi,
  ...kategoriBantuan,
}

// Mapping balik: kata -> pola, untuk memutar getaran dari teks
export const wordToPattern: Record<string, string> = Object.fromEntries(
  Object.entries(globalDictionary).map(([pattern, word]) => [word, pattern]),
)


