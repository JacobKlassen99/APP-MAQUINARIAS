import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { gasService } from '../services/gasService';

interface ModalAdminAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminPass: string) => void;
  titulo?: string;
  accionDescripcion?: string;
}

export const ModalAdminAuth: React.FC<ModalAdminAuthProps> = ({
  isOpen,
  onClose,
  onSuccess,
  titulo = 'Autorización de Administrador',
  accionDescripcion = 'Ingrese la contraseña de Administrador para autorizar esta operación.'
}) => {
  const [password, setPassword] = useState<string>('');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg(null);
      setIsLoading(false);
      setMostrarPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !password.trim()) {
      setErrorMsg('Por favor ingrese la contraseña de Administrador.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await gasService.validarAdmin(password);
      if (res && res.ok) {
        const passValida = password;
        setPassword('');
        onSuccess(passValida);
        onClose();
      } else {
        setErrorMsg(res?.mensaje || 'Contraseña de administrador incorrecta.');
      }
    } catch (err: any) {
      console.error('Error al validar contraseña de Administrador:', err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Encabezado y botón cerrar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {titulo}
              </h3>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                Nivel Administrador
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Descripción de la acción */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {accionDescripcion}
        </p>

        {/* Advertencia de seguridad: Sin biometría para admin */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Las acciones de edición y eliminación requieren <strong>exclusivamente contraseña de administrador</strong>. No se permite biometría.
          </span>
        </div>

        {/* Mensaje de error si falla */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2 animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Contraseña de Administrador *
            </label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Escriba la contraseña Admin..."
                autoFocus
                disabled={isLoading}
                className="w-full h-11 pl-9 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>AUTORIZAR</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
