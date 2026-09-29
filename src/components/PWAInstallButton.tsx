import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { canInstall, isInstalled, isIOS, installPWA } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await installPWA();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          (variant === 'header'
            ? 'px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse hover:animate-none'
            : 'w-full px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer')
        }
        title="Instalar aplicación en tu dispositivo"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">Instalar App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Instalar en iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Para instalar <strong>CONTROL DE MAQUINARIA</strong> en tu pantalla de inicio desde Safari:
            </p>

            <ol className="text-xs space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari</span>
                <Share className="w-4 h-4 text-blue-600 shrink-0 inline ml-auto" />
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Baja y selecciona <strong>Agregar a pantalla de inicio</strong></span>
                <PlusSquare className="w-4 h-4 text-blue-600 shrink-0 inline ml-auto" />
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Presiona <strong>Agregar</strong> arriba a la derecha</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
