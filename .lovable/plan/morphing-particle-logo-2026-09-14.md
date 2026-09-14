# Morphing Particle Logo

## Hasil
- Pertahankan tampilan partikel transparan tanpa latar.
- Perjelas ruang negatif pada huruf **A**, **R**, dan **B** dengan sampling bentuk teks yang lebih presisi serta mengurangi sebaran partikel di tepi dalam huruf.
- Tambahkan bentuk kedua dari gambar simbol Arcane Labs yang diunggah.
- Buat partikel yang sama bermorf secara halus dari tulisan ke simbol, lalu kembali ke tulisan dalam loop tanpa putus.

## Waktu Animasi
- Tulisan tampil stabil selama **5 detik**.
- Partikel menyusun ulang menjadi simbol selama **3 detik**.
- Simbol tampil stabil selama **5 detik**.
- Partikel menyusun ulang kembali menjadi tulisan selama **3 detik**.
- Siklus berulang tanpa batas; gerak idle dan reaksi kursor tetap aktif selama seluruh siklus.

## Detail Teknis
- Ambil mask transparansi simbol dari `LOGO_ONLY.png`, bukan menampilkan gambarnya langsung.
- Buat pasangan posisi awal/tujuan untuk setiap partikel agar jumlah partikel tetap stabil selama morph.
- Gunakan easing halus di shader untuk perpindahan bentuk dan sedikit arus partikel saat transisi.
- Jaga skala kedua bentuk tetap proporsional dan selalu muat di layar desktop maupun ponsel.
- Hormati pengaturan reduced motion dengan menonaktifkan morph otomatis saat pengguna memintanya.
- Gunakan logo unggahan sebagai favicon sesuai identitas Arcane Labs.

## Verifikasi
- Pastikan A, R, dan B terbaca jelas saat bentuk tulisan diam.
- Periksa fase tulisan, transisi, simbol, dan transisi balik lewat beberapa tangkapan waktu.
- Pastikan hover, drag, latar transparan, framing responsif, dan halaman bebas error.
