// Gantilah string di bawah ini dengan URL Web App dari Google Apps Script milikmu yang BARU!
const URL_API = "https://script.google.com/macros/s/AKfycbzqzHaOgpdQey1HT0nzsvHjwQFbI21x_pfcQbyDo6NDiZeXOjVBgyrEqyL_3iuL0FEL/exec";

let dataProduk = [];
let keranjang = {};

const statusKoneksi = document.getElementById('status-koneksi');
const gridProduk = document.getElementById('grid-produk');
const itemKeranjang = document.getElementById('item-keranjang');
const totalTagihanHTML = document.getElementById('total-tagihan');
const inputBayar = document.getElementById('input-bayar');
const totalKembalianHTML = document.getElementById('total-kembalian');
const btnTransaksi = document.getElementById('btn-transaksi');

// 1. Ambil data dari Google Sheets saat web dibuka
async function muatDataProduk() {
    try {
        const response = await fetch(URL_API);
        dataProduk = await response.json();
        
        statusKoneksi.textContent = "Online (Sheets)";
        statusKoneksi.className = "badge online";
        
        tampilkanProduk();
    } catch (error) {
        console.error("Gagal memuat data:", error);
        statusKoneksi.textContent = "Offline (Eror)";
        statusKoneksi.className = "badge offline";
        gridProduk.innerHTML = `<p class="loading-text" style="color:red;">Gagal memuat produk. Periksa kembali URL API atau koneksi Anda.</p>`;
    }
}

// 2. Render kartu produk ke layar (Menampilkan Stok Awal & Stok Akhir)
function tampilkanProduk() {
    gridProduk.innerHTML = '';
    dataProduk.forEach(produk => {
        const card = document.createElement('div');
        card.className = `card-produk ${produk.stok_akhir <= 0 ? 'habis' : ''}`;
        card.innerHTML = `
            <div class="nama-p">${produk.nama}</div>
            <div class="harga-p">Rp ${produk.harga.toLocaleString('id-ID')}</div>
            <div class="stok-p" style="font-size: 0.9em; line-height: 1.4;">
                <span style="color: #666;">Stok Awal: ${produk.stok_awal}</span><br>
                <strong>Sisa Stok: ${produk.stok_akhir}</strong>
            </div>
        `;
        
        if (produk.stok_akhir > 0) {
            card.onclick = () => tambahKeKeranjang(produk.id);
        }
        gridProduk.appendChild(card);
    });
}

// 3. Logika Keranjang Belanja
function tambahKeKeranjang(id) {
    const produk = dataProduk.find(p => p.id === id);
    const jumlahSaatIni = keranjang[id] || 0;
    
    // Validasi penambahan keranjang berdasarkan stok_akhir produk
    if (jumlahSaatIni < produk.stok_akhir) {
        text = "Stok untuk " + produk.nama + " sudah habis di keranjang!";
        keranjang[id] = jumlahSaatIni + 1;
        updateKeranjang();
    } else {
        alert(`Stok untuk ${produk.nama} sudah habis di keranjang!`);
    }
}

function updateKeranjang() {
    itemKeranjang.innerHTML = '';
    let totalTagihan = 0;
    const keys = Object.keys(keranjang);
    
    if (keys.length === 0) {
        itemKeranjang.innerHTML = '<p class="empty-text">Keranjang masih kosong</p>';
    } else {
        keys.forEach(id => {
            const produk = dataProduk.find(p => p.id === id);
            const qty = keranjang[id];
            const subtotal = produk.harga * qty;
            totalTagihan += subtotal;
            
            const row = document.createElement('div');
            row.className = 'row-keranjang';
            row.innerHTML = `
                <span>${produk.nama} (x${qty})</span>
                <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
            `;
            itemKeranjang.appendChild(row);
        });
    }
    
    totalTagihanHTML.textContent = `Rp ${totalTagihan.toLocaleString('id-ID')}`;
    totalTagihanHTML.dataset.value = totalTagihan;
    hitungKembalian();
}

// 4. Hitung Uang Kembalian
function hitungKembalian() {
    const total = parseInt(totalTagihanHTML.dataset.value) || 0;
    const bayar = parseInt(inputBayar.value) || 0;
    const kembalian = bayar - total;
    
    if (kembalian >= 0 && total > 0) {
        totalKembalianHTML.textContent = `Rp ${kembalian.toLocaleString('id-ID')}`;
        btnTransaksi.disabled = false;
    } else {
        totalKembalianHTML.textContent = `Rp 0`;
        btnTransaksi.disabled = true;
    }
}

inputBayar.addEventListener('input', hitungKembalian);

// 5. Kirim transaksi ke Google Sheets
btnTransaksi.onclick = async () => {
    const total = parseInt(totalTagihanHTML.dataset.value) || 0;
    const bayar = parseInt(inputBayar.value) || 0;
    
    if (bayar < total) return alert("Uang bayar kurang!");
    
    btnTransaksi.disabled = true;
    btnTransaksi.textContent = "Menyimpan Transaksi...";
    
    const dataKirim = {
        total_bayar: total,
        nominal_uang: bayar,
        items: Object.keys(keranjang).map(id => ({
            id: id,
            qty: keranjang[id]
        }))
    };
    
    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(dataKirim)
        });
        
        const hasil = await response.json();
        if (hasil.status === "success") {
            alert("Transaksi Berhasil & Stok Google Sheets Diperbarui!");
            keranjang = {};
            inputBayar.value = '';
            updateKeranjang();
            muatDataProduk(); // Muat ulang data/stok produk terbaru
        } else {
            alert("Gagal menyimpan transaksi: " + hasil.message);
        }
    } catch (error) {
        console.error("Eror saat kirim data:", error);
        alert("Terjadi masalah jaringan saat menyimpan transaksi.");
    } finally {
        btnTransaksi.textContent = "Proses & Simpan Transaksi";
        btnTransaksi.disabled = false;
    }
};

// Mulai jalankan aplikasi
muatDataProduk();
