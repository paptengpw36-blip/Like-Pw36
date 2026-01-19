import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView, toggle }) => {
  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard Utama' },
    { id: 'personil', icon: '👥', label: 'Monitoring Personil' },
    { id: 'realisasi', icon: '📅', label: 'Laporan Realisasi' },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-[#001f3f] text-white transition-all duration-300 z-50 shadow-2xl ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center p-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl tracking-tight">LIKE</span>
            <span className="text-blue-400 font-bold text-xl italic">PW36</span>
          </div>
          {isOpen && (
             <button 
                onClick={toggle}
                className="ml-auto p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
              >
                ←
              </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg mr-4">{item.icon}</span>
              {isOpen && <span className="font-medium whitespace-nowrap text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;