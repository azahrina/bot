Cara Pasang & Jalankan Pertama Kali di Termux
Buka aplikasi Termux di HP Anda, lalu cukup jalankan perintah standar ini:

# 1. Pastikan izin penyimpanan aktif (Klik Izinkan di layar HP Anda)
termux-setup-storage

# 2. Pasang paket dasar
pkg update -y && pkg install git nodejs-lts ffmpeg -y

# 3. Clone repo dan nyalakan server
git clone https://github.com/USERNAME_ANDA/bot.git
cd bot
node server

Cara Mengisi Foto/Video & Edit Caption di HP (Tanpa Buka Termux!)

Mulai sekarang, Anda TIDAK PERLU lagi menyalin file lewat terminal Termux:

Buka aplikasi File Saya / File Manager bawaan HP Android Anda.
Masuk ke folder: Download/bot_data/
Mau tambah foto/video feed? Masukkan ke folder media/feed/.
Mau ubah / tambah caption? Buka setup/caption/caption.txt pakai Text Editor / Catatan HP biasa, lalu simpan.
Mau ubah teks stiker story? Buka setup/sticker/sticker.txt.
Mau ubah template DM? Buka dm/dm.txt.
Mau tambah font? Masukkan file .ttf ke fonts/.
Server di Termux langsung membaca perubahan file tersebut secara real-time!


Cara Update Kodingan di Masa Depan

Jika ada perbaikan kode bot di PC:

Di PC: Cukup git add . && git commit -m "update" && git push
Di Termux: Cukup ketik:
cd ~/bot
git pull
node server

Cara Pakai di Browser (Kiwi / Lemur Browser)
Pastikan server di Termux sudah berjalan (node server).
Buka Kiwi Browser atau Lemur Browser di HP Anda.
Buka tab Instagram dan buka panel Extension.
Panel akan langsung tersambung (Online), dan dropdown folder media serta file caption akan menampilkan data dari folder Download/bot_data HP Anda secara otomatis!


