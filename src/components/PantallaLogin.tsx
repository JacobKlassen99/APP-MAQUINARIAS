import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Fingerprint, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { MotoniveladoraIcon } from './MotoniveladoraIcon';
import { gasService } from '../services/gasService';
import { 
  soportaWebAuthn, 
  tieneAutenticadorBiometrico, 
  tieneBiometriaRegistrada, 
  obtenerVersionRegistrada,
  autenticarConBiometria, 
  registrarBiometria,
  desactivarBiometria
} from '../utils/webauthn';

interface PantallaLoginProps {
  onLoginSuccess: () => void;
}

export const PantallaLogin: React.FC<PantallaLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState<string>('');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de biometría WebAuthn
  const [dispositivoSoportaBiometria, setDispositivoSoportaBiometria] = useState<boolean>(false);
  const [biometriaHabilitada, setBiometriaHabilitada] = useState<boolean>(false);
  const [modoPasswordForzado, setModoPasswordForzado] = useState<boolean>(false);
  const [mostrarOfertaBiometria, setMostrarOfertaBiometria] = useState<boolean>(false);
  const [isRegistrandoBiometria, setIsRegistrandoBiometria] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string>('');

  useEffect(() => {
    async function verificarCapacidades() {
      const tieneRegistro = tieneBiometriaRegistrada();
      const soportaPlataforma = await tieneAutenticadorBiometrico();
      setDispositivoSoportaBiometria(soportaPlataforma);

      if (tieneRegistro) {
        try {
          const versionServer = await gasService.obtenerVersionAcceso();
          const versionRegistrada = obtenerVersionRegistrada();
          if (versionServer && versionRegistrada && versionServer !== versionRegistrada) {
            // Contraseña cambió en Google Sheets -> considerar vencida
            desactivarBiometria();
            setBiometriaHabilitada(false);
            setErrorMsg('La contraseña del sistema ha sido actualizada. Por favor ingrese su nueva contraseña.');
          } else {
            setBiometriaHabilitada(true);
            if (versionServer) setServerVersion(versionServer);
          }
        } catch {
          setBiometriaHabilitada(true);
        }
      }
    }
    verificarCapacidades();
  }, []);

  // Manejo de inicio de sesión con contraseña
  const handleIngresarConPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password || !password.trim()) {
      setErrorMsg('Por favor ingrese la contraseña de usuario.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await gasService.validarAccesoUsuario(password);
      if (res && res.ok) {
        // Contraseña correcta
        setPassword('');
        let currentVer = '';
        try {
          currentVer = await gasService.obtenerVersionAcceso();
          setServerVersion(currentVer);
        } catch {}

        // Si el teléfono tiene autenticador biométrico y aún no lo ha registrado o cambió la versión, ofrecer activarlo
        if (dispositivoSoportaBiometria && (!biometriaHabilitada || obtenerVersionRegistrada() !== currentVer)) {
          setMostrarOfertaBiometria(true);
        } else {
          onLoginSuccess();
        }
      } else {
        setErrorMsg(res?.mensaje || 'Contraseña incorrecta.');
      }
    } catch (err: any) {
      console.error('Error al validar acceso de usuario:', err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de inicio de sesión con huella / rostro
  const handleIngresarConBiometria = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const versionServer = await gasService.obtenerVersionAcceso();
      const versionRegistrada = obtenerVersionRegistrada();
      if (versionServer && versionRegistrada && versionServer !== versionRegistrada) {
        desactivarBiometria();
        setBiometriaHabilitada(false);
        setErrorMsg('La contraseña ha cambiado. Por favor ingrese su nueva contraseña.');
        setIsLoading(false);
        return;
      }

      const res = await autenticarConBiometria();
      if (res.ok) {
        onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'No se pudo verificar la identidad biométrica.');
      }
    } catch (err: any) {
      console.error('Error en autenticación biométrica:', err);
      setErrorMsg('Error durante la verificación biométrica.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de activación de biometría tras primer ingreso correcto
  const handleAceptarOfertaBiometria = async () => {
    setIsRegistrandoBiometria(true);
    try {
      const res = await registrarBiometria(serverVersion);
      if (res.ok) {
        setBiometriaHabilitada(true);
        setMostrarOfertaBiometria(false);
        onLoginSuccess();
      } else {
        // Si el usuario canceló el registro biométrico, igual permitir entrar
        setMostrarOfertaBiometria(false);
        onLoginSuccess();
      }
    } catch {
      setMostrarOfertaBiometria(false);
      onLoginSuccess();
    } finally {
      setIsRegistrandoBiometria(false);
    }
  };

  const handleRechazarOfertaBiometria = () => {
    setMostrarOfertaBiometria(false);
    onLoginSuccess();
  };

  // Modal para ofrecer activación de huella / rostro
  if (mostrarOfertaBiometria) {
    return (
      <div className="min-h-screen bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Fingerprint className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900">
              Activar acceso con huella o rostro
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              En este teléfono puede ingresar más rápido utilizando el sensor de huella digital, reconocimiento facial o bloqueo de pantalla configurado en su dispositivo.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-left flex items-start gap-2 border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Sus datos biométricos permanecen protegidos en su teléfono. La aplicación no lee ni guarda sus huellas.
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleAceptarOfertaBiometria}
              disabled={isRegistrandoBiometria}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRegistrandoBiometria ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Esperando confirmación...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Activar Huella / Rostro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRechazarOfertaBiometria}
              disabled={isRegistrandoBiometria}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Ahora no, ingresar normalmente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a2342] via-[#0d2e56] to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Cabecera institucional */}
        <div className="bg-[#0a2342] p-7 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-900/50">
            <MotoniveladoraIcon className="w-9 h-9 text-white" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-300 block">
            SISTEMA DE GESTIÓN OFICIAL
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            Control de Maquinaria
          </h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Acceso seguro a la plataforma
          </p>
        </div>

        {/* Cuerpo del formulario de acceso */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Mensaje de error si la contraseña fue incorrecta */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* OPCIÓN 1: Ingreso rápido con Biometría (si ya fue registrada) */}
          {biometriaHabilitada && !modoPasswordForzado ? (
            <div className="space-y-4 py-2 text-center">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-blue-900 block">
                  Autenticación Biométrica Disponible
                </span>
                <p className="text-[11px] text-slate-500">
                  Puede ingresar usando el sensor de huella digital o reconocimiento facial de su teléfono.
                </p>
              </div>

              <button
                type="button"
                onClick={handleIngresarConBiometria}
                disabled={isLoading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6" />
                    <span>INGRESAR CON HUELLA / ROSTRO</span>
                  </>
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">O también</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModoPasswordForzado(true)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span>INGRESAR CON CONTRASEÑA</span>
              </button>
            </div>
          ) : (
            /* OPCIÓN 2: Ingreso con Contraseña de Usuario */
            <form onSubmit={handleIngresarConPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>Contraseña de Usuario</span>
                  {biometriaHabilitada && modoPasswordForzado && (
                    <button
                      type="button"
                      onClick={() => setModoPasswordForzado(false)}
                      className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      Usar Huella / Rostro
                    </button>
                  )}
                </label>

                <div className="relative">
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Escriba la contraseña de acceso..."
                    autoFocus
                    disabled={isLoading}
                    className="w-full h-12 pl-10 pr-11 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                  
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validando acceso...</span>
                  </>
                ) : (
                  <>
                    <span>INGRESAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Información de seguridad al pie */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Acceso protegido. Las funciones de edición y eliminación requieren contraseña de Administrador.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
