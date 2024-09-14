const startScanBtn = document.getElementById('startScanBtn');
const reader = document.getElementById('reader');
const result = document.getElementById('result');
const urlResult = document.getElementById('urlResult');
const spinner = document.querySelector('.spinner'); // Spinner

const html5QrCode = new Html5Qrcode("reader");

let isScanning = false; // State variable to track scanning status
let isSubmitting = false; // State variable to track form submission status

function parseQrDataToJson(decodedText) {
    try {
        return JSON.parse(decodedText);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        return {}; // Kembalikan objek kosong jika parsing gagal
    }
}

function generateUrlFromJson(data) {
    const baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfGEN-8cYGzayD2C9yIWXkfT7xuG6m1ZLmpfs2dGKa1AY0UAw/formResponse";
    const queryParams = new URLSearchParams({
        'entry.2000269214': data['Nama'] || '',
        'entry.2136927801': data['Bagian'] || '',
        'entry.396848800': data['Perusahaan'] || ''
    }).toString();

    return `${baseUrl}?${queryParams}`;
}

async function submitForm(url) {
    if (isSubmitting) {
        return; // Jika sedang mengirim, batalkan pengiriman
    }
    
    isSubmitting = true; // Set status pengiriman menjadi true
    
    try {
        // Tampilkan spinner
        spinner.style.display = 'block';

        // Tunggu 3 detik sebelum melanjutkan
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Setelah 3 detik, sembunyikan spinner
        spinner.style.display = 'none';

        // Kirim form
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Tangani respons jika perlu
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

    } catch (error) {
        console.error('Terjadi kesalahan saat mengirim form:', error);
        isSubmitting = false; // Set status pengiriman menjadi false jika terjadi kesalahan
        
        // Pastikan spinner disembunyikan jika terjadi kesalahan
        spinner.style.display = 'none';

        isScanning = false; // Set status pemindaian menjadi false

        // Mainkan audio setelah form berhasil dikirim
        const successAudio = document.getElementById('successAudio');
        if (successAudio) {
            successAudio.play().catch(error => {
                console.error('Terjadi kesalahan saat memutar audio:', error);
            });
        }
        
        // Mulai ulang pemindaian
        await startScanning(); // Memastikan pemindaian dimulai kembali

    } finally {
        // Pastikan spinner disembunyikan jika pengiriman berhasil atau gagal
        if (isSubmitting) {
            spinner.style.display = 'none';
            isSubmitting = false;
        }
    }
}


async function startScanning() {
    try {
        if (isScanning) {
            // Jika pemindaian sudah berjalan, tidak perlu memulai lagi
            console.log("Scanner sudah berjalan.");
            return;
        }

        reader.style.display = 'block';
        startScanBtn.style.display = 'none';
        isScanning = true; // Set status pemindaian menjadi true

        await html5QrCode.start(
            { facingMode: "environment" }, // Menggunakan kamera belakang
            {
                fps: 10, // Frame per detik
                qrbox: { width: 250, height: 250 } // Ukuran kotak pemindai
            },
            async (decodedText, decodedResult) => {
                if (decodedText) {
                    result.textContent = `${decodedText}`;

                    const jsonData = parseQrDataToJson(decodedText);
                    console.log("Parsed JSON Data:", jsonData);

                    const url = generateUrlFromJson(jsonData);
                    console.log("Generated URL:", url);

                    // Hentikan pemindaian untuk menghindari pengiriman ganda dari satu QR code
                    await html5QrCode.stop().then(() => {
                        console.log('QR code scanning stopped.');

                    reader.style.display = 'none';
                    startScanBtn.style.display = 'none'; // Sembunyikan tombol scan
                    result.style.display = 'none';
                    
                    }).catch(err => {
                        console.error('Failed to stop scanning:', err);
                    });

                    // Submit form
                    await submitForm(url);
                }
            },
            (errorMessage) => {
                if (!errorMessage.includes('No MultiFormat Readers')) {
                    console.error(`Kesalahan pemindaian: ${errorMessage}`);
                }
            }
        );
    } catch (err) {
        console.error(`Error saat memulai pemindaian: ${err}`);
        alert("Terjadi kesalahan saat mencoba mengakses kamera. Pastikan kamera tersedia dan memiliki izin yang diperlukan.");
        isScanning = false; // Set status pemindaian menjadi false jika terjadi kesalahan
    }
}

// Mulai pemindaian saat tombol di klik
startScanBtn.addEventListener('click', startScanning);
