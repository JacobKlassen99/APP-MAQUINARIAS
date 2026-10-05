import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Calendar, 
  User, 
  Tractor, 
  Wrench, 
  Clock, 
  DollarSign, 
  Save, 
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  Cliente, 
  Operador, 
  MaquinariaConfig, 
  Servicio, 
  TipoHora, 
  UnidadMedida 
} from '../types';
import { 
  formatCurrency, 
  formatNumber, 
  calcularHoras, 
  getTodayDateString,
  coincideCliente,
  limpiarValorHorometro
} from '../utils/formatters';

interface NuevoServicioProps {
  clientes: Cliente[];
  operadores: Operador[];
  maquinariaList: MaquinariaConfig[];
  servicioEdicion?: Servicio | null;
  siguienteNumero: string;
  isSaving?: boolean;
  onGuardar: (servicio: Servicio & { forzarGuardar?: boolean }, guardarYNuevo?: boolean) => Promise<boolean | void> | void;
  onCancelarEdicion?: () => void;
  checkDuplicate: (data: Partial<Servicio>, excludeNro?: string) => Servicio | null;
}

export const NuevoServicio: React.FC<NuevoServicioProps> = ({
  clientes,
  operadores,
  maquinariaList,
  servicioEdicion,
  siguienteNumero,
  isSaving = false,
  onGuardar,
  onCancelarEdicion,
  checkDuplicate,
}) => {
  // Form fields
  const [fecha, setFecha] = useState<string>(getTodayDateString());
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [operador, setOperador] = useState<string>('');
  const [maquinaria, setMaquinaria] = useState<string>('');
  const [implemento, setImplemento] = useState<string>('');
  const [unidad, setUnidad] = useState<UnidadMedida>('Hora');
  const [precio, setPrecio] = useState<number>(0);
  const [tipoHora, setTipoHora] = useState<TipoHora>('Horómetro');
  const [inicio, setInicio] = useState<string>('');
  const [fin, setFin] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal confirmación duplicado
  const [showDuplicadoModal, setShowDuplicadoModal] = useState<boolean>(false);
  const [duplicadoDetectado, setDuplicadoDetectado] = useState<Servicio | null>(null);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  // Initial load or edit mode population
  useEffect(() => {
    if (servicioEdicion) {
      setFecha(servicioEdicion.fecha || getTodayDateString());
      setClienteSeleccionado({
        cuenta: String(servicioEdicion.cuenta || '').trim(),
        nombre: String(servicioEdicion.cliente || '').trim()
      });
      setOperador(String(servicioEdicion.operador || '').trim());
      setMaquinaria(String(servicioEdicion.maquinaria || '').trim());
      setImplemento(String(servicioEdicion.implemento || '').trim());
      setUnidad(servicioEdicion.unidad || 'Hora');
      setPrecio(Number(servicioEdicion.precio) || 0);

      // Normalizar tipo de medición (Horómetro vs Horario)
      const t = String(servicioEdicion.tipo || '').toLowerCase();
      const rawInicio = String(servicioEdicion.inicio || '');
      const rawFin = String(servicioEdicion.fin || '');
      const esHorario = t.includes('horar') || (rawInicio.includes(':') && rawFin.includes(':'));
      const tipoNormalizado: TipoHora = esHorario ? 'Horario' : 'Horómetro';
      setTipoHora(tipoNormalizado);

      // Limpiar inicio y fin de cualquier texto de GMT, fecha o zona horaria
      const rawHoras = Number(servicioEdicion.horas) || 0;
      const iniLimpio = limpiarValorHorometro(servicioEdicion.inicio, rawHoras);
      const finLimpio = limpiarValorHorometro(servicioEdicion.fin, rawHoras, iniLimpio);
      setInicio(iniLimpio);
      setFin(finLimpio);

      const cant = Number(servicioEdicion.cantidad) || (tipoNormalizado === 'Horómetro' || tipoNormalizado === 'Horario' ? rawHoras : 0);
      setCantidad(cant);
      setFormError(null);
    } else {
      resetForm();
    }
  }, [servicioEdicion]);

  // Click outside to close client dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter machines and implementos
  const maquinasUnicas = Array.from(new Set(maquinariaList.map(m => m.maquinaria)));
  const implementosDisponibles = maquinariaList.filter(m => m.maquinaria === maquinaria);

  const resetForm = () => {
    setFecha(getTodayDateString());
    setClienteSeleccionado(null);
    setClienteSearch('');
    setOperador('');
    setMaquinaria('');
    setImplemento('');
    setUnidad('Hora');
    setPrecio(0);
    setTipoHora('Horómetro');
    setInicio('');
    setFin('');
    setCantidad(0);
    setFormError(null);
  };

  // Client search filter (busca por cuenta, cualquier nombre o apellido, ignora mayúsculas y acentos)
  const clientesFiltrados = clientes.filter(c => coincideCliente(c, clienteSearch));

  const handleSelectCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setClienteSearch('');
    setIsDropdownOpen(false);
    setFormError(null);
  };

  const handleMaquinariaChange = (nuevaMaquinaria: string) => {
    setMaquinaria(nuevaMaquinaria);
    setFormError(null);
    if (!nuevaMaquinaria) {
      setImplemento('');
      setPrecio(0);
      setUnidad('Hora');
      return;
    }

    const configs = maquinariaList.filter(m => m.maquinaria === nuevaMaquinaria);
    if (configs.length > 0) {
      const defaultCfg = configs[0];
      setImplemento(defaultCfg.implemento || '');
      setPrecio(defaultCfg.precio);
      setUnidad(defaultCfg.unidad);
    }
  };

  const handleImplementoChange = (nuevoImplemento: string) => {
    setImplemento(nuevoImplemento);
    const match = maquinariaList.find(m => 
      m.maquinaria === maquinaria && 
      (m.implemento === nuevoImplemento || (!m.implemento && !nuevoImplemento))
    );

    if (match) {
      setPrecio(match.precio);
      setUnidad(match.unidad);
    }
  };

  // Calculations
  let horasCalculadas = 0;
  let cantidadEfectiva = 0;

  if (unidad === 'Hora') {
    horasCalculadas = calcularHoras(tipoHora, inicio, fin);
    // Si estamos editando y ya existían horas válidas pero inicio/fin no están completos
    if (horasCalculadas <= 0 && servicioEdicion && Number(servicioEdicion.horas) > 0 && (!inicio || !fin)) {
      horasCalculadas = Number(servicioEdicion.horas);
    }
    cantidadEfectiva = horasCalculadas;
  } else {
    horasCalculadas = 0;
    cantidadEfectiva = Number(cantidad) || 0;
  }

  const totalCalculado = Math.round(cantidadEfectiva * precio * 100) / 100;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, guardarYNuevo = false) => {
    e.preventDefault();
    setFormError(null);

    if (!fecha) {
      setFormError('La fecha es obligatoria.');
      return;
    }

    if (!clienteSeleccionado) {
      setFormError('Debe buscar y seleccionar un cliente de la lista.');
      return;
    }

    if (!operador) {
      setFormError('Por favor seleccione un operador.');
      return;
    }

    if (!maquinaria) {
      setFormError('Por favor seleccione una maquinaria.');
      return;
    }

    if (unidad === 'Hora') {
      if (!inicio || !fin) {
        // En registros históricos antiguos REC- o edición, si ya hay horas calculadas registradas
        if (horasCalculadas <= 0) {
          setFormError('Para servicios por Hora, ingrese Inicio y Fin.');
          return;
        }
      } else if (horasCalculadas <= 0) {
        setFormError('Las horas calculadas deben ser mayores a 0. Verifique los valores de Inicio y Fin.');
        return;
      }
    } else {
      if (Number(cantidad) <= 0) {
        setFormError(`Para servicios por ${unidad}, la cantidad debe ser mayor a 0.`);
        return;
      }
    }

    const nro = String(servicioEdicion?.numero || servicioEdicion?.nroServicio || servicioEdicion?.id || '').trim();
    const filaNum = typeof servicioEdicion?.fila === 'number' ? servicioEdicion.fila : undefined;

    const servicioData: Servicio & { forzarGuardar?: boolean } = {
      nroServicio: nro,
      numero: nro,
      fila: filaNum,
      id: nro,
      fecha,
      cuenta: clienteSeleccionado.cuenta,
      cliente: clienteSeleccionado.nombre,
      maquinaria,
      implemento: implemento || '',
      operador,
      tipo: unidad === 'Hora' ? tipoHora : '',
      inicio: unidad === 'Hora' ? inicio : '',
      fin: unidad === 'Hora' ? fin : '',
      cantidad: cantidadEfectiva,
      unidad,
      horas: horasCalculadas,
      precio,
      total: totalCalculado,
    };

    // Check duplicates if not editing
    const duplicate = checkDuplicate(servicioData, nro);
    if (duplicate && !servicioEdicion) {
      setDuplicadoDetectado(duplicate);
      setPendingSaveData({ data: servicioData, guardarYNuevo });
      setShowDuplicadoModal(true);
      return;
    }

    // Save directly
    const res = await onGuardar(servicioData, guardarYNuevo);
    if (guardarYNuevo && res !== false) {
      resetForm();
    }
  };

  const handleConfirmarDuplicado = async () => {
    if (pendingSaveData) {
      const dataToSave = pendingSaveData.data || pendingSaveData;
      const isGuardarYNuevo = pendingSaveData.guardarYNuevo || false;
      setShowDuplicadoModal(false);
      setPendingSaveData(null);
      setDuplicadoDetectado(null);
      const res = await onGuardar({ ...dataToSave, forzarGuardar: true }, isGuardarYNuevo);
      if (isGuardarYNuevo && res !== false) {
        resetForm();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header bar of form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 block">
            {servicioEdicion ? 'MODIFICACIÓN' : 'REGISTRO OFICIAL'}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {servicioEdicion ? `Editar Servicio: ${servicioEdicion.nroServicio}` : 'Nuevo Servicio de Maquinaria'}
          </h2>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Correlativo Asignado</span>
          <span className="text-sm sm:text-base font-extrabold text-blue-900 font-mono-numbers bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            {servicioEdicion ? servicioEdicion.nroServicio : siguienteNumero}
          </span>
        </div>
      </div>

      {/* Validation Error Banner */}
      {formError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs sm:text-sm font-semibold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form (Mobile-first vertical layout) */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
        
        {/* 1. FECHA */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Fecha del Servicio *
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => { setFecha(e.target.value); setFormError(null); }}
            required
            className="w-full h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* 2. BUSCADOR DE CLIENTES */}
        <div className="relative" ref={searchRef}>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            Cliente (Buscador por Cuenta o Nombre) *
          </label>

          {clienteSeleccionado ? (
            <div className="flex items-center justify-between p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  #{clienteSeleccionado.cuenta}
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-900">
                    Cuenta: {clienteSeleccionado.cuenta}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Cliente: {clienteSeleccionado.nombre}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClienteSeleccionado(null);
                  setClienteSearch('');
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition"
                title="Cambiar cliente"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escriba número de cuenta o nombre del cliente..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setIsDropdownOpen(true);
                    setFormError(null);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>

              {/* Dropdown list of clients */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-14 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map((c) => (
                      <button
                        key={c.cuenta}
                        type="button"
                        onClick={() => handleSelectCliente(c)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50/80 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">{c.nombre}</div>
                          <div className="text-xs text-slate-500">Cuenta oficial: #{c.cuenta}</div>
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          Cuenta {c.cuenta}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-xs text-slate-500 text-center">
                      {clienteSearch.trim() ? 'No se encontraron clientes coincidentes.' : 'Escriba para buscar por nombre o cuenta...'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. OPERADOR & MAQUINARIA (Grid 2 columnas en pantallas medianas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Operador / Personal *
            </label>
            <select
              value={operador}
              onChange={(e) => { setOperador(e.target.value); setFormError(null); }}
              required
              className="w-full h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">-- Seleccionar Operador --</option>
              {operadores.map((op) => (
                <option key={op.operador} value={op.operador}>
                  {op.operador}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Tractor className="w-3.5 h-3.5 text-blue-600" />
              Maquinaria *
            </label>
            <select
              value={maquinaria}
              onChange={(e) => handleMaquinariaChange(e.target.value)}
              required
              className="w-full h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">-- Seleccionar Maquinaria --</option>
              {maquinasUnicas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. IMPLEMENTO / SERVICIO & TARIFA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              Implemento / Servicio
            </label>
            <select
              value={implemento}
              onChange={(e) => handleImplementoChange(e.target.value)}
              disabled={!maquinaria || implementosDisponibles.length === 0}
              className="w-full h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              <option value="">-- Sin implemento o General --</option>
              {implementosDisponibles
                .filter(i => !!i.implemento)
                .map((cfg) => (
                  <option key={`${cfg.maquinaria}-${cfg.implemento}`} value={cfg.implemento}>
                    {cfg.implemento}
                  </option>
                ))}
            </select>
          </div>

          {/* Tarifa y Unidad cargadas automáticamente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Unidad
              </label>
              <input
                type="text"
                readOnly
                value={unidad}
                className="w-full h-12 px-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-bold text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Precio Unit.
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(precio)}
                className="w-full h-12 px-3 bg-slate-100 border border-slate-300 rounded-xl text-blue-900 font-bold text-sm text-center font-mono-numbers"
              />
            </div>
          </div>
        </div>

        {/* 5. CÁLCULO DE HORAS O CANTIDAD SEGÚN UNIDAD */}
        {unidad === 'Hora' ? (
          <div className="p-4 sm:p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-900 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Medición de Horas
              </span>
              
              {/* Segmented control for Tipo */}
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTipoHora('Horómetro'); setInicio(''); setFin(''); }}
                  className={`px-3 py-1.5 rounded-md transition ${
                    tipoHora === 'Horómetro' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Horómetro
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoHora('Horario'); setInicio(''); setFin(''); }}
                  className={`px-3 py-1.5 rounded-md transition ${
                    tipoHora === 'Horario' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Horario
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {tipoHora === 'Horómetro' ? 'Horómetro Inicial' : 'Hora Inicio'} *
                </label>
                <input
                  type={tipoHora === 'Horómetro' ? 'number' : 'time'}
                  step={tipoHora === 'Horómetro' ? '0.1' : undefined}
                  value={inicio}
                  onChange={(e) => { setInicio(e.target.value); setFormError(null); }}
                  placeholder={tipoHora === 'Horómetro' ? 'Ej: 1240.5' : undefined}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {tipoHora === 'Horómetro' ? 'Horómetro Final' : 'Hora Fin'} *
                </label>
                <input
                  type={tipoHora === 'Horómetro' ? 'number' : 'time'}
                  step={tipoHora === 'Horómetro' ? '0.1' : undefined}
                  value={fin}
                  onChange={(e) => { setFin(e.target.value); setFormError(null); }}
                  placeholder={tipoHora === 'Horómetro' ? 'Ej: 1248.5' : undefined}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                  Horas Calculadas
                </label>
                <div className="w-full h-11 px-3 bg-blue-100/70 border border-blue-200 rounded-xl text-blue-900 font-black text-sm flex items-center justify-center font-mono-numbers">
                  {formatNumber(horasCalculadas, 2)} hrs
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Cantidad en {unidad} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={cantidad || ''}
              onChange={(e) => { setCantidad(parseFloat(e.target.value) || 0); setFormError(null); }}
              placeholder={`Ingrese cantidad en ${unidad}...`}
              className="w-full h-12 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono-numbers"
            />
          </div>
        )}

        {/* 6. RESUMEN VISUAL PRE-GUARDADO */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
              Resumen del Servicio
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {cantidadEfectiva > 0 
                ? `${formatNumber(cantidadEfectiva, 2)} ${unidad}s × ${formatCurrency(precio)}`
                : 'Complete los datos para calcular'}
            </span>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">
              Total a Cobrar
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono-numbers">
              {formatCurrency(totalCalculado)}
            </span>
          </div>
        </div>

        {/* 7. BOTONES PRINCIPALES THUMB-FRIENDLY */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {servicioEdicion ? (
            <>
              <button
                type="button"
                onClick={onCancelarEdicion}
                disabled={isSaving}
                className="h-13 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 order-2 sm:order-1 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Cancelar Edición
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSaving}
                className="flex-1 h-13 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 order-1 sm:order-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Actualizando en Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>ACTUALIZAR SERVICIO</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSaving}
                className="flex-1 h-13 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>GUARDAR SERVICIO</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSaving}
                className="flex-1 h-13 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>GUARDAR Y NUEVO</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Modal de Advertencia por Duplicado */}
      {showDuplicadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Posible Registro Duplicado</h3>
                <p className="text-xs text-slate-500">Aviso de seguridad del sistema</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ya existe el servicio registrado como{' '}
              <strong className="text-blue-900 font-mono">
                {duplicadoDetectado?.nroServicio}
              </strong>{' '}
              con la misma fecha, cliente, máquina, operador y horas.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              ¿Desea registrar y guardar este servicio de todos modos en Google Sheets?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicadoModal(false);
                  setPendingSaveData(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDuplicado}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Guardar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
