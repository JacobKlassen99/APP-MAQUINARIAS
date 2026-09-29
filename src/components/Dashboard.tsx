import React from 'react';
import { 
  Tractor, 
  Calendar, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ClipboardList,
  Plus,
  TrendingUp,
  User,
  ArrowRight
} from 'lucide-react';
import { DashboardStats, Servicio } from '../types';
import { formatCurrency, formatNumber, formatDateDisplay } from '../utils/formatters';

interface DashboardProps {
  stats: DashboardStats;
  onNuevoClick: () => void;
  onVerRegistrosClick: () => void;
  onSelectServicio: (servicio: Servicio) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  onNuevoClick,
  onVerRegistrosClick,
  onSelectServicio,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner with Quick Actions (Mobile-friendly) */}
      <div className="bg-gradient-to-r from-[#0a2342] via-[#0f2b5c] to-[#1e40af] rounded-2xl p-5 sm:p-6 text-white shadow-md shadow-blue-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
            PANEL DE CONTROL
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            CONTROL DE MAQUINARIA
          </h1>
          <p className="text-xs text-blue-100/80 mt-1 max-w-md">
            Registro, cálculo automático y control de horas y servicios con Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNuevoClick}
            className="flex-1 sm:flex-initial h-11 px-4 sm:px-5 bg-white text-blue-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:bg-blue-50 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Nuevo Servicio</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Servicios */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Registrados
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
            {stats.totalServicios}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">En Google Sheets</p>
        </div>

        {/* 2. Servicios Hoy */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Servicios Hoy
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-numbers">
            {stats.serviciosHoy}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Jornada actual</p>
        </div>

        {/* 3. Servicios del Mes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Servicios del Mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono-numbers">
            {stats.serviciosMes}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Mes en curso</p>
        </div>

        {/* 4. Horas Trabajadas Mes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Horas del Mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono-numbers">
            {formatNumber(stats.horasMes, 1)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Horas de máquina</p>
        </div>

        {/* 5. Facturado Mes */}
        <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Cobrado Mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-numbers">
            {formatCurrency(stats.totalMes)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Importe mensual</p>
        </div>
      </div>

      {/* Grid: Último Servicio Registrado & Tabla Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card: Último Servicio Registrado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold text-blue-900 uppercase">
                Último Servicio Registrado
              </span>
              {stats.ultimoServicio && (
                <span className="text-xs font-extrabold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {stats.ultimoServicio.nroServicio}
                </span>
              )}
            </div>

            {stats.ultimoServicio ? (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cliente</span>
                  <div className="text-sm font-extrabold text-slate-900">
                    {stats.ultimoServicio.cliente}
                  </div>
                  <div className="text-xs text-slate-500">
                    Cuenta: #{stats.ultimoServicio.cuenta}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Tractor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{stats.ultimoServicio.maquinaria}</span>
                  </div>
                  {stats.ultimoServicio.implemento && (
                    <div className="text-slate-500 pl-5">
                      Implemento: <span className="font-semibold text-slate-700">{stats.ultimoServicio.implemento}</span>
                    </div>
                  )}
                  <div className="text-slate-500 pl-5">
                    Op: <strong className="text-slate-700">{stats.ultimoServicio.operador}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Fecha</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {formatDateDisplay(stats.ultimoServicio.fecha)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                    <span className="text-lg font-black text-emerald-600 font-mono-numbers">
                      {formatCurrency(stats.ultimoServicio.total)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay servicios registrados todavía.
              </div>
            )}
          </div>

          {stats.ultimoServicio && (
            <button
              onClick={() => onSelectServicio(stats.ultimoServicio!)}
              className="w-full h-10 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Ver Comprobante</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabla: Servicios Recientes */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Servicios Recientes
                </h3>
                <p className="text-xs text-slate-500">Últimos movimientos registrados en Google Sheets</p>
              </div>

              <button
                onClick={onVerRegistrosClick}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Nro.</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Maquinaria</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {(!stats.ultimosServicios || stats.ultimosServicios.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No hay registros recientes.
                      </td>
                    </tr>
                  ) : (
                    stats.ultimosServicios.map((s: Servicio) => (
                      <tr 
                        key={s.nroServicio} 
                        onClick={() => onSelectServicio(s)}
                        className="hover:bg-blue-50/50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          {s.nroServicio}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateDisplay(s.fecha)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {s.cliente}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {s.maquinaria}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-600 whitespace-nowrap">
                          {formatCurrency(s.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={onVerRegistrosClick}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 transition"
            >
              Consultar todos los registros oficiales &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
