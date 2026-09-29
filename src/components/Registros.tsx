import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Printer, 
  AlertCircle,
  Plus,
  RefreshCw,
  Tractor,
  Calendar,
  User,
  Clock,
  DollarSign
} from 'lucide-react';
import { Servicio, FiltrosServicio } from '../types';
import { formatCurrency, formatNumber, formatDateDisplay, ordenarServiciosDesc } from '../utils/formatters';

interface RegistrosProps {
  servicios: Servicio[];
  isLoading: boolean;
  onEditar: (servicio: Servicio) => void;
  onEliminar: (nroServicio: string, fila?: number) => void;
  onImprimir: (servicio: Servicio) => void;
  onNuevoClick: () => void;
  onRefresh: () => void;
  maquinariaList: string[];
}

export const Registros: React.FC<RegistrosProps> = ({
  servicios,
  isLoading,
  onEditar,
  onEliminar,
  onImprimir,
  onNuevoClick,
  onRefresh,
  maquinariaList,
}) => {
  const [busqueda, setBusqueda] = useState<string>('');
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');
  const [maquinariaFiltro, setMaquinariaFiltro] = useState<string>('TODAS');
  const [servicioAEliminar, setServicioAEliminar] = useState<Servicio | null>(null);

  // Client-side filtering over the live records from Google Sheets (sorted descending, newest first)
  const serviciosFiltrados = ordenarServiciosDesc(
    servicios.filter(s => {
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const match = 
          s.nroServicio.toLowerCase().includes(q) ||
          s.cuenta.toLowerCase().includes(q) ||
          s.cliente.toLowerCase().includes(q) ||
          s.maquinaria.toLowerCase().includes(q) ||
          (s.implemento && s.implemento.toLowerCase().includes(q)) ||
          s.operador.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (desde && s.fecha < desde) return false;
      if (hasta && s.fecha > hasta) return false;
      if (maquinariaFiltro !== 'TODAS' && s.maquinaria !== maquinariaFiltro) return false;

      return true;
    })
  );

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setDesde('');
    setHasta('');
    setMaquinariaFiltro('TODAS');
  };

  const handleConfirmarEliminar = () => {
    if (servicioAEliminar) {
      onEliminar(servicioAEliminar.nroServicio, servicioAEliminar.fila);
      setServicioAEliminar(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Registros de Servicios
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-mono">
                {serviciosFiltrados.length} {serviciosFiltrados.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Datos sincronizados directamente desde Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              title="Recargar desde Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={onNuevoClick}
              className="flex-1 sm:flex-initial h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente, cuenta, máquina..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>

          {/* Date from */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Desde:</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full h-11 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full h-11 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Machinery Filter */}
          <div className="flex items-center gap-2">
            <select
              value={maquinariaFiltro}
              onChange={(e) => setMaquinariaFiltro(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="TODAS">Todas las máquinas</option>
              {maquinariaList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {(busqueda || desde || hasta || maquinariaFiltro !== 'TODAS') && (
              <button
                onClick={handleLimpiarFiltros}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shrink-0"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Mobile Cards + Desktop Table */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-base">Cargando registros oficiales...</h3>
          <p className="text-xs text-slate-500 mt-1">Consultando directamente la hoja servicios en Google Sheets</p>
        </div>
      ) : serviciosFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">No hay registros encontrados</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {servicios.length === 0
                ? 'Aún no hay servicios registrados en la hoja de Google Sheets. Utilice el botón "Nuevo Servicio" para agregar el primero.'
                : 'No se encontraron registros que coincidan con los filtros aplicados.'}
            </p>
          </div>
          {servicios.length > 0 ? (
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Restablecer filtros
            </button>
          ) : (
            <button
              onClick={onNuevoClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              Registrar Primer Servicio
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Touch-friendly stacked cards */}
          <div className="block md:hidden space-y-3">
            {serviciosFiltrados.map((s) => (
              <div
                key={s.nroServicio}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
              >
                {/* Top card row: Service ID & Date */}
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-blue-900 font-mono-numbers bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg">
                    {s.nroServicio}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateDisplay(s.fecha)}
                  </span>
                </div>

                {/* Client info */}
                <div>
                  <div className="text-xs font-bold text-slate-400">Cliente (Cuenta #{s.cuenta})</div>
                  <div className="text-sm font-extrabold text-slate-900">{s.cliente}</div>
                </div>

                {/* Machine and details */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Tractor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{s.maquinaria}</span>
                  </div>
                  {s.implemento && (
                    <div className="text-slate-500 pl-5">
                      Implemento: <span className="font-semibold text-slate-700">{s.implemento}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                    <span>Op: <strong>{s.operador}</strong></span>
                    <span>
                      {formatNumber(s.unidad === 'Hora' ? s.horas : s.cantidad, 2)} {s.unidad}s
                    </span>
                  </div>
                </div>

                {/* Total and Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                    <span className="text-base font-black text-emerald-600 font-mono-numbers">
                      {formatCurrency(s.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onImprimir(s)}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition"
                      title="Imprimir comprobante"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditar(s)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                      title="Editar servicio"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setServicioAEliminar(s)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                      title="Eliminar de Google Sheets"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Full Structured Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-[#0a2342] text-white">
                  <tr>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Nro.</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Fecha</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Cuenta</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Cliente</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Maquinaria</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Implemento</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Operador</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-right">Cant/Horas</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-right">Precio</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                    <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {serviciosFiltrados.map((s) => (
                    <tr key={s.nroServicio} className="hover:bg-blue-50/50 transition">
                      <td className="px-3.5 py-3 font-extrabold font-mono text-blue-900 whitespace-nowrap">
                        {s.nroServicio}
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap font-medium">
                        {formatDateDisplay(s.fecha)}
                      </td>
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {s.cuenta}
                      </td>
                      <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {s.cliente}
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {s.maquinaria}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                        {s.implemento || '-'}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                        {s.operador}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatNumber(s.unidad === 'Hora' ? s.horas : s.cantidad, 2)} {s.unidad}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(s.precio)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-600 whitespace-nowrap">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onImprimir(s)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition"
                            title="Imprimir comprobante individual"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditar(s)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                            title="Editar servicio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setServicioAEliminar(s)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Confirmación de Eliminación */}
      {servicioAEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-base">¿Eliminar este servicio?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se eliminará permanentemente el registro{' '}
                <strong className="text-slate-800 font-mono">
                  {servicioAEliminar.nroServicio}
                </strong>{' '}
                de la hoja de Google Sheets.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setServicioAEliminar(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
