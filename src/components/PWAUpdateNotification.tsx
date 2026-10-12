import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

interface PWAUpdateNotificationProps {
  hasUnsavedChanges?: boolean;
}

export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({ hasUnsavedChanges = false }) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('pwa_update_dismissed') === 'true';
  });

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_update_dismissed', 'true');
  };

  const handleUpdateNow = () => {
    if (hasUnsavedChanges) {
      const confirmar = window.confirm(
        'Tiene cambios sin guardar en el formulario actual. Si actualiza ahora, se perderán los cambios no guardados. ¿Desea continuar con la actualización?'
      );
      if (!confirmar) {
        return;
      }
    }
    updateServiceWorker(true);
  };

  return (
    <div className="bg-blue-600 text-white px-4 sm:px-6 py-3.5 border-b border-blue-500 shadow-md z-20 no-print animate-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-blue-700/80 rounded-xl shrink-0">
            <RefreshCw className="w-5 h-5 text-white animate-spin" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
              Nueva versión disponible
            </h2>
            <p className="text-xs text-blue-100 font-medium">
              Hay una actualización de la aplicación.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={handleUpdateNow}
            className="px-3.5 py-1.5 bg-white text-blue-900 hover:bg-blue-50 active:scale-95 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar ahora</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 bg-blue-700/70 text-blue-100 hover:text-white hover:bg-blue-700 active:scale-95 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Descartar
          </button>

          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-blue-700/50 transition sm:hidden ml-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
