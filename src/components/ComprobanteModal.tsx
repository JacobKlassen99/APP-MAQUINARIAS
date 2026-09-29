import React, { useEffect } from 'react';
import { X, Printer, Tractor, User, Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import { Servicio } from '../types';
import { formatCurrency, formatNumber, formatDateDisplay } from '../utils/formatters';

interface ComprobanteModalProps {
  servicio: Servicio;
  onClose: () => void;
}

export const ComprobanteModal: React.FC<ComprobanteModalProps> = ({ servicio, onClose }) => {
  // When modal is mounted, add class to body so print CSS isolates ONLY the comprobante
  useEffect(() => {
    document.body.classList.add('comprobante-modal-open');
    return () => {
      document.body.classList.remove('comprobante-modal-open');
    };
  }, []);

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Ensure class is present synchronously before print dialog opens
    document.body.classList.add('comprobante-modal-open');
    window.print();
  };

  return (
    <div className="comprobante-backdrop fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="comprobante-card bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="bg-[#0a2342] text-white px-5 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm uppercase tracking-wide">
              Comprobante de Servicio
            </span>
            <span className="text-xs font-mono font-bold bg-blue-600 px-2.5 py-0.5 rounded text-white">
              {servicio.nroServicio}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Imprimir comprobante"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 rounded-lg cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="comprobante-papel p-6 sm:p-8 space-y-5 bg-white text-slate-900">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block">
                SISTEMA OFICIAL DE CONTROL
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                CONTROL DE MAQUINARIA
              </h1>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-0.5">
                Comprobante Oficial de Trabajo
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Nro. de Servicio
              </span>
              <span className="text-xl font-black text-blue-900 font-mono-numbers">
                {servicio.nroServicio}
              </span>
              <span className="text-xs text-slate-700 block font-bold mt-0.5">
                Fecha: {formatDateDisplay(servicio.fecha)}
              </span>
            </div>
          </div>

          {/* Client & Operator Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Datos del Cliente</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{servicio.cliente}</div>
              <div className="text-slate-700 mt-0.5 font-bold">
                Cuenta Nro.: <strong className="text-slate-900 font-mono">#{servicio.cuenta}</strong>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Operador Responsable</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{servicio.operador}</div>
              <div className="text-slate-600 mt-0.5 font-medium">Personal Autorizado</div>
            </div>
          </div>

          {/* Medición y Tiempos de Trabajo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Tipo de Medición</span>
              <span className="font-extrabold text-slate-900">{servicio.tipo || 'Horómetro'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Lectura Inicio</span>
              <span className="font-mono font-bold text-slate-800">{servicio.inicio || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Lectura Fin</span>
              <span className="font-mono font-bold text-slate-800">{servicio.fin || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Horas Calculadas</span>
              <span className="font-mono font-black text-blue-900">{formatNumber(servicio.horas, 2)} hrs</span>
            </div>
          </div>

          {/* Machine & Service Details Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5">Maquinaria</th>
                  <th className="px-3.5 py-2.5">Implemento / Servicio</th>
                  <th className="px-3.5 py-2.5 text-center">Unidad</th>
                  <th className="px-3.5 py-2.5 text-right">Cantidad</th>
                  <th className="px-3.5 py-2.5 text-right">Horas</th>
                  <th className="px-3.5 py-2.5 text-right">Precio Unit.</th>
                  <th className="px-3.5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="px-3.5 py-3 font-extrabold text-slate-900 text-sm">
                    {servicio.maquinaria}
                  </td>
                  <td className="px-3.5 py-3 text-slate-700 font-medium">
                    {servicio.implemento || 'Sin implemento'}
                  </td>
                  <td className="px-3.5 py-3 text-center text-slate-700 font-bold">
                    {servicio.unidad}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                    {formatNumber(servicio.cantidad, 2)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                    {formatNumber(servicio.horas, 2)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-700">
                    {formatCurrency(servicio.precio)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900 text-sm">
                    {formatCurrency(servicio.total)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="px-3.5 py-3 text-right uppercase tracking-wider text-slate-800 font-extrabold">
                    TOTAL GENERAL A PAGAR:
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-base font-black text-emerald-700">
                    {formatCurrency(servicio.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature Boxes */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t-2 border-slate-900 pt-2 font-black text-slate-900">
                Firma del Operador
              </div>
              <div className="text-xs text-slate-700 font-bold mt-0.5">
                {servicio.operador}
              </div>
            </div>

            <div>
              <div className="border-t-2 border-slate-900 pt-2 font-black text-slate-900">
                Firma y Aprobación del Cliente
              </div>
              <div className="text-xs text-slate-700 font-bold mt-0.5">
                {servicio.cliente} (Cuenta #{servicio.cuenta})
              </div>
            </div>
          </div>

          {/* Official Footer */}
          <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              <strong>CONTROL DE MAQUINARIA</strong> — Comprobante emitido automáticamente
            </span>
            <span>
              Documento oficial de control interno
            </span>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR COMPROBANTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

