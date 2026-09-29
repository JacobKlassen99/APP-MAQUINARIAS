import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Tractor, 
  RefreshCw, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  CheckCircle2,
  AlertCircle,
  Hash
} from 'lucide-react';
import { Cliente, Operador, MaquinariaConfig, UnidadMedida } from '../types';
import { formatCurrency, coincideCliente } from '../utils/formatters';

interface ConfiguracionProps {
  clientes: Cliente[];
  operadores: Operador[];
  maquinaria: MaquinariaConfig[];
  serviciosCount: number;
  ultimoNumero: string;
  onGuardarCliente: (cliente: Cliente) => Promise<any>;
  onEliminarCliente: (cuenta: string, fila?: number) => Promise<any>;
  onGuardarOperador: (operador: string) => Promise<any>;
  onEliminarOperador: (operador: string, fila?: number) => Promise<any>;
  onGuardarMaquinaria: (item: MaquinariaConfig) => Promise<any>;
  onEliminarMaquinaria: (maquinaria: string, implemento: string, fila?: number) => Promise<any>;
  onSincronizarNumero: () => Promise<any>;
  onRefreshAll: () => Promise<any>;
}

type SubTab = 'clientes' | 'operadores' | 'maquinaria' | 'numeracion';

export const Configuracion: React.FC<ConfiguracionProps> = ({
  clientes,
  operadores,
  maquinaria,
  serviciosCount,
  ultimoNumero,
  onGuardarCliente,
  onEliminarCliente,
  onGuardarOperador,
  onEliminarOperador,
  onGuardarMaquinaria,
  onEliminarMaquinaria,
  onSincronizarNumero,
  onRefreshAll,
}) => {
  const [activeSubtab, setActiveSubtab] = useState<SubTab>('clientes');
  const [busqueda, setBusqueda] = useState<string>('');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // State for delete confirmation modal (Cliente, Operador, Maquinaria)
  const [itemAEliminar, setItemAEliminar] = useState<
    | { tipo: 'cliente'; cuenta: string; nombre: string; fila?: number }
    | { tipo: 'operador'; operador: string; fila?: number }
    | { tipo: 'maquinaria'; maquinaria: string; implemento: string; fila?: number }
    | null
  >(null);
  const [isEliminando, setIsEliminando] = useState<boolean>(false);

  const handleEjecutarEliminacion = async () => {
    if (!itemAEliminar) return;
    setIsEliminando(true);
    try {
      if (itemAEliminar.tipo === 'cliente') {
        await onEliminarCliente(itemAEliminar.cuenta, itemAEliminar.fila);
      } else if (itemAEliminar.tipo === 'operador') {
        await onEliminarOperador(itemAEliminar.operador, itemAEliminar.fila);
      } else if (itemAEliminar.tipo === 'maquinaria') {
        await onEliminarMaquinaria(itemAEliminar.maquinaria, itemAEliminar.implemento, itemAEliminar.fila);
      }
      setItemAEliminar(null);
    } catch (err) {
      console.error('Error al ejecutar eliminación en Google Sheets:', err);
    } finally {
      setIsEliminando(false);
    }
  };

  // Modals for add/edit
  const [modalType, setModalType] = useState<'cliente' | 'operador' | 'maquinaria' | null>(null);
  const [formCuenta, setFormCuenta] = useState<string>('');
  const [formNombre, setFormNombre] = useState<string>('');
  const [formOperador, setFormOperador] = useState<string>('');
  const [formMaquinaria, setFormMaquinaria] = useState<string>('');
  const [formImplemento, setFormImplemento] = useState<string>('');
  const [formPrecio, setFormPrecio] = useState<number>(0);
  const [formUnidad, setFormUnidad] = useState<UnidadMedida>('Hora');
  const [editItem, setEditItem] = useState<any>(null);

  // Clientes Filtering
  const clientesFiltrados = clientes.filter(c =>
    !busqueda.trim() || coincideCliente(c, busqueda)
  );

  // Operadores Filtering
  const operadoresFiltrados = operadores.filter(o =>
    o.operador.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Maquinaria Filtering
  const maquinariaFiltrada = maquinaria.filter(m =>
    m.maquinaria.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.implemento && m.implemento.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const openNuevoModal = (type: 'cliente' | 'operador' | 'maquinaria') => {
    setModalType(type);
    setEditItem(null);
    setFormCuenta('');
    setFormNombre('');
    setFormOperador('');
    setFormMaquinaria('');
    setFormImplemento('');
    setFormPrecio(0);
    setFormUnidad('Hora');
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCuenta || !formNombre) return;
    setIsProcessing(true);
    try {
      await onGuardarCliente({ cuenta: formCuenta.trim(), nombre: formNombre.trim() });
      setModalType(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOperador.trim()) return;
    setIsProcessing(true);
    try {
      await onGuardarOperador(formOperador.trim());
      setModalType(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMaquinaria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaquinaria.trim()) return;
    setIsProcessing(true);
    try {
      await onGuardarMaquinaria({
        maquinaria: formMaquinaria.trim(),
        implemento: formImplemento.trim(),
        precio: Number(formPrecio) || 0,
        unidad: formUnidad
      });
      setModalType(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSincronizar = async () => {
    setIsProcessing(true);
    try {
      const res = await onSincronizarNumero();
      setSyncMsg(`Numeración sincronizada correctamente. Último número: ${res?.ultimo || ultimoNumero}`);
      setTimeout(() => setSyncMsg(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Configuración y Catálogos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de clientes, operadores, maquinaria y numeración oficial
            </p>
          </div>

          <button
            onClick={onRefreshAll}
            disabled={isProcessing}
            className="p-2.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Recargar Datos</span>
          </button>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex flex-wrap gap-2 pt-3">
          <button
            onClick={() => { setActiveSubtab('clientes'); setBusqueda(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeSubtab === 'clientes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes ({clientes.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubtab('operadores'); setBusqueda(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeSubtab === 'operadores'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Operadores ({operadores.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubtab('maquinaria'); setBusqueda(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeSubtab === 'maquinaria'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tractor className="w-4 h-4" />
            <span>Maquinaria y Precios ({maquinaria.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubtab('numeracion'); setBusqueda(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeSubtab === 'numeracion'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Sincronización</span>
          </button>
        </div>
      </div>

      {/* ================= SUBTAB: CLIENTES ================= */}
      {activeSubtab === 'clientes' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar cliente por cuenta o nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <button
              onClick={() => openNuevoModal('cliente')}
              className="w-full sm:w-auto h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Cliente</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Cuenta</th>
                  <th className="px-4 py-3">Nombre del Cliente</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-400">
                      No se encontraron clientes registrados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((c) => (
                    <tr key={c.cuenta} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                        #{c.cuenta}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {c.nombre}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setItemAEliminar({ tipo: 'cliente', cuenta: c.cuenta, nombre: c.nombre, fila: c.fila })}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: OPERADORES ================= */}
      {activeSubtab === 'operadores' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar operador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <button
              onClick={() => openNuevoModal('operador')}
              className="w-full sm:w-auto h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Operador</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre del Operador</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {operadoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-slate-400">
                      No se encontraron operadores registrados.
                    </td>
                  </tr>
                ) : (
                  operadoresFiltrados.map((o) => (
                    <tr key={o.operador} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {o.operador}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setItemAEliminar({ tipo: 'operador', operador: o.operador, fila: o.fila })}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar operador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: MAQUINARIA ================= */}
      {activeSubtab === 'maquinaria' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar maquinaria o implemento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <button
              onClick={() => openNuevoModal('maquinaria')}
              className="w-full sm:w-auto h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Maquinaria / Tarifa</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Maquinaria</th>
                  <th className="px-4 py-3">Implemento / Servicio</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3 text-right">Precio Oficial</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {maquinariaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No se encontraron maquinarias registradas.
                    </td>
                  </tr>
                ) : (
                  maquinariaFiltrada.map((m, idx) => (
                    <tr key={`${m.maquinaria}-${m.implemento}-${idx}`} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {m.maquinaria}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {m.implemento || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {m.unidad}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-blue-900 whitespace-nowrap">
                        {formatCurrency(m.precio)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setItemAEliminar({ tipo: 'maquinaria', maquinaria: m.maquinaria, implemento: m.implemento, fila: m.fila })}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: NUMERACIÓN Y RESUMEN ================= */}
      {activeSubtab === 'numeracion' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Sincronización de Numeración</h3>
            <p className="text-xs text-slate-500">
              Garantiza la correlatividad consecutiva de servicios oficiales (ej: SERV-000001, SERV-000005)
            </p>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-slate-500">Último Número Registrado:</span>
              <div className="text-3xl font-black text-blue-900 font-mono-numbers mt-1">
                {ultimoNumero}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Total de servicios en la hoja: <strong>{serviciosCount}</strong>
              </span>
            </div>

            <button
              onClick={handleSincronizar}
              disabled={isProcessing}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Numeración</span>
            </button>
          </div>

          {syncMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold text-emerald-800 animate-in fade-in">
              {syncMsg}
            </div>
          )}
        </div>
      )}

      {/* Modal Agregar Cliente */}
      {modalType === 'cliente' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveCliente} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Nuevo Cliente</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Número de Cuenta *
              </label>
              <input
                type="text"
                placeholder="Ej: 125, 204..."
                value={formCuenta}
                onChange={(e) => setFormCuenta(e.target.value)}
                required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                placeholder="Ej: Agropecuaria San José, Pedro López..."
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Agregar Operador */}
      {modalType === 'operador' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveOperador} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Nuevo Operador</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre del Operador / Personal *
              </label>
              <input
                type="text"
                placeholder="Ej: Mario Ramos..."
                value={formOperador}
                onChange={(e) => setFormOperador(e.target.value)}
                required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Guardar Operador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Agregar Maquinaria */}
      {modalType === 'maquinaria' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveMaquinaria} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Nueva Maquinaria / Tarifa</h3>
              <button type="button" onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre de Maquinaria *
              </label>
              <input
                type="text"
                placeholder="Ej: Tractor Valtra 180..."
                value={formMaquinaria}
                onChange={(e) => setFormMaquinaria(e.target.value)}
                required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Implemento / Servicio
              </label>
              <input
                type="text"
                placeholder="Ej: Subsolador, Desmalezado..."
                value={formImplemento}
                onChange={(e) => setFormImplemento(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unidad de Medida *
                </label>
                <select
                  value={formUnidad}
                  onChange={(e) => setFormUnidad(e.target.value as UnidadMedida)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hora">Hora</option>
                  <option value="Unidad">Unidad</option>
                  <option value="Kilómetro">Kilómetro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Precio Unitario ($us.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrecio || ''}
                  onChange={(e) => setFormPrecio(parseFloat(e.target.value) || 0)}
                  required
                  placeholder="0.00"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Guardar Tarifa
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Confirmación de Eliminación */}
      {itemAEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-base">
                {itemAEliminar.tipo === 'cliente' && '¿Está seguro de que desea eliminar este cliente?'}
                {itemAEliminar.tipo === 'operador' && '¿Está seguro de que desea eliminar este operador?'}
                {itemAEliminar.tipo === 'maquinaria' && '¿Está seguro de que desea eliminar esta maquinaria?'}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                {itemAEliminar.tipo === 'cliente' && (
                  <>
                    Se eliminará el cliente <strong className="text-slate-800">{itemAEliminar.nombre}</strong> (Cuenta #{itemAEliminar.cuenta}) de la hoja de Google Sheets.
                  </>
                )}
                {itemAEliminar.tipo === 'operador' && (
                  <>
                    Se eliminará al operador <strong className="text-slate-800">{itemAEliminar.operador}</strong> de la hoja de Google Sheets.
                  </>
                )}
                {itemAEliminar.tipo === 'maquinaria' && (
                  <>
                    Se eliminará la tarifa de <strong className="text-slate-800">{itemAEliminar.maquinaria}</strong>
                    {itemAEliminar.implemento ? ` (${itemAEliminar.implemento})` : ''} de la hoja de Google Sheets.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isEliminando}
                onClick={() => setItemAEliminar(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isEliminando}
                onClick={handleEjecutarEliminacion}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isEliminando && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
