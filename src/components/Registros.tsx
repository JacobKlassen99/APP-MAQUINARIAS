import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
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
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Servicio } from '../types';
import { formatCurrency, formatNumber, formatDateDisplay } from '../utils/formatters';
import { gasService } from '../services/gasService';

interface RegistrosProps {
  onEditar: (servicio: Servicio) => void;
  onEliminar: (nroServicio: string, fila?: number) => Promise<boolean | void> | void;
  onImprimir: (servicio: Servicio) => void;
  onNuevoClick: () => void;
  maquinariaList: string[];
  servicios?: Servicio[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const Registros: React.FC<RegistrosProps> = ({
  onEditar,
  onEliminar,
  onImprimir,
  onNuevoClick,
  maquinariaList,
}) => {
  // Filters state
  const [busqueda, setBusqueda] = useState<string>('');
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');
  const [maquinariaFiltro, setMaquinariaFiltro] = useState<string>('TODAS');

  // Real Server-Side Pagination State (limit 200)
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [serviciosPaginados, setServiciosPaginados] = useState<Servicio[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState<boolean>(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Modal confirmación eliminar
  const [servicioAEliminar, setServicioAEliminar] = useState<Servicio | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Debounce ref for search input
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to load the requested page with current filters from Google Sheets
  const cargarPagina = useCallback(async (
    pagina: number, 
    filtrosOverride?: { busqueda?: string; desde?: string; hasta?: string; maquinaria?: string }
  ) => {
    setIsLoadingLocal(true);
    setErrorLocal(null);
    try {
      const q = filtrosOverride?.busqueda !== undefined ? filtrosOverride.busqueda : busqueda;
      const d = filtrosOverride?.desde !== undefined ? filtrosOverride.desde : desde;
      const h = filtrosOverride?.hasta !== undefined ? filtrosOverride.hasta : hasta;
      const m = filtrosOverride?.maquinaria !== undefined ? filtrosOverride.maquinaria : maquinariaFiltro;

      const res = await gasService.obtenerServiciosPaginados({
        page: pagina,
        limit: 100,
        busqueda: q,
        desde: d,
        hasta: h,
        maquinaria: m
      });

      if (res && res.ok) {
        setServiciosPaginados(res.datos || []);
        setTotalRegistros(res.total || 0);
        setTotalPaginas(Math.max(1, res.totalPaginas || 1));
        setPaginaActual(res.pagina || pagina);
      }
    } catch (err: any) {
      console.error('Error al cargar servicios paginados:', err);
      setErrorLocal(err.message || 'Error al conectar con Google Sheets');
    } finally {
      setIsLoadingLocal(false);
    }
  }, [busqueda, desde, hasta, maquinariaFiltro]);

  // Initial load on mount
  useEffect(() => {
    cargarPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search with debounce
  const handleBusquedaChange = (valor: string) => {
    setBusqueda(valor);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPaginaActual(1);
      cargarPagina(1, { busqueda: valor });
    }, 350);
  };

  // Handle filter changes (date, machinery)
  const handleDesdeChange = (valor: string) => {
    setDesde(valor);
    setPaginaActual(1);
    cargarPagina(1, { desde: valor });
  };

  const handleHastaChange = (valor: string) => {
    setHasta(valor);
    setPaginaActual(1);
    cargarPagina(1, { hasta: valor });
  };

  const handleMaquinariaChange = (valor: string) => {
    setMaquinariaFiltro(valor);
    setPaginaActual(1);
    cargarPagina(1, { maquinaria: valor });
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setDesde('');
    setHasta('');
    setMaquinariaFiltro('TODAS');
    setPaginaActual(1);
    cargarPagina(1, { busqueda: '', desde: '', hasta: '', maquinaria: 'TODAS' });
  };

  // Handle changing page
  const handleCambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas || nuevaPagina === paginaActual || isLoadingLocal) {
      return;
    }
    setPaginaActual(nuevaPagina);
    cargarPagina(nuevaPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle deletion
  const handleConfirmarEliminar = async () => {
    if (!servicioAEliminar) return;
    setIsDeleting(true);
    try {
      await onEliminar(servicioAEliminar.nroServicio, servicioAEliminar.fila);
      setServicioAEliminar(null);
      // Reload current page, or previous page if current became empty
      const targetPage = (serviciosPaginados.length === 1 && paginaActual > 1) ? paginaActual - 1 : paginaActual;
      setPaginaActual(targetPage);
      await cargarPagina(targetPage);
    } catch (err: any) {
      console.error('Error al eliminar servicio:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Range text calculations (e.g. "Mostrando 1–100 de 948 registros" o "Mostrando 901–948 de 948 registros")
  const ITEMS_POR_PAGINA = 100;
  const inicioRegistro = totalRegistros === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
  const finRegistro = Math.min(paginaActual * ITEMS_POR_PAGINA, totalRegistros);

  // Generate pagination buttons array (e.g. [1, 2, 3, 4, 5] for 940 records)
  const generarNumerosPagina = (actual: number, totalPags: number): (number | string)[] => {
    const paginas: (number | string)[] = [];
    if (totalPags <= 7) {
      for (let i = 1; i <= totalPags; i++) {
        paginas.push(i);
      }
    } else {
      paginas.push(1);
      if (actual > 3) {
        paginas.push('...');
      }
      const start = Math.max(2, actual - 1);
      const end = Math.min(totalPags - 1, actual + 1);
      for (let i = start; i <= end; i++) {
        paginas.push(i);
      }
      if (actual < totalPags - 2) {
        paginas.push('...');
      }
      paginas.push(totalPags);
    }
    return paginas;
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
                {formatNumber(totalRegistros)} {totalRegistros === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Paginación real de hasta 200 registros por página directamente desde Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => cargarPagina(paginaActual)}
              disabled={isLoadingLocal}
              className="p-2.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recargar esta página desde Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLocal ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={onNuevoClick}
              className="flex-1 sm:flex-initial h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
              onChange={(e) => handleBusquedaChange(e.target.value)}
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
              onChange={(e) => handleDesdeChange(e.target.value)}
              className="w-full h-11 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => handleHastaChange(e.target.value)}
              className="w-full h-11 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Machinery Filter */}
          <div className="flex items-center gap-2">
            <select
              value={maquinariaFiltro}
              onChange={(e) => handleMaquinariaChange(e.target.value)}
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
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shrink-0 cursor-pointer"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Counter Info & Top Pagination Bar */}
        {totalRegistros > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="font-semibold">
              Mostrando <span className="font-extrabold text-slate-900 font-mono">{inicioRegistro}–{finRegistro}</span> de{' '}
              <span className="font-extrabold text-slate-900 font-mono">{formatNumber(totalRegistros)}</span> registros
              {totalPaginas > 1 && (
                <span className="text-slate-400 ml-1.5">
                  (Página {paginaActual} de {totalPaginas})
                </span>
              )}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual - 1)}
                  disabled={paginaActual <= 1 || isLoadingLocal}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    paginaActual <= 1 || isLoadingLocal
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs active:scale-95'
                  }`}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-800">
                  {paginaActual} / {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual + 1)}
                  disabled={paginaActual >= totalPaginas || isLoadingLocal}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    paginaActual >= totalPaginas || isLoadingLocal
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs active:scale-95'
                  }`}
                  title="Página siguiente"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorLocal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorLocal}</span>
          <button
            onClick={() => cargarPagina(paginaActual)}
            className="ml-auto underline font-bold hover:text-red-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Main Content: Mobile Cards + Desktop Table */}
      {isLoadingLocal ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-base">Cargando registros oficiales...</h3>
          <p className="text-xs text-slate-500 mt-1">
            Obteniendo página {paginaActual} (hasta 200 registros) desde Google Sheets
          </p>
        </div>
      ) : serviciosPaginados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">No hay registros encontrados</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {busqueda || desde || hasta || maquinariaFiltro !== 'TODAS'
                ? 'No se encontraron registros que coincidan con los filtros aplicados.'
                : 'Aún no hay servicios registrados en la hoja de Google Sheets. Utilice el botón "Nuevo Servicio" para agregar el primero.'}
            </p>
          </div>
          {busqueda || desde || hasta || maquinariaFiltro !== 'TODAS' ? (
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Restablecer filtros
            </button>
          ) : (
            <button
              onClick={onNuevoClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Registrar Primer Servicio
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Touch-friendly stacked cards (Máx 200) */}
          <div className="block md:hidden space-y-3">
            {serviciosPaginados.map((s) => (
              <div
                key={s.nroServicio || s.id || `card-${s.fila}`}
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

                {/* Machinery & Operator pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Tractor className="w-3 h-3 text-blue-600" />
                      Máquina
                    </div>
                    <div className="font-extrabold text-slate-800 truncate mt-0.5">
                      {s.maquinaria}
                    </div>
                    {s.implemento && (
                      <div className="text-[10px] text-slate-500 truncate">
                        {s.implemento}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      Operador
                    </div>
                    <div className="font-extrabold text-slate-800 truncate mt-0.5">
                      {s.operador}
                    </div>
                  </div>
                </div>

                {/* Quantity & Total row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-600">
                    <span>
                      {s.unidad === 'Hora' 
                        ? `${formatNumber(s.horas)} hrs` 
                        : `${formatNumber(s.cantidad)} ${s.unidad}`}
                    </span>
                    <span className="text-slate-400 mx-1">×</span>
                    <span className="font-mono-numbers">{formatCurrency(s.precio)}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="text-base font-black text-blue-900 font-mono-numbers">
                      {formatCurrency(s.total)}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onImprimir(s)}
                    className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                    title="Ver comprobante"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditar(s)}
                    className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                    title="Editar servicio"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setServicioAEliminar(s)}
                    className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Eliminar servicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: High-density Data Table (Máx 200 filas) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">N°</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cuenta / Cliente</th>
                    <th className="py-3 px-4">Maquinaria</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-right">Cant. / Horas</th>
                    <th className="py-3 px-4 text-right">Precio</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {serviciosPaginados.map((s) => (
                    <tr 
                      key={s.nroServicio || s.id || `row-${s.fila}`}
                      className="hover:bg-blue-50/40 transition group"
                    >
                      <td className="py-3.5 px-4 font-extrabold text-blue-900 font-mono-numbers whitespace-nowrap">
                        {s.nroServicio}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateDisplay(s.fecha)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{s.cliente}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.cuenta ? `Cuenta #${s.cuenta}` : 'Sin cuenta'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{s.maquinaria}</div>
                        {s.implemento && (
                          <div className="text-[11px] text-slate-500">{s.implemento}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {s.operador}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 font-mono-numbers">
                          {s.unidad === 'Hora' ? formatNumber(s.horas) : formatNumber(s.cantidad)}
                        </span>{' '}
                        <span className="text-[11px] text-slate-500 font-normal">
                          {s.unidad === 'Hora' ? 'hrs' : s.unidad}
                        </span>
                        {s.unidad === 'Hora' && s.tipo && (
                          <div className="text-[10px] text-slate-400">
                            {s.tipo === 'Horómetro' ? (
                              s.inicio && s.fin ? `Horómetro: ${s.inicio} → ${s.fin}` : 'Horómetro'
                            ) : (
                              s.inicio && s.fin ? `Horario: ${s.inicio} - ${s.fin}` : s.tipo
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-600 whitespace-nowrap">
                        {formatCurrency(s.precio)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-900 font-mono-numbers whitespace-nowrap text-sm">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onImprimir(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Ver e imprimir comprobante"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditar(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Editar servicio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setServicioAEliminar(s)}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar de Google Sheets"
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

          {/* BOTTOM PAGINATION CONTROLS BAR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            {/* Range Text Counter */}
            <div className="text-xs sm:text-sm font-semibold text-slate-600 text-center sm:text-left">
              Mostrando <span className="font-extrabold text-slate-900 font-mono">{inicioRegistro}–{finRegistro}</span> de{' '}
              <span className="font-extrabold text-slate-900 font-mono">{formatNumber(totalRegistros)}</span> registros
            </div>

            {/* Pagination Buttons: ‹ Anterior    1    2    3    4    5    Siguiente › */}
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Anterior */}
                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual - 1)}
                  disabled={paginaActual <= 1 || isLoadingLocal}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    paginaActual <= 1 || isLoadingLocal
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                  }`}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {generarNumerosPagina(paginaActual, totalPaginas).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`dots-bot-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-mono">
                          ...
                        </span>
                      );
                    }
                    const numP = Number(p);
                    const esActual = numP === paginaActual;
                    return (
                      <button
                        key={`page-bot-${numP}`}
                        type="button"
                        onClick={() => handleCambiarPagina(numP)}
                        disabled={isLoadingLocal || esActual}
                        className={`min-w-9 h-9 px-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center cursor-pointer ${
                          esActual
                            ? 'bg-blue-600 text-white shadow-xs pointer-events-none'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                        }`}
                      >
                        {numP}
                      </button>
                    );
                  })}
                </div>

                {/* Siguiente */}
                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual + 1)}
                  disabled={paginaActual >= totalPaginas || isLoadingLocal}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    paginaActual >= totalPaginas || isLoadingLocal
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                  }`}
                  title="Página siguiente"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
                type="button"
                onClick={() => setServicioAEliminar(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
