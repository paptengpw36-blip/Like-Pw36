
import React from 'react';

interface HeaderProps {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onGenerateAI: () => void;
  isAnalyzing: boolean;
  isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, onOpenSettings, onGenerateAI, isAnalyzing, isLoading }) => {
  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={onGenerateAI}
        disabled={isAnalyzing}
        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isAnalyzing ? '...' : '✨ ANALISIS AI'}
      </button>

      <button 
        onClick={onRefresh}
        className={`p-1.5 bg-white border border-slate-200 text-slate-400 rounded hover:bg-slate-50 transition-colors ${isLoading ? 'animate-spin text-blue-500' : ''}`}
        title="Refresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <button 
        onClick={onOpenSettings}
        className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded hover:bg-slate-50 transition-colors"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      </button>
    </div>
  );
};

export default Header;
