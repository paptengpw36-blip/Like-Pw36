import React, { useState, useEffect, useCallback } from 'react';
import { fetchGoogleSheetData, getMockData, DEFAULT_SHEET_URL } from './services/sheetService';
import { SheetData, DashboardState } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardContent from './components/DashboardContent';
import ConnectModal from './components/ConnectModal';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  // LOGIKA INISIALISASI URL:
  // 1. Cek Link Share (?source=...) -> Prioritas tertinggi, simpan ke local
  // 2. Cek LocalStorage -> Jika user pernah setting sebelumnya
  // 3. Cek DEFAULT_SHEET_URL -> Hardcode dari config
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const querySource = params.get('source');
      if (querySource) {
        localStorage.setItem('sheet_url', querySource);
        return querySource;
      }
      return localStorage.getItem('sheet_url') || DEFAULT_SHEET_URL || null;
    }
    return null;
  });

  const [data, setData] = useState<SheetData | null>(null);
  const [status, setStatus] = useState<DashboardState>(DashboardState.IDLE);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Modal hanya muncul jika TIDAK ADA url sama sekali (dari source manapun)
  const [isModalOpen, setIsModalOpen] = useState(!sheetUrl);
  
  const [aiInsights, setAiInsights] = useState<string>('');
  const [activeView, setActiveView] = useState('dashboard');

  const loadData = useCallback(async (url: string) => {
    if (status === DashboardState.ANALYZING) return;
    setStatus(DashboardState.LOADING);
    try {
      const result = await fetchGoogleSheetData(url);
      setData(result);
      setLastUpdated(new Date());
      setStatus(DashboardState.IDLE);
    } catch (err) {
      console.error(err);
      setStatus(DashboardState.ERROR);
      if (!data) setData(getMockData());
    }
  }, [data, status]);

  useEffect(() => {
    if (sheetUrl) {
      loadData(sheetUrl);
    } else {
      setData(getMockData());
    }
  }, [sheetUrl]);

  useEffect(() => {
    if (!sheetUrl) return;
    const interval = setInterval(() => {
      loadData(sheetUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, [sheetUrl, loadData]);

  const handleConnect = (url: string) => {
    setSheetUrl(url);
    localStorage.setItem('sheet_url', url);
    setIsModalOpen(false);

    // Update Browser URL agar Admin bisa copy link ini ke user lain
    // User lain yang buka link ini otomatis akan tersimpan setting-nya
    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', url);
      window.history.pushState({}, '', newUrl);
    } catch (e) {
      // Ignore error if URL update fails
    }
  };

  const generateAIInsights = async () => {
    if (!data || !process.env.API_KEY) return;
    setStatus(DashboardState.ANALYZING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analisis data anggaran LIKE PW36 ini. Berikan 3 wawasan utama mengenai penyerapan anggaran dalam bahasa Indonesia.
        Format dalam list markdown yang rapi.
        Data Sample: ${JSON.stringify(data.rows.slice(0, 15))}
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiInsights(response.text || 'Tidak dapat menghasilkan wawasan.');
    } catch (error) {
      setAiInsights('Gagal menghasilkan analisis AI.');
    } finally {
      setStatus(DashboardState.IDLE);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F2F5] text-slate-900">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeView={activeView}
        setActiveView={setActiveView}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'} p-4 md:p-8 min-w-0`}>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
            <span className={`w-2 h-2 rounded-full ${status === DashboardState.LOADING ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            {status === DashboardState.LOADING ? 'SINKRONISASI...' : `LIKE PW36 • Update: ${lastUpdated.toLocaleTimeString()}`}
          </div>
          <Header 
            onRefresh={() => sheetUrl && loadData(sheetUrl)} 
            onOpenSettings={() => setIsModalOpen(true)}
            onGenerateAI={generateAIInsights}
            isAnalyzing={status === DashboardState.ANALYZING}
            isLoading={status === DashboardState.LOADING}
          />
        </div>

        {status === DashboardState.LOADING && !data ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-500 font-medium">Menghubungkan ke Spreadsheet...</p>
          </div>
        ) : (
          <DashboardContent 
            data={data || getMockData()} 
            aiInsights={aiInsights} 
            view={activeView}
          />
        )}
      </main>

      {isModalOpen && (
        <ConnectModal 
          onConnect={handleConnect} 
          onClose={() => setIsModalOpen(false)} 
          currentUrl={sheetUrl || ''}
        />
      )}
    </div>
  );
};

export default App;