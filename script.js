/* ==========================================================================
   VARIABEL PENYIMPANAN DATA & KONFIGURASI API
   ========================================================================== */
// PASANG URL APLIKASI WEB KAMU DI SINI
const URL_API = "https://script.google.com/macros/s/AKfycbx7DDYRDDWQRF3i4Tp_Ef6qKyDmBTR--lKkbkznLi6iTDXHchdJ37ty0fwflKB13IHY/exec";

let keranjang = [];
let totalBayar = 0;
let daftarProduk = []; // Akan diisi otomatis dari Google Sheets

// Elemen DOM
const listKeranjangElemen = document.getElementById('list-keranjang');
const totalItemElemen = document.getElementById('total-item');
const totalBayarElemen = document.getElementById('total-bayar');
const inputCash = document.getElementById('input-cash');
const textKembalian = document.getElementById('text-kembalian');
const btnProsesBayar = document.getElementById('btn-proses-bayar');
const statusKoneksi = document.getElementById('status-koneksi');

/* ==========================================================================
   1. AMBIL DATA DARI GOOGLE SHEETS (FETCH DATA)
   ========================================================================== */
async function muatDataDariSheets() {
    try {
        statusKoneksi.textContent = "Memuat Data...";
        statusKoneksi.className = "status-badge";
        statusKoneksi.style.backgroundColor = "#f1f5f9";

        const respon = await fetch(URL_API);
        if (!respon.ok) throw new Error("Gagal mengambil data");
        
        daftarProduk = await respon.json();
        
        // Tampilkan ke layar web
        tampilkanProdukKeWeb(daftarProduk);

        statusKoneksi.textContent = "Online (Sheets)";
        statusKoneksi.className = "status-badge online";
        statusKoneksi.style.backgroundColor = "#ecfdf5";
    } catch (error) {
        console.error(error);
        statusKoneksi.textContent = "Offline / Eror";
        statusKoneksi.style.backgroundColor = "#fef2f2";
        statusKoneksi.style.color = "#ef4444";
        document.getElementById('grid-produk').innerHTML = 
            '<p class="empty-text" style="color:red;">Gagal memuat data produk. Periksa koneksi internet atau setelan Apps Script.</p>';
    }
}

/* ==========================================================================
   2. GAMBAR KARTU PRODUK SECARA DINAMIS
   ========================================================================== */
function tampilkanProdukKeWeb(produkData) {
    const gridProduk = document.getElementById('grid-produk');
    gridProduk.innerHTML = '';

    produkData.forEach((produk) => {
        const kartu = document.createElement('div');
        kartu.className = 'kartu-produk';
        
        // Jika stok habis, kunci produknya ala Odoo POS Premium
        if (produk.stok <= 0) {
            kartu.style.opacity = '0.5';
            kartu.style.cursor = 'not-allowed';
            kartu.onclick = () => alert("Stok barang ini sudah habis di warung!");
        } else {
            kartu.onclick = () => tambahKeKeranjang(produk.id, produk.nama, produk.harga, produk.stok);
        }

        kartu.innerHTML = `
            <div class="produk-info">
                <span class="produk-nama">${produk.nama}</span>
                <span class="produk-harga">Rp ${produk.harga.toLocaleString('id-ID')}</span>
            </div>
            <div class="produk-stok" style="${produk.stok <= 5 ? 'color:red; font-weight:bold;' : ''}">
                Stok: ${produk.stok}
            </div>
        `;
        gridProduk.appendChild(kartu);
    });
}

/* ==========================================================================
   3. LOGIKA KERANJANG BELANJA
   ========================================================================== */
function tambahKeKeranjang(id, nama, harga, stokMaksimal) {
    const produkAda = keranjang.find(item => item.id === id);

    if (produkAda) {
        if (produkAda.jumlah >= stokMaksimal) {
            alert(`Tidak bisa menambah! Batas stok di spreadsheet tinggal ${stokMaksimal}`);
            return;
        }
        produkAda.jumlah += 1;
    } else {
        keranjang.push({ id, nama, harga, jumlah: 1 });
    }

    if (navigator.vibrate) navigator.vibrate(15);
    updateTampilanKeranjang();
}

function updateTampilanKeranjang() {
    if (keranjang.length === 0) {
        listKeranjangElemen.innerHTML = '<p class="empty-text">Belum ada barang dipilih</p>';
        totalItemElemen.textContent = '0';
        totalBayarElemen.textContent = 'Rp 0';
        totalBayar = 0;
        inputCash.value = '';
        inputCash.disabled = true;
        hitungKembalian();
        return;
    }

    inputCash.disabled = false;
    listKeranjangElemen.innerHTML = '';
    let totalItem = 0;
    totalBayar = 0;

    keranjang.forEach((item, index) => {
        const subtotal = item.harga * item.jumlah;
        totalItem += item.jumlah;
        totalBayar += subtotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-keranjang';
        itemDiv.style.opacity = '0';
        itemDiv.style.transform = 'translateY(10px)';
        itemDiv.style.transition = 'all 0.2s ease';

        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-nama">${item.nama}</span>
                <span class="item-hitung">${item.jumlah} x Rp ${item.harga.toLocaleString('id-ID')}</span>
            </div>
            <span class="item-subtotal">Rp ${subtotal.toLocaleString('id-ID')}</span>
        `;
        listKeranjangElemen.appendChild(itemDiv);

        setTimeout(() => {
            itemDiv.style.opacity = '1';
            itemDiv.style.transform = 'translateY(0)';
        }, index * 40);
    });

    totalItemElemen.textContent = totalItem;
    totalBayarElemen.textContent = `Rp ${totalBayar.toLocaleString('id-ID')}`;
    hitungKembalian();
}

function hitungKembalian() {
    const nilaiCash = parseInt(inputCash.value) || 0;
    
    if (nilaiCash === 0 || totalBayar === 0) {
        textKembalian.textContent = 'Rp 0';
        textKembalian.style.color = 'var(--warna-teks-gelap)';
        btnProsesBayar.disabled = true;
        return;
    }

    const kembalian = nilaiCash - totalBayar;

    if (kembalian >= 0) {
        textKembalian.textContent = `Rp ${kembalian.toLocaleString('id-ID')}`;
        textKembalian.style.color = 'var(--warna-sukses)';
        btnProsesBayar.disabled = false;
    } else {
        textKembalian.textContent = `Kurang Rp ${Math.abs(kembalian).toLocaleString('id-ID')}`;
        textKembalian.style.color = 'var(--warna-bahaya)';
        btnProsesBayar.disabled = true;
    }
}

inputCash.addEventListener('input', hitungKembalian);

/* ==========================================================================
   4. KIRIM TRANSAKSI REAL-TIME KE GOOGLE SHEETS
   ========================================================================== */
btnProsesBayar.addEventListener('click', async () => {
    btnProsesBayar.disabled = true;
    btnProsesBayar.textContent = "Menyimpan ke Sheets...";
    btnProsesBayar.style.backgroundColor = "#eab308"; // Kuning loading

    try {
        const dataTransaksi = { keranjang: keranjang };

        const respon = await fetch(URL_API, {
            method: "POST",
            body: JSON.stringify(dataTransaksi)
        });

        const hasil = await respon.json();

        if (hasil.status === "sukses") {
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            
            alert("Transaksi Sukses! Stok di Google Sheets berhasil dipotong.");
            
            // Reset keranjang belanja
            keranjang = [];
            inputCash.value = '';
            updateTampilanKeranjang();
            
            // Ambil data ulang dari sheet agar angka stok di layar ikut ter-update
            await muatDataDariSheets();
        } else {
            throw new Error("Gagal memproses di sistem");
        }
    } catch (error) {
        console.error(error);
        alert("Eror saat menyimpan transaksi. Coba lagi.");
    } finally {
        btnProsesBayar.textContent = "Proses & Simpan Transaksi";
        btnProsesBayar.style.backgroundColor = "var(--warna-utama)";
    }
});

// Jalankan otomatis saat web dibuka
document.addEventListener('DOMContentLoaded', muatDataDariSheets);
