import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Printer, 
  Calendar, 
  RotateCcw, 
  Tractor, 
  Users, 
  UserCheck,
  TrendingUp,
  Clock,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { Servicio, TipoReporte, ReporteItem } from '../types';
import { formatCurrency, formatNumber, formatDateDisplay } from '../utils/formatters';

interface ReportesProps {
  servicios: Servicio[];
}

export const Reportes: React.FC<ReportesProps> = ({ servicios }) => {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('maquinaria');
  const [anio, setAnio] = useState<string>('2026');
  const [mes, setMes] = useState<string>('TODOS');
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');

  const mesesNombres = [
    { val: 'TODOS', label: 'Todo el año' },
    { val: '01', label: 'Enero' },
    { val: '02', label: 'Febrero' },
    { val: '03', label: 'Marzo' },
    { val: '04', label: 'Abril' },
    { val: '05', label: 'Mayo' },
    { val: '06', label: 'Junio' },
    { val: '07', label: 'Julio' },
    { val: '08', label: 'Agosto' },
    { val: '09', label: 'Septiembre' },
    { val: '10', label: 'Octubre' },
    { val: '11', label: 'Noviembre' },
    { val: '12', label: 'Diciembre' },
  ];

  // Calculate period description
  let periodoTexto = '';
  if (desde && hasta) {
    periodoTexto = `${formatDateDisplay(desde)} al ${formatDateDisplay(hasta)}`;
  } else if (mes !== 'TODOS') {
    const mesObj = mesesNombres.find(m => m.val === mes);
    periodoTexto = `${mesObj?.label} de ${anio}`;
  } else {
    periodoTexto = `Año ${anio} completo`;
  }

  // Filter and group live services
  const { items, totalGeneral, totalHoras, totalCantidad, totalServicios } = useMemo(() => {
    let filtrados = [...servicios];

    if (desde && hasta) {
      filtrados = filtrados.filter(s => s.fecha >= desde && s.fecha <= hasta);
    } else if (anio) {
      if (mes && mes !== 'TODOS') {
        const prefix = `${anio}-${('0' + mes).slice(-2)}`;
        filtrados = filtrados.filter(s => s.fecha.startsWith(prefix));
      } else {
        filtrados = filtrados.filter(s => s.fecha.startsWith(String(anio)));
      }
    }

    const acumulador: Record<string, ReporteItem> = {};

    for (const s of filtrados) {
      let cat = '';
      let sub: string | undefined = undefined;
      let key = '';

      if (tipoReporte === 'maquinaria') {
        cat = s.maquinaria || 'Sin asignar';
        key = cat;
      } else if (tipoReporte === 'maquinaria_cliente') {
        cat = s.maquinaria || 'Sin asignar';
        sub = `Cuenta #${s.cuenta} - ${s.cliente}`;
        key = `${cat}__${sub}`;
      } else if (tipoReporte === 'cliente') {
        cat = `Cuenta #${s.cuenta} - ${s.cliente}`;
        key = cat;
      } else if (tipoReporte === 'operador') {
        cat = s.operador || 'Sin operador';
        key = cat;
      }

      if (!acumulador[key]) {
        acumulador[key] = {
          categoria: cat,
          subcategoria: sub,
          servicios: 0,
          horas: 0,
          cantidad: 0,
          total: 0
        };
      }

      acumulador[key].servicios += 1;
      acumulador[key].horas += Number(s.horas) || 0;
      acumulador[key].cantidad += Number(s.cantidad) || 0;
      acumulador[key].total += Number(s.total) || 0;
    }

    const itemsCalculados = Object.values(acumulador).map(it => ({
      ...it,
      horas: Math.round(it.horas * 100) / 100,
      cantidad: Math.round(it.cantidad * 100) / 100,
      total: Math.round(it.total * 100) / 100,
    }));

    itemsCalculados.sort((a, b) => b.total - a.total);

    let totG = 0;
    let totH = 0;
    let totC = 0;
    let totS = 0;

    for (const it of itemsCalculados) {
      totG += it.total;
      totH += it.horas;
      totC += it.cantidad;
      totS += it.servicios;
    }

    return {
      items: itemsCalculados,
      totalGeneral: Math.round(totG * 100) / 100,
      totalHoras: Math.round(totH * 100) / 100,
      totalCantidad: Math.round(totC * 100) / 100,
      totalServicios: totS
    };
  }, [servicios, tipoReporte, anio, mes, desde, hasta]);

  const handleLimpiarPeriodo = () => {
    setDesde('');
    setHasta('');
    setMes('TODOS');
    setAnio('2026');
  };

  const getColumnaNombre = () => {
    switch (tipoReporte) {
      case 'maquinaria':
        return 'Maquinaria';
      case 'maquinaria_cliente':
        return 'Maquinaria / Cliente';
      case 'cliente':
        return 'Cliente';
      case 'operador':
        return 'Operador';
    }
  };

  // Asegurar que no quede activa ninguna clase de comprobante individual al ver Reportes
  useEffect(() => {
    document.body.classList.remove('comprobante-modal-open');
  }, []);

  const handleImprimirReporte = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Retirar clase para que main y el reporte no queden ocultos en la impresión
    document.body.classList.remove('comprobante-modal-open');
    try {
      window.focus();
    } catch {
      // Ignorar si el navegador bloquea focus
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ================= CONTROLES DEL REPORTE (NO SE IMPRIMEN) ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Generador de Reportes
              </h2>
              <p className="text-xs text-slate-500">Resumen consolidado y exportación para impresión</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleImprimirReporte}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR REPORTE</span>
          </button>
        </div>

        {/* Filtros de Tipo y Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Tipo de reporte */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tipo de Reporte *
            </label>
            <select
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="maquinaria">Resumen por Maquinaria</option>
              <option value="maquinaria_cliente">Por Maquinaria y Cliente</option>
              <option value="cliente">Resumen por Cliente</option>
              <option value="operador">Resumen por Operador</option>
            </select>
          </div>

          {/* 2. Año */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Año
            </label>
            <select
              value={anio}
              disabled={!!(desde && hasta)}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* 3. Mes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mes
            </label>
            <select
              value={mes}
              disabled={!!(desde && hasta)}
              onChange={(e) => setMes(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              {mesesNombres.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Reset Button */}
          <div className="flex items-end">
            <button
              onClick={handleLimpiarPeriodo}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </button>
          </div>
        </div>

        {/* Rango de fechas personalizado opcional */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <span className="font-bold text-slate-500 whitespace-nowrap">O Rango Específico:</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
            />
            <span className="text-slate-400">al</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
            />
          </div>
          {(desde || hasta) && (
            <span className="text-blue-600 font-bold text-[11px]">
              (Sobrescribe filtro de mes/año)
            </span>
          )}
        </div>
      </div>

      {/* ================= CONTENIDO DEL REPORTE IMPRIMIBLE ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden print-area">
        
        {/* Cabecera Oficial de Impresión */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">
                CONTROL DE MAQUINARIA
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Reporte de Servicios: {getColumnaNombre()}
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Período: <strong className="text-slate-800">{periodoTexto}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Fecha de Emisión
              </span>
              <span className="text-xs font-bold text-slate-700 font-mono">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjetas Resumen de Totales (Visibles en pantalla e impresión) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200 print:bg-white print:p-3 print:gap-2 print:border-slate-300">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Total Servicios</span>
            <span className="text-xl font-black text-blue-900 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {totalServicios}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Horas Totales</span>
            <span className="text-xl font-black text-blue-700 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatNumber(totalHoras, 2)} hrs
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Otras Cantidades</span>
            <span className="text-xl font-black text-slate-700 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatNumber(totalCantidad, 2)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Total Facturado</span>
            <span className="text-xl font-black text-emerald-600 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatCurrency(totalGeneral)}
            </span>
          </div>
        </div>

        {/* Tabla Detallada del Reporte */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200 print-table">
            <thead className="bg-[#0a2342] text-white">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">
                  {getColumnaNombre()}
                </th>
                {tipoReporte === 'maquinaria_cliente' && (
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">
                    Cliente / Cuenta
                  </th>
                )}
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">
                  Servicios
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">
                  Horas
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">
                  Cantidad
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={tipoReporte === 'maquinaria_cliente' ? 6 : 5} className="p-8 text-center text-slate-400">
                    No se registran servicios para el período seleccionado.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {item.categoria}
                    </td>
                    {tipoReporte === 'maquinaria_cliente' && (
                      <td className="px-4 py-3 text-slate-600">
                        {item.subcategoria || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono font-bold text-center text-slate-700">
                      {item.servicios}
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-semibold text-slate-700">
                      {formatNumber(item.horas, 2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-slate-600">
                      {formatNumber(item.cantidad, 2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-right text-emerald-600">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300">
                <tr>
                  <td 
                    colSpan={tipoReporte === 'maquinaria_cliente' ? 2 : 1} 
                    className="px-4 py-3.5 text-slate-900 uppercase font-extrabold tracking-wider"
                  >
                    TOTAL GENERAL CONSOLIDADO
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-extrabold text-blue-900">
                    {totalServicios}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-extrabold text-blue-900">
                    {formatNumber(totalHoras, 2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-800">
                    {formatNumber(totalCantidad, 2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                    {formatCurrency(totalGeneral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pie de Impresión */}
        <div className="p-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>CONTROL DE MAQUINARIA</strong> — Sistema de Gestión Oficial
          </div>
          <div>
            Documento de control interno generado automáticamente
          </div>
        </div>
      </div>
    </div>
  );
};
