import React, { useState, useMemo } from 'react';
import { SheetData } from '../types';

interface DashboardContentProps {
  data: SheetData;
  aiInsights: string;
  view?: string;
}

const formatIDR = (val: number) => {
  const num = isNaN(val) ? 0 : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace('IDR', 'Rp');
};

const DashboardContent: React.FC<DashboardContentProps> = ({ data, aiInsights, view = 'dashboard' }) => {
  // --- 1. STATE HOOKS (Harus selalu dipanggil di urutan yang sama) ---
  const [personSearch, setPersonSearch] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('ALL');
  const [tableBidangFilter, setTableBidangFilter] = useState('ALL');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const [repMonth, setRepMonth] = useState(new Date().getMonth() + 1);
  const [repYear, setRepYear] = useState(new Date().getFullYear());
  const [repBidang, setRepBidang] = useState('ALL');

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // --- 2. HELPER FUNCTIONS ---
  const getVal = (row: any, keys: string[]) => {
    if (!row) return null;
    const rowKeys = Object.keys(row);
    for (const searchKey of keys) {
      const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
      if (match !== undefined) return row[match];
    }
    return null;
  };

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    let d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    if (typeof val === 'string') {
      const cleanVal = val.trim();
      const parts = cleanVal.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  };

  // Logika Cerdas untuk Menentukan Tanggal Efektif Transaksi
  // Prioritas 1: Gunakan TGL SPM jika ada (karena ini tanggal realisasi uang)
  // Prioritas 2: Jika TGL SPM kosong, gunakan TGL BERANGKAT (agar data tetap muncul di laporan)
  const getEffectiveDate = (row: any): Date | null => {
    // Cek kolom TGL SPM secara spesifik
    const spmVal = getVal(row, ['TGL SPM']);
    const spmDate = parseDate(spmVal);
    
    // Jika valid, gunakan TGL SPM
    if (spmDate) return spmDate;

    // Jika tidak, fallback ke TGL BERANGKAT / Tanggal Kegiatan
    const tripVal = getVal(row, ['TGL BERANGKAT', 'Tanggal', 'WAKTU']);
    return parseDate(tripVal);
  };

  const exportToExcel = (rows: any[], filename: string) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const val = row[header];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToPDF = () => window.print();

  // --- 3. GLOBAL MEMOIZED DATA (Hooks ini harus dipanggil SEBELUM return kondisional) ---
  
  const allBidang = useMemo(() => {
    return Array.from(new Set(data.rows.map(row => String(getVal(row, ['BIDANG']) || '').toUpperCase())))
      .filter(b => b && b !== 'NULL' && b !== 'UNKNOWN');
  }, [data.rows]);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    data.rows.forEach(row => {
      // Gunakan getEffectiveDate agar tahun TGL BERANGKAT juga terhitung jika TGL SPM kosong
      const d = getEffectiveDate(row);
      if (d) years.add(d.getFullYear());
    });
    const list = Array.from(years).sort((a, b) => b - a);
    return list.length > 0 ? list : [new Date().getFullYear()];
  }, [data.rows]);

  // Perhitungan Statistik per Bidang (Jumlah ST, Realisasi, Outstanding)
  const bidangStats = useMemo(() => {
    const stats: Record<string, { stSet: Set<string>; realization: number; outstanding: number }> = {};
    
    data.rows.forEach(row => {
      const b = String(getVal(row, ['BIDANG']) || '').toUpperCase();
      const noST = String(getVal(row, ['NO ST']) || '').trim();
      const real = Number(getVal(row, ['REALISASI'])) || 0;
      const out = Number(getVal(row, ['Outstanding', 'SISA'])) || 0;
      
      if (b && b !== 'NULL' && b !== 'UNKNOWN') {
        if (!stats[b]) {
          stats[b] = { stSet: new Set(), realization: 0, outstanding: 0 };
        }
        
        if (noST) {
          stats[b].stSet.add(noST);
        }
        
        stats[b].realization += real;
        stats[b].outstanding += out;
      }
    });
    
    // Convert to array and sort by count desc
    return Object.entries(stats)
      .map(([bidang, data]) => ({ 
        bidang, 
        count: data.stSet.size,
        realization: data.realization,
        outstanding: data.outstanding
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.rows]);

  // --- 4. VIEW RENDERING ---

  // === VIEW: MONITORING PERSONIL ===
  if (view === 'personil') {
    const personilMap: Record<string, { tasks: any[], accumulated: number, bidang: string }> = {};
    data.rows.forEach(row => {
      const b = String(getVal(row, ['BIDANG']) || '').toUpperCase();
      if (selectedBidang !== 'ALL' && b !== selectedBidang) return;
      const namesStr = String(getVal(row, ['NAMA TIM', 'Nama', 'NAMA']) || '');
      const names = namesStr.split(',').map(n => n.trim()).filter(n => n !== '');
      names.forEach(name => {
        if (personSearch && !name.toLowerCase().includes(personSearch.toLowerCase())) return;
        if (!personilMap[name]) personilMap[name] = { tasks: [], accumulated: 0, bidang: b };
        personilMap[name].tasks.push(row);
        personilMap[name].accumulated += (Number(getVal(row, ['REALISASI'])) || 0);
      });
    });

    const personilList = Object.entries(personilMap).sort((a, b) => b[1].accumulated - a[1].accumulated);

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Monitoring Personil</h1>
            <p className="text-slate-400 font-medium mt-1">Metrik performa dan distribusi beban kerja tim secara real-time</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input type="text" placeholder="Cari nama..." value={personSearch} onChange={(e) => setPersonSearch(e.target.value)} className="pl-11 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all w-full md:w-72 shadow-sm" />
            </div>
            <select value={selectedBidang} onChange={(e) => setSelectedBidang(e.target.value)} className="bg-white border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold uppercase shadow-sm outline-none focus:border-blue-500 transition-all cursor-pointer">
              <option value="ALL">SEMUA BIDANG</option>
              {allBidang.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {personilList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {personilList.map(([name, stats], idx) => {
              const parts = name.split(' ').filter(p => p.length > 0);
              const initials = parts.length > 0 ? parts.map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
              
              return (
                <div key={idx} onClick={() => setSelectedPerson(name)} className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer overflow-hidden relative flex flex-col items-center text-center">
                  <div className="absolute top-6 right-6 z-10">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/20">{stats.tasks.length} ST</span>
                  </div>
                  <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 group-hover:from-blue-600 group-hover:to-indigo-500 flex items-center justify-center text-slate-400 group-hover:text-white text-2xl font-black transition-all duration-500 shadow-inner group-hover:rotate-6 mb-6">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">{stats.bidang}</span>
                    <h3 className="text-base font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 px-2">{name}</h3>
                  </div>
                  <div className="w-full mt-8 pt-8 border-t border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-1.5">TOTAL REALISASI</p>
                    <p className="text-xl font-black text-slate-900 group-hover:scale-105 transition-transform">{formatIDR(stats.accumulated)}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-0 h-1.5 bg-blue-600 group-hover:w-full transition-all duration-700"></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 border-dashed">
            <span className="text-4xl mb-4">🤷‍♂️</span>
            <h3 className="text-lg font-black text-slate-800">Tidak ada data personil</h3>
            <p className="text-slate-400 text-sm">Coba sesuaikan filter atau kata kunci pencarian</p>
          </div>
        )}

        {selectedPerson && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setSelectedPerson(null)} />
            <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
              <div className="p-12 bg-slate-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center text-xl font-black shadow-xl shadow-blue-600/20">
                     {selectedPerson.split(' ').filter(p => p).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                   </div>
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedPerson}</h3>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Riwayat Lengkap Penugasan Pegawai</p>
                   </div>
                </div>
                <button onClick={() => setSelectedPerson(null)} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all font-bold text-xl shadow-md">✕</button>
              </div>
              <div className="p-12 overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-6">
                      <th className="pb-6">No ST / Tgl</th>
                      <th className="pb-6">Bidang</th>
                      <th className="pb-6">Uraian Tugas</th>
                      <th className="pb-6 text-right">Realisasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {personilMap[selectedPerson].tasks.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-7">
                          <div className="text-[12px] font-bold text-blue-600 font-mono">{getVal(t, ['NO ST'])}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getVal(t, ['TGL BERANGKAT', 'Tanggal'])}</div>
                        </td>
                        <td className="py-7"><span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 shadow-sm">{getVal(t, ['BIDANG'])}</span></td>
                        <td className="py-7 text-[12px] italic font-medium text-slate-500 max-w-[350px]">"{getVal(t, ['URAIAN ST', 'Uraian'])}"</td>
                        <td className="py-7 text-right font-black text-slate-900 text-sm">{formatIDR(Number(getVal(t, ['REALISASI'])) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === VIEW: LAPORAN REALISASI ===
  if (view === 'realisasi') {
    // Filter for the "Single Month" card
    const singleMonthRows = data.rows.filter(row => {
      const b = String(getVal(row, ['BIDANG']) || '').toUpperCase();
      // FIX: Gunakan getEffectiveDate agar tidak skip jika TGL SPM kosong
      const dt = getEffectiveDate(row);
      
      if (repBidang !== 'ALL' && b !== repBidang) return false;
      if (!dt) return false;
      return dt.getFullYear() === repYear && (dt.getMonth() + 1) === repMonth;
    });

    // Filter for the Cumulative/Full Year Table
    const cumulativeRows = data.rows.filter(row => {
      const b = String(getVal(row, ['BIDANG']) || '').toUpperCase();
      // FIX: Gunakan getEffectiveDate agar tidak skip jika TGL SPM kosong
      const dt = getEffectiveDate(row);

      if (repBidang !== 'ALL' && b !== repBidang) return false;
      if (!dt) return false;
      // Show all data for the year up to the end of the year (Full Year view for table)
      return dt.getFullYear() === repYear; 
    }).sort((a, b) => {
        const d1 = getEffectiveDate(a)?.getTime() || 0;
        const d2 = getEffectiveDate(b)?.getTime() || 0;
        return d1 - d2;
    });

    const monthlyReal = singleMonthRows.reduce((s, r) => s + (Number(getVal(r, ['REALISASI'])) || 0), 0);
    const cumulativeReal = cumulativeRows.reduce((s, r) => s + (Number(getVal(r, ['REALISASI'])) || 0), 0);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl no-print">📅</div>
             <div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Realisasi Anggaran</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{months[repMonth-1]} {repYear} • {repBidang}</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <select value={repBidang} onChange={(e) => setRepBidang(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase">
              <option value="ALL">SEMUA BIDANG</option>
              {allBidang.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={repMonth} onChange={(e) => setRepMonth(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-bold">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={repYear} onChange={(e) => setRepYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-bold">
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex gap-2">
               <button onClick={() => exportToExcel(cumulativeRows, `Laporan_Tahunan_${repBidang}_${repYear}`)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest">📥 Excel (Tahunan)</button>
               <button onClick={exportToPDF} className="px-6 py-2.5 bg-rose-600 text-white rounded-2xl text-[10px] font-black shadow-xl hover:bg-rose-700 transition-all uppercase tracking-widest">🖨️ PDF</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">REALISASI BULAN {months[repMonth-1].toUpperCase()}</p>
              <h3 className="text-3xl font-black text-slate-800">{formatIDR(monthlyReal)}</h3>
           </div>
           <div className="bg-[#001f3f] p-8 rounded-[2rem] text-white shadow-2xl flex flex-col justify-center relative overflow-hidden">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">TOTAL REALISASI TAHUN {repYear}</p>
              <h3 className="text-3xl font-black">{formatIDR(cumulativeReal)}</h3>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RINCIAN REALISASI TAHUN {repYear}</p>
             <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">Januari - Desember</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead>
                <tr className="bg-white border-b text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="px-8 py-6">Bidang</th>
                  <th className="px-8 py-6">No ST / Tgl</th>
                  <th className="px-8 py-6">Deskripsi Penugasan</th>
                  <th className="px-8 py-6 text-right">Nilai Realisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cumulativeRows.length > 0 ? (
                  cumulativeRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{getVal(row, ['BIDANG'])}</span></td>
                      <td className="px-8 py-6">
                        <div className="font-mono text-[12px] text-blue-600 font-bold">{getVal(row, ['NO ST'])}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getEffectiveDate(row)?.toLocaleDateString('id-ID') || getVal(row, ['TGL BERANGKAT', 'Tanggal'])}</div>
                      </td>
                      <td className="px-8 py-6 text-[12px] italic font-medium text-slate-500 max-w-[350px]">"{getVal(row, ['URAIAN ST', 'Uraian'])}"</td>
                      <td className="px-8 py-6 text-right font-black text-slate-800 text-[13px]">{formatIDR(Number(getVal(row, ['REALISASI'])) || 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">
                      Tidak ada data realisasi ditemukan untuk tahun {repYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // === DEFAULT VIEW: DASHBOARD UTAMA ===
  const totalPagu = data.rows.reduce((s, r) => s + (Number(getVal(r, ['COSTSHEET'])) || 0), 0);
  const totalReal = data.rows.reduce((s, r) => s + (Number(getVal(r, ['REALISASI'])) || 0), 0);
  const totalSisa = data.rows.reduce((s, r) => s + (Number(getVal(r, ['Outstanding', 'SISA'])) || 0), 0);
  const overallAbsorption = totalPagu > 0 ? (totalReal / totalPagu) * 100 : 0;

  const bidangSummary = (() => {
    const map: Record<string, number> = {};
    data.rows.forEach(r => {
      const b = String(getVal(r, ['BIDANG']) || '').toUpperCase();
      if (!b) return;
      map[b] = (map[b] || 0) + (Number(getVal(r, ['REALISASI'])) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  const makSummary = (() => {
    const map: Record<string, number> = {};
    data.rows.forEach(r => {
      const m = String(getVal(r, ['MAK']) || '').toUpperCase();
      if (!m || m === 'NULL') return;
      map[m] = (map[m] || 0) + (Number(getVal(r, ['REALISASI'])) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* KPI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">TOTAL COSTSHEET (PAGU)</p>
          <h3 className="text-3xl font-black text-slate-900">{formatIDR(totalPagu)}</h3>
          <div className="mt-6 flex items-center gap-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md uppercase">Target 100%</span></div>
        </div>
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">OUTSTANDING (SISA)</p>
          <h3 className="text-3xl font-black text-slate-900">{formatIDR(totalSisa)}</h3>
          <div className="mt-6 flex items-center gap-2"><span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded-md uppercase">Belum Terserap</span></div>
        </div>
        <div className="bg-[#001f3f] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group text-white">
          <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-2">TOTAL REALISASI</p>
          <h3 className="text-3xl font-black">{formatIDR(totalReal)}</h3>
          <div className="mt-6">
             <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">PROGRESS PENYERAPAN</span>
                <span className="text-xs font-black">{overallAbsorption.toFixed(1)}%</span>
             </div>
             <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overallAbsorption}%` }}></div>
             </div>
          </div>
        </div>
      </div>

      {/* SECTION: Statistik Bidang (Jumlah ST, Realisasi, Outstanding) */}
      {bidangStats.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
           <div className="mb-4 ml-2">
             <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Kuantitas & Anggaran</h4>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surat Tugas, Realisasi & Sisa Pagu per Bidang</p>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
             {bidangStats.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all group cursor-default">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors mb-2">{item.bidang}</div>
                   
                   <div className="flex items-end gap-2 mb-4">
                      <span className="text-4xl font-black text-slate-800">{item.count}</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase mb-1.5">ST</span>
                   </div>

                   <div className="space-y-2 pt-3 border-t border-slate-50">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Realisasi</p>
                        <p className="text-[10px] font-black text-slate-700">{formatIDR(item.realization)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Outstanding</p>
                        <p className="text-[10px] font-black text-rose-500">{formatIDR(item.outstanding)}</p>
                      </div>
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-10">
              <div><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Analisis Bidang</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Distribusi Realisasi Terbesar</p></div>
              <span className="text-2xl">🏢</span>
           </div>
           <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {bidangSummary.map(([name, val], i) => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between items-center text-[11px] font-black text-slate-700 uppercase"><span>{name}</span><span className="text-slate-400">{formatIDR(val)}</span></div>
                   <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-slate-800 rounded-full" style={{ width: `${(val / (totalReal || 1)) * 100}%` }}></div></div>
                </div>
              ))}
           </div>
        </div>
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-10">
              <div><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Penyerapan MAK</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rincian Penyerapan per Akun</p></div>
              <span className="text-2xl">📑</span>
           </div>
           <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {makSummary.map(([code, val], i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-blue-600 group-hover:bg-white/20 group-hover:text-white transition-colors">{code}</div>
                      <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-blue-200">KODE MAK</span><span className="text-[12px] font-bold text-slate-800 group-hover:text-white">Akun {code}</span></div>
                   </div>
                   <div className="text-right"><p className="text-[13px] font-black text-slate-900 group-hover:text-white">{formatIDR(val)}</p><p className="text-[9px] font-bold text-slate-400 group-hover:text-blue-100 uppercase">{((val / (totalReal || 1)) * 100).toFixed(1)}% Share</p></div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-6">
          <div><h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Detail Transaksi Penugasan</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Monitoring per-Surat Tugas secara Terperinci</p></div>
          <div className="flex gap-3">
            <select value={tableBidangFilter} onChange={(e) => setTableBidangFilter(e.target.value)} className="bg-white border rounded-2xl px-6 py-3 text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer"><option value="ALL">SEMUA BIDANG</option>{allBidang.map(b => <option key={b} value={b}>{b}</option>)}</select>
            <button onClick={() => exportToExcel(data.rows, 'Daftar_ST_LIKE_PW36')} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest">📥 EXPORT</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-white text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><th className="p-10">Bidang</th><th className="p-10">No ST / Tanggal</th><th className="p-10">Uraian Penugasan</th><th className="p-10 text-right">Costsheet</th><th className="p-10 text-right">Realisasi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.rows.filter(r => tableBidangFilter === 'ALL' || String(getVal(r, ['BIDANG'])).toUpperCase() === tableBidangFilter).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-10"><span className="px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600">{getVal(row, ['BIDANG'])}</span></td>
                  <td className="p-10"><div className="text-[12px] font-bold text-blue-600 font-mono mb-1.5">{getVal(row, ['NO ST'])}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{getVal(row, ['TGL BERANGKAT', 'Tanggal'])}</div></td>
                  <td className="p-10 text-[11px] italic font-medium text-slate-500 max-w-[350px]">"{getVal(row, ['URAIAN ST', 'Uraian'])}"</td>
                  <td className="p-10 text-right font-bold text-slate-400 text-[12px]">{formatIDR(Number(getVal(row, ['COSTSHEET'])) || 0)}</td>
                  <td className="p-10 text-right font-black text-slate-900 text-[13px]">{formatIDR(Number(getVal(row, ['REALISASI'])) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;