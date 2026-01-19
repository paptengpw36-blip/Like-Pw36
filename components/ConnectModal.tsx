import React, { useState } from 'react';

interface ConnectModalProps {
  onConnect: (url: string) => void;
  onClose: () => void;
  currentUrl: string;
}

const ConnectModal: React.FC<ConnectModalProps> = ({ onConnect, onClose, currentUrl }) => {
  const [url, setUrl] = useState(currentUrl);
  // Jika sudah ada URL (bukan pertama kali), kunci modalnya
  const [isLocked, setIsLocked] = useState(!!currentUrl);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // PIN Sederhana untuk Admin
    if (pin.toLowerCase() === 'admin') {
      setIsLocked(false);
      setError('');
    } else {
      setError('PIN salah! Akses pengaturan ditolak.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConnect(url.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={!isLocked ? onClose : undefined}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-8 pb-0 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLocked ? 'Pengaturan Admin' : 'Hubungkan Spreadsheet'}
            </h3>
            <p className="text-slate-400 text-sm font-bold mt-1">
              {isLocked ? 'Area terbatas khusus Administrator' : 'Konfigurasi Sumber Data LIKE PW36'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 font-bold transition-colors">
            ✕
          </button>
        </div>

        <div className="p-8">
          {isLocked ? (
            /* TAMPILAN TERKUNCI (Meminta PIN) */
            <form onSubmit={handleUnlock} className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🔒</div>
                <h4 className="font-bold text-slate-800">Konfigurasi Terkunci</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Link Spreadsheet sudah tersimpan. Masukkan PIN Admin untuk mengubah konfigurasi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">PIN ADMIN</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
                {error && <p className="text-red-500 text-xs font-bold mt-2 text-center animate-pulse">{error}</p>}
              </div>

              <button 
                type="submit"
                className="w-full py-4 text-sm font-black bg-slate-900 text-white rounded-xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest"
              >
                Buka Pengaturan
              </button>
            </form>
          ) : (
            /* TAMPILAN TERBUKA (Input URL) */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Link Google Spreadsheet</label>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-blue-900"
                  autoFocus
                />
                <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                   <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-wide mb-1">
                    ⚠️ Syarat Konfigurasi:
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Pastikan akses Spreadsheet diatur ke <span className="text-blue-600 font-bold">"Siapa saja yang memiliki link dapat melihat"</span> (Anyone with the link can view).
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-xs font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-colors uppercase tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-xs font-black bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-95"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;