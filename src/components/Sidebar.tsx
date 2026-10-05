import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  X
} from 'lucide-react';
import { MotoniveladoraIcon } from './MotoniveladoraIcon';
import { PWAInstallButton } from './PWAInstallButton';

export type TabType = 'dashboard' | 'nuevo' | 'registros' | 'reportes' | 'config';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  serviciosCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  serviciosCount
}) => {
  const menuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" /> 
    },
    { 
      id: 'nuevo', 
      label: 'Nuevo Servicio', 
      icon: <PlusCircle className="w-5 h-5 text-emerald-400" /> 
    },
    { 
      id: 'registros', 
      label: 'Registros', 
      icon: <ClipboardList className="w-5 h-5" />,
      badge: serviciosCount
    },
    { 
      id: 'reportes', 
      label: 'Reportes', 
      icon: <BarChart3 className="w-5 h-5" /> 
    },
    { 
      id: 'config', 
      label: 'Configuración', 
      icon: <Settings className="w-5 h-5" /> 
    }
  ];

  return (
    <>
      {/* Overlay Backdrop for Mobile Drawer */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile} 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200" 
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-[#0a2342] text-white flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl no-print`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <MotoniveladoraIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase leading-tight">
                Control de Maquinaria
              </h1>
              <p className="text-[11px] text-blue-300 font-medium">Gestión de Servicios</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile} 
            className="md:hidden text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-900/50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 text-left ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-blue-100/80 hover:bg-blue-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-blue-300'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    isActive 
                      ? 'bg-blue-800 text-white' 
                      : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* In-App PWA Install in Sidebar */}
        <div className="px-4 py-2">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Footer info without technical codes */}
        <div className="p-4 border-t border-blue-900/40 text-xs text-blue-300/80 text-center">
          <p className="font-semibold text-white">CONTROL DE MAQUINARIA</p>
          <p className="text-[11px] text-blue-300/60 mt-0.5">Base de datos Google Sheets</p>
        </div>
      </aside>
    </>
  );
};
