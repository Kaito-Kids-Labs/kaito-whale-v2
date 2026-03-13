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

/**
 * Level latihan bertahap untuk tunanetra+tunarungu.
 * Setiap level menambah kata baru secara bertahap.
 * label = untuk pendamping (tampil di layar).
 * words = kata-kata yang dipelajari/diuji di level ini.
 */
export const trainingLevels: { label: string; description: string; words: string[] }[] = [
  {
    label: 'Level 1: Jawaban Dasar',
    description: 'Pola paling sederhana (1 sentuhan) untuk menjawab ya/tidak.',
    words: Object.values(kategoriJawaban),
  },
  {
    label: 'Level 2: Kebutuhan Primer',
    description: 'Pola 2 sentuhan untuk menyatakan kebutuhan dasar sehari-hari.',
    words: Object.values(kategoriKebutuhan),
  },
  {
    label: 'Level 3: Gabungan Level 1 & 2',
    description: 'Mengulang pola jawaban dan kebutuhan primer untuk memantapkan memori.',
    words: [
      ...Object.values(kategoriJawaban),
      ...Object.values(kategoriKebutuhan),
    ],
  },
  {
    label: 'Level 4: Kondisi Fisik',
    description: 'Pola 3 sentuhan untuk menyampaikan kondisi yang dirasakan tubuh.',
    words: Object.values(kategoriKondisi),
  },
  {
    label: 'Level 5: Bantuan & Darurat',
    description: 'Pola 4 sentuhan (paling kompleks) untuk meminta bantuan atau dalam kondisi darurat.',
    words: Object.values(kategoriBantuan),
  },
  {
    label: 'Level 6: Ujian Akhir (Semua Kata)',
    description: 'Menggabungkan semua pola yang telah dipelajari sebagai evaluasi akhir.',
    words: Object.values(globalDictionary),
  },
]


