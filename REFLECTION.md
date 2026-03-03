# Refleksi & Learning Guide: AI Document Editor

## Apa yang Kamu Pelajari?
**Skill Baru:**
- **Integrasi Generative AI (Gemini):** Memahami cara menghubungkan aplikasi Next.js dengan model bahasa besar (LLM) Google Gemini untuk memproses teks dan perintah dalam konteks editor dokumen.
- **State Management Kompleks:** Mengelola state editor yang dinamis (konten, history chat, posisi kursor) dan menyinkronkannya dengan AI serta LocalStorage.
- **Offline-First Architecture:** Membangun aplikasi yang sepenuhnya fungsional tanpa backend database (menggunakan LocalStorage) untuk kecepatan dan privasi.

**Konsep Paling Menarik:**
- **Function Calling pada LLM:** Kemampuan AI untuk tidak hanya membalas teks, tapi juga "memanggil fungsi" seperti `update_document` atau `insert_text` untuk memanipulasi editor secara langsung. Ini mengubah AI dari sekadar chatbot menjadi *asisten aktif*.

**Paling Challenging:**
- **Sinkronisasi Context:** Memastikan AI selalu "sadar" dengan isi dokumen terbaru tanpa mengirimkan seluruh isi dokumen berulang-ulang yang bisa boros token, sambil tetap menjaga responsivitas aplikasi.

**Improvement (Jika Ada Waktu Lebih):**
- **Hybrid Sync:** Menggabungkan LocalStorage untuk kecepatan instan dengan database cloud (seperti Supabase/Firebase) untuk backup background, memberikan yang terbaik dari kedua dunia (online & offline).

---

## Learning Reflection Guide

### Technical Challenge
**Tantangan:** Menangani format respons dari Gemini API yang streaming dan memastikan JSON untuk *function calling* tervalidasi dengan benar.
**Solusi:** Menggunakan library official `@google/generative-ai` yang menangani streaming dan parsing schema secara otomatis, serta menambahkan *error handling* yang kuat di sisi frontend untuk menangkap respons AI yang tidak lengkap atau halusinasi.

### AI Behavior
**Decision Making:** AI menggunakan context window yang diberikan. Jika user bertanya "Tolong perbaiki paragraf kedua", AI membaca dokumen, mengidentifikasi baris yang dimaksud, dan memilih tool `update_doc_by_line`.
**Contoh:** Jika user meminta "Buatkan tabel perbandingan", AI mendeteksi kebutuhan format markdown dan akan men-generate teks markdown tabel, lalu menyisipkannya menggunakan tool `insert_content`.

### Real-time Sync
**Conflict Handling:** Saat ini menggunakan pendekatan *Last-Write-Wins* sederhana karena berjalan di LocalStorage (single user).
**Skenario:** Jika dikembangkan ke kolaborasi multipengguna, kita akan membutuhkan CRDT (Conflict-free Replicated Data Types) atau operational transform (seperti Google Docs) untuk menggabungkan edit dari dua orang secara real-time tanpa menimpa satu sama lain.

### Production Readiness
**Hal yang perlu disiapkan sebelum rilis:**
1.  **Accessibility (A11y):** Memastikan seluruh aplikasi dapat diakses menggunakan keyboard navigation dan screen reader (misal: label ARIA yang lengkap).
2.  **Cross-Browser Testing:** Memastikan tampilan dan fungsi berjalan sempurna di browser selain Chrome (seperti Safari, Firefox, dan Edge).
3.  **Comprehensive Error Handling:** Menambahkan notifikasi UI (Toast) yang lebih ramah pengguna saat terjadi kegagalan jaringan atau error API, bukan hanya log di console.
4.  **Performance Optimization:** Implementasi lazy loading untuk komponen berat agar *First Contentful Paint* (FCP) lebih cepat di perangkat low-end.

### Future Improvements
1.  **Voice-to-Text Command:** Memerintah AI untuk mengedit dokumen menggunakan suara.
2.  **Multi-Model Support:** Opsi bagi user untuk memilih model AI lain (misal: Claude atau GPT-4) sebagai pembanding.
3.  **Smart Citations:** Kemampuan AI untuk mencari referensi web dan menyisipkannya sebagai sitasi otomatis di dalam dokumen.
