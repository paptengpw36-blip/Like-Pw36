import { SheetData } from '../types';

// --- KONFIGURASI GLOBAL ---
// Admin dapat mengisi URL di bawah ini agar otomatis terhubung bagi semua pengguna.
// Contoh: "https://docs.google.com/spreadsheets/d/1234567890abcdef/edit"
export const DEFAULT_SHEET_URL = ""; 

export async function fetchGoogleSheetData(inputUrl: string): Promise<SheetData> {
  let url = inputUrl.trim();
  const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Gagal mengambil data. Pastikan spreadsheet diatur ke "Siapa saja yang memiliki link dapat melihat".');
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching sheet:', error);
    throw error;
  }
}

function parseCSV(csvText: string): SheetData {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      let val = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      
      if (typeof val === 'string' && (val.includes('Rp') || /^-?[\d,.]+$/.test(val))) {
        const cleanVal = val.replace(/Rp/g, '').replace(/,/g, '');
        const num = Number(cleanVal);
        if (!isNaN(num) && cleanVal !== '') {
          row[header] = num;
          return;
        }
      }
      
      const num = Number(val);
      row[header] = (!isNaN(num) && val !== '' && !isNaN(parseFloat(val))) ? num : val;
    });
    return row;
  });

  return { headers, rows };
}

export const getMockData = (): SheetData => ({
  headers: ['BIDANG', 'NO ST', 'NAMA TIM', 'LOKASI PENUGASAN', 'TGL BERANGKAT', 'TGL KEMBALI', 'COSTSHEET', 'MAK', 'REALISASI', 'Outstanding'],
  rows: [
    { 'BIDANG': 'IPP', 'NO ST': 'PE.09.02/ST-7/PW36/2/2026', 'NAMA TIM': 'Agustinus Ribo, Andi Kukuh Setiawan', 'LOKASI PENUGASAN': 'Nabire', 'TGL BERANGKAT': '2026-01-13', 'TGL KEMBALI': '2026-01-15', 'COSTSHEET': 2400000, 'MAK': 'A009', 'REALISASI': 0, 'Outstanding': 2400000 },
    { 'BIDANG': 'P3A', 'NO ST': 'PE.05.02/ST-3/PW36/6/2026', 'NAMA TIM': 'Bima Aji Maulana, Fanny Rahmadani', 'LOKASI PENUGASAN': 'Nabire', 'TGL BERANGKAT': '2026-01-12', 'TGL KEMBALI': '2026-01-16', 'COSTSHEET': 9600000, 'MAK': 'A020', 'REALISASI': 0, 'Outstanding': 9600000 },
    { 'BIDANG': 'P3A', 'NO ST': 'OT.04/ST-2/PW36/6/2026', 'NAMA TIM': 'Atalya Fidela Sambenga', 'LOKASI PENUGASAN': 'Nabire', 'TGL BERANGKAT': '2026-01-13', 'TGL KEMBALI': '2026-01-17', 'COSTSHEET': 9890000, 'MAK': 'A009', 'REALISASI': 0, 'Outstanding': 9890000 },
    { 'BIDANG': 'APD', 'NO ST': 'PE.13.02/ST-9/PW36/3/2026', 'NAMA TIM': 'Bima Rizky Ramadhan', 'LOKASI PENUGASAN': 'Jakarta', 'TGL BERANGKAT': '2026-01-13', 'TGL KEMBALI': '2026-01-22', 'COSTSHEET': 29587000, 'MAK': 'A001', 'REALISASI': 0, 'Outstanding': 29587000 },
    { 'BIDANG': 'P3A', 'NO ST': 'HK.01.00/ST-11/PW36/6/2026', 'NAMA TIM': 'Darin Salsabilah', 'LOKASI PENUGASAN': 'Jakarta', 'TGL BERANGKAT': '2026-01-13', 'TGL KEMBALI': '2026-01-15', 'COSTSHEET': 31102000, 'MAK': 'A012', 'REALISASI': 0, 'Outstanding': 31102000 }
  ]
});