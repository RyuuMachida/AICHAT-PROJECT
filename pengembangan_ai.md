# Dokumentasi Pengembangan ChatBot AI (Smart & Diligent Framework)

Dokumen ini berisi spesifikasi arsitektur, panduan prompt engineering, serta strategi pengembangan teknis untuk menjadikan **ChatBot AI** cerdas (*smart*), teliti (*diligent*), dan responsif terhadap kebutuhan pengguna.

---

## 🧠 Pilar I: Peningkatan Penalaran & Kecerdasan (*Smart & Deep Reasoning*)

Pilar pertama berfokus pada peningkatkan kualitas kognitif AI dalam memproses masalah kompleks, mencegah kekeliruan sintaks/fakta (*hallucination*), serta memberikan jawaban yang solutif dan terstruktur.

### 1.1 Hidden Chain-of-Thought (CoT) — Penalaran Internal
- **Konsep**: Sebelum memberikan jawaban akhir kepada pengguna pada topik teknis, sains, matematika, atau arsitektur perangkat lunak, AI diinstruksikan untuk menjalankan alur pemikiran step-by-step terlebih dahulu secara internal.
- **Tujuan**: Membantu AI memahami dependensi logika dan konteks masalah sebelum menghasilkan kalimat pertama.
- **Implementasi Prompt**:
  ```text
  Sebelum menghasilkan jawaban akhir, lakukan analisis dan penalaran mendalam secara logis, runtut, dan terstruktur atas setiap variabel dan konteks masalah.
  ```

### 1.2 Chain-of-Verification (CoVe) — Verifikasi Mandiri
- **Konsep**: Teknik dua tahap di mana AI memeriksa ulang kebenaran fakta, sintaks kode, dan asumsi yang ia buat sendiri sebelum mengirimkan keluaran final.
- **Tujuan**: Mencegah *hallucination* (informasi fiktif) dan memastikan kode yang dihasilkan dapat dieksekusi tanpa error sintaks dasar.
- **Implementasi Prompt**:
  ```text
  Selalu lakukan verifikasi mandiri atas kebenaran fakta, sintaks kode, dan logika sebelum memberikan jawaban final. Pastikan tidak ada kesalahan fatal atau fakta fiktif.
  ```

### 1.3 Multi-Step Problem Decomposition — Dekomposisi Masalah
- **Konsep**: Untuk tugas atau permintaan berskala besar (seperti "buatkan aplikasi fullstack" atau "analisis strategi bisnis"), AI tidak langsung memberikan potongan acak, melainkan memecah tugas menjadi sub-langkah yang sistematis.
- **Tujuan**: Memberikan solusi yang terstruktur dan mudah diikuti oleh pengguna.
- **Struktur Output**:
  1. Ringkasan Singkat & Tujuan
  2. Langkah 1: Persiapan & Fondasi
  3. Langkah 2: Kode Utama / Eksekusi
  4. Langkah 3: Pengujian & Validasi

### 1.4 Adaptive Response Complexity — Adaptasi Kedalaman Penjelasan
- **Konsep**: AI mendeteksi tingkat pemahaman dan latar belakang teknis pengguna secara otomatis dari gaya pertanyaan atau profil yang tersimpan di database.
- **Tujuan**: Menyajikan penjelasan yang sesuai—tidak terlalu rumit bagi pemula, namun cukup mendalam bagi pengguna tingkat mahir.
- **Integrasi**: Tersinkronisasi secara otomatis dengan memori `userCharacteristics` / `aiPersonalKnowledge` di Cloud Firestore.

### 1.5 Multi-Perspective Analysis — Analisis Multidimensi
- **Konsep**: Pada pertanyaan strategis atau desain arsitektur, AI mengevaluasi masalah dari berbagai sudut pandang keahlian (misal: *Software Architecture*, *Security*, *Performance*, dan *User Experience*).
- **Tujuan**: Menghasilkan rekomendasi yang komprehensif, aman, dan dapat diandalkan untuk kebutuhan tingkat produksi.

---

## 📋 Pilar II: Kedisiplinan & Ketelitian Eksekusi (*Diligent & High Accuracy*)

Pilar kedua berfokus pada tingkat ketelitian, akurasi kode, penanganan kondisi batas (*edge cases*), serta kejujuran AI dalam merespons tanpa mengasumsikan atau merespons secara sembarangan.

### 2.1 Self-Correction & Syntax Verification Loop
- **Konsep**: AI mengeksekusi pemeriksaan mandiri sebelum menulis kode final. Pemeriksaan mencakup: ketersediaan impor (*imports*), tipe variabel, kelengkapan fungsi, dan tidak ada potongan kode gantung.
- **Tujuan**: Memastikan kode yang dihasilkan dapat disalin-tempel dan langsung berjalan tanpa error sintaksis.

### 2.2 Strict Type & Documentation Enforcement
- **Konsep**: Penyiapan standar kode ketat dengan tipe data eksplisit (TypeScript interfaces / Python type annotations) serta komentar penjelas pada bagian logika kompleks.
- **Tujuan**: Meningkatkan *readability*, keamanan tipe (*type safety*), dan standar profesionalisme perangkat lunak.

### 2.3 Edge Case Checking Checklist
- **Konsep**: AI diwajibkan mengecek minimal 3 kondisi ekstrem (*edge cases*) untuk setiap solusi teknis:
  1. Input `null` / `undefined` / data kosong.
  2. Kegagalan jaringan / HTTP timeout / status error.
  3. Batas kapasitas memori atau string berukuran sangat besar.
- **Tujuan**: Mencegah aplikasi pengguna *crash* saat menghadapi kondisi dunia nyata yang tak terduga.

### 2.4 Zero-Assumption & Proactive Clarification Directive
- **Konsep**: Jika spesifikasi atau instruksi pengguna ambigu, AI dilarang menebak secara asal. AI wajib memberikan draf awal yang aman sekaligus mengajukan 1-2 pertanyaan klarifikasi yang presisi.
- **Tujuan**: Menjamin bahwa solusi akhir AI benar-benar sesuai dengan arsitektur & keinginan nyata pengguna.

### 2.5 Anti-Hallucination & Honesty Constraint
- **Konsep**: Batasan ketat agar AI tidak merekayasa API fiktif, nama fungsi yang tidak ada, atau fakta sejarah/ilmiah palsu. Jika AI tidak memiliki data pasti, AI diwajibkan menyatakan keterbatasannya secara jujur.
- **Tujuan**: Membangun kepercayan tinggi (*high trust*) antara pengguna dan AI.

---

## 🛠️ Lokasi File & Kode Terkait

1. **System Prompt Engine**: [`app/api/chat/route.ts`](file:///c:/INFOKOM/KKA/KKA%202026/JULI/CHATBOTAIAPI/app/api/chat/route.ts)
   - Mengintegrasikan `SISTEM PENALARAN MENDALAM (SMART)` dan `SISTEM KEDISIPLINAN & KETELITIAN (DILIGENT)` ke dalam pesan `system` untuk model Groq / Llama / Gemini.
2. **Ekstraksi Memori Data Diri**: [`app/api/extract-characteristics/route.ts`](file:///c:/INFOKOM/KKA/KKA%202026/JULI/CHATBOTAIAPI/app/api/extract-characteristics/route.ts)
   - Merekam dan memperbarui profil data diri pengguna secara otomatis ke Cloud Firestore (`db, "users", uid`).

---

## 🗺️ Roadmap Pengembangan AI Selanjutnya

- [x] **Pilar I: Smart & Deep Reasoning Framework** *(Selesai diimplementasikan)*
- [x] **Pilar II: Kedisiplinan & Anti-Hallucination Guardrails** *(Selesai diimplementasikan)*
- [ ] **Pilar III: Vector Memory & Long-Term Cognition** *(RAG Vector Database untuk Ingatan Percakapan)*
- [ ] **Pilar IV: Agentic Tools & Web Search** *(Integrasi Grounding Search & Executable Sandbox)*
- [ ] **Pilar V: Context Optimization & Hybrid Routing** *(Routing Model Otomatis & Summarization Engine)*
- [ ] **Pilar VI: User Feedback & Interactive UX** *(Compare Providers & Follow-Up Suggestions)*
