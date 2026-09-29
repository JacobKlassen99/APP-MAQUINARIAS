/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  X,
  Tractor,
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  BarChart3,
  Settings
} from 'lucide-react';

import { 
  Cliente, 
  Operador, 
  MaquinariaConfig, 
  Servicio, 
  DashboardStats 
} from './types';
import { gasService } from './services/gasService';
import { ordenarServiciosDesc } from './utils/formatters';

// Components
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NuevoServicio } from './components/NuevoServicio';
import { Registros } from './components/Registros';
import { Reportes } from './components/Reportes';
import { Configuracion } from './components/Configuracion';
import { ComprobanteModal } from './components/ComprobanteModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Real Database State from Google Sheets
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [maquinariaList, setMaquinariaList] = useState<MaquinariaConfig[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalServicios: 0,
    serviciosHoy: 0,
    serviciosMes: 0,
    horasMes: 0,
    totalMes: 0,
    ultimoServicio: null,
    ultimosServicios: []
  });
  const [siguienteNumero, setSiguienteNumero] = useState<string>('SERV-000001');
  const [ultimoNumero, setUltimoNumero] = useState<string>('SERV-000000');

  // Service for editing / receipt
  const [servicioEdicion, setServicioEdicion] = useState<Servicio | null>(null);
  const [comprobanteServicio, setComprobanteServicio] = useState<Servicio | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'error' } | null>(null);
  const [connectionError, setConnectionError] = useState<{ msg: string; detalle?: string } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Fetch all initial data from Google Sheets
  const cargarTodo = useCallback(async (silencioso: boolean = false) => {
    if (!silencioso) setIsLoading(true);
    try {
      const [iniciales, serviciosRes, dashboardRes] = await Promise.all([
        gasService.obtenerDatosIniciales(),
        gasService.obtenerServicios(),
        gasService.obtenerDashboard()
      ]);

      if (iniciales) {
        setClientes(iniciales.clientes || []);
        setOperadores(iniciales.operadores || []);
        setMaquinariaList(iniciales.maquinaria || []);
        if (iniciales.siguienteNumero) setSiguienteNumero(iniciales.siguienteNumero);
        if (iniciales.ultimoNumero) setUltimoNumero(iniciales.ultimoNumero);
      }

      if (Array.isArray(serviciosRes)) {
        const ordenados = ordenarServiciosDesc(serviciosRes);
        setServicios(ordenados);

        if (dashboardRes) {
          setStats({
            ...dashboardRes,
            ultimoServicio: ordenados[0] || dashboardRes.ultimoServicio || null,
            ultimosServicios: ordenados.slice(0, 5),
          });
        }
      } else if (dashboardRes) {
        setStats(dashboardRes);
      }
      setConnectionError(null);
    } catch (err: any) {
      console.error('Error al cargar datos desde Google Sheets:', err);
      const errMsg = err.message || 'Error de conexión';
      setConnectionError({ msg: errMsg, detalle: err.detalle });
      showToast('Error de conexión con Google Sheets: ' + errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial mount
  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // When switching tabs, clean any modal state and re-query Google Sheets
  const handleSelectTab = (tab: TabType) => {
    document.body.classList.remove('comprobante-modal-open');
    setActiveTab(tab);
    if (tab === 'registros') {
      gasService.obtenerServicios()
        .then(res => {
          if (Array.isArray(res)) setServicios(ordenarServiciosDesc(res));
        })
        .catch(err => {
          console.error('Error al actualizar registros:', err);
        });
    } else if (tab === 'dashboard') {
      gasService.obtenerDashboard()
        .then(d => {
          if (d) setStats(d);
        })
        .catch(console.error);
    }
  };

  // Guardar Servicio (Priority requirement)
  const handleGuardarServicio = async (datos: Omit<Servicio, 'nroServicio'> & { nroServicio?: string; forzarGuardar?: boolean }) => {
    setIsSaving(true);
    try {
      const esEdicion = !!datos.nroServicio;
      const res = esEdicion
        ? await gasService.editarServicio(datos)
        : await gasService.guardarServicio(datos, datos.forzarGuardar);

      if (res && (res.exito || res.ok)) {
        showToast(res.mensaje || 'Servicio guardado correctamente en Google Sheets.', 'ok');
        setServicioEdicion(null);

        // Immediately refresh state directly from Google Sheets
        await cargarTodo(true);

        // Switch to Registros to inspect the newly recorded service
        setActiveTab('registros');
      } else {
        const errorMsg = res?.mensaje || 'No se pudo guardar el servicio en Google Sheets.';
        showToast(`No se pudo guardar el servicio: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Error al guardar servicio:', err);
      showToast(`No se pudo guardar el servicio: ${err.message || 'Error del servidor'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar Servicio
  const handleEliminarServicio = async (nroServicio: string, fila?: number) => {
    setIsLoading(true);
    try {
      const res = await gasService.eliminarServicio(nroServicio, fila);
      if (res && (res.exito || res.ok)) {
        showToast(res.mensaje || 'Servicio eliminado correctamente de Google Sheets.', 'ok');
        await cargarTodo(true);
      } else {
        showToast(`No se pudo eliminar: ${res?.mensaje || 'Error desconocido'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate checker helper
  const checkDuplicate = (data: Partial<Servicio>, excludeNro?: string): Servicio | null => {
    return servicios.find(s => {
      if (excludeNro && s.nroServicio === excludeNro) return false;
      return (
        s.fecha === data.fecha &&
        String(s.cuenta) === String(data.cuenta) &&
        s.maquinaria === data.maquinaria &&
        String(s.implemento || '') === String(data.implemento || '') &&
        s.operador === data.operador &&
        String(s.tipo || '') === String(data.tipo || '') &&
        String(s.inicio || '') === String(data.inicio || '') &&
        String(s.fin || '') === String(data.fin || '')
      );
    }) || null;
  };

  const maquinasUnicas = Array.from(new Set(maquinariaList.map(m => m.maquinaria)));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased pb-20 md:pb-0">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-3 duration-200">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
            toast.type === 'ok' 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : 'bg-red-600 text-white border-red-500'
          }`}>
            <div className="flex items-center gap-3">
              {toast.type === 'ok' ? (
                <CheckCircle className="w-5 h-5 shrink-0 text-white" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-white" />
              )}
              <span className="text-xs sm:text-sm font-bold leading-snug">{toast.msg}</span>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Clean, No Technical Tabs) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        serviciosCount={servicios.length}
      />

      {/* Main Body Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Bar (Deep Blue, Mobile Friendly) */}
        <header className="bg-[#0a2342] text-white px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-md shadow-blue-950/20 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpenMobile(true)}
              className="md:hidden text-white p-1.5 rounded-lg hover:bg-blue-900/60 focus:outline-none"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white md:hidden">
                <Tractor className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base tracking-wide uppercase leading-tight text-white">
                  Control de Maquinaria
                </h1>
                <p className="text-[10px] text-blue-300 font-semibold hidden sm:block">
                  Conectado con Google Sheets
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => cargarTodo()}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 hover:text-white border border-blue-700/50 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              title="Sincronizar con Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={() => {
                setServicioEdicion(null);
                setActiveTab('nuevo');
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
        </header>

        {/* Real Connection Status Banner if error */}
        {connectionError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-amber-900 no-print animate-in fade-in">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold text-amber-950 block">
                    Conexión con el Web App de Google Apps Script:
                  </strong>
                  <span>{connectionError.msg}</span>
                  {connectionError.detalle && (
                    <p className="mt-1 text-[11px] text-amber-800 font-mono bg-amber-100/70 p-1.5 rounded-lg border border-amber-200/80">
                      {connectionError.detalle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => cargarTodo()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                Reintentar conexión
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              onNuevoClick={() => {
                setServicioEdicion(null);
                setActiveTab('nuevo');
              }}
              onVerRegistrosClick={() => setActiveTab('registros')}
              onSelectServicio={(s) => setComprobanteServicio(s)}
            />
          )}

          {activeTab === 'nuevo' && (
            <NuevoServicio
              clientes={clientes}
              operadores={operadores}
              maquinariaList={maquinariaList}
              servicioEdicion={servicioEdicion}
              siguienteNumero={siguienteNumero}
              isSaving={isSaving}
              onGuardar={handleGuardarServicio}
              onCancelarEdicion={() => {
                setServicioEdicion(null);
                setActiveTab('registros');
              }}
              checkDuplicate={checkDuplicate}
            />
          )}

          {activeTab === 'registros' && (
            <Registros
              servicios={servicios}
              isLoading={isLoading}
              onEditar={(s) => {
                setServicioEdicion(s);
                setActiveTab('nuevo');
              }}
              onEliminar={handleEliminarServicio}
              onImprimir={(s) => setComprobanteServicio(s)}
              onNuevoClick={() => {
                setServicioEdicion(null);
                setActiveTab('nuevo');
              }}
              onRefresh={() => cargarTodo()}
              maquinariaList={maquinasUnicas}
            />
          )}

          {activeTab === 'reportes' && (
            <Reportes servicios={servicios} />
          )}

          {activeTab === 'config' && (
            <Configuracion
              clientes={clientes}
              operadores={operadores}
              maquinaria={maquinariaList}
              serviciosCount={servicios.length}
              ultimoNumero={ultimoNumero}
              onGuardarCliente={async (c) => {
                const res = await gasService.guardarCliente(c);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onEliminarCliente={async (cuenta, fila) => {
                const res = await gasService.eliminarCliente(cuenta, fila);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onGuardarOperador={async (op) => {
                const res = await gasService.guardarOperador(op);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onEliminarOperador={async (op, fila) => {
                const res = await gasService.eliminarOperador(op, fila);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onGuardarMaquinaria={async (item) => {
                const res = await gasService.guardarMaquinaria(item);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onEliminarMaquinaria={async (m, imp, fila) => {
                const res = await gasService.eliminarMaquinaria(m, imp, fila);
                showToast(res.mensaje, res.exito ? 'ok' : 'error');
                await cargarTodo(true);
              }}
              onSincronizarNumero={async () => {
                const res = await gasService.sincronizarNumeroServicios();
                if (res?.ultimo) setUltimoNumero(res.ultimo);
                await cargarTodo(true);
                return res;
              }}
              onRefreshAll={() => cargarTodo()}
            />
          )}
        </main>
      </div>

      {/* MOBILE-FIRST FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-1 shadow-lg no-print">
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition ${
            activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => {
            setServicioEdicion(null);
            handleSelectTab('nuevo');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition ${
            activeTab === 'nuevo' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5 text-blue-600" />
          <span>Nuevo</span>
        </button>

        <button
          onClick={() => handleSelectTab('registros')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition relative ${
            activeTab === 'registros' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span>Registros</span>
          {servicios.length > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-mono flex items-center justify-center">
              {servicios.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleSelectTab('reportes')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition ${
            activeTab === 'reportes' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Reportes</span>
        </button>

        <button
          onClick={() => handleSelectTab('config')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition ${
            activeTab === 'config' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Config</span>
        </button>
      </nav>

      {/* Comprobante Modal */}
      {comprobanteServicio && (
        <ComprobanteModal
          servicio={comprobanteServicio}
          onClose={() => {
            setComprobanteServicio(null);
            document.body.classList.remove('comprobante-modal-open');
          }}
        />
      )}
    </div>
  );
}
