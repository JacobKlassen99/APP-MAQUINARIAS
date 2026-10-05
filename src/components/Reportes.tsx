import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Printer, 
  RotateCcw, 
  Search, 
  User, 
  Check, 
  X, 
  ChevronDown, 
  Calendar,
  Layers,
  Users,
  Tractor,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Servicio, TipoReporte, ReporteItem, Cliente } from '../types';
import { 
  formatCurrency, 
  formatNumber, 
  formatDateDisplay, 
  coincideCliente, 
  ordenarServiciosDesc,
  compararCuentas
} from '../utils/formatters';

interface ReportesProps {
  servicios: Servicio[];
  clientes?: Cliente[];
  onRefrescarServicios?: () => void;
  isLoadingServicios?: boolean;
}

export const Reportes: React.FC<ReportesProps> = ({ 
  servicios, 
  clientes = [], 
  onRefrescarServicios,
  isLoadingServicios = false 
}) => {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('maquinaria');
  const [anio, setAnio] = useState<string>('TODOS');
  const [mes, setMes] = useState<string>('TODOS');
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');

  // Estado para el selector de cliente en "Reporte por Cliente"
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown si se hace click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista consolidada de clientes (de la prop o derivada de servicios)
  const listaClientesDisponibles = useMemo(() => {
    if (clientes && clientes.length > 0) return clientes;
    const mapa = new Map<string, Cliente>();
    for (const s of servicios) {
      if (s.cliente) {
        const cta = String(s.cuenta || '').trim();
        const nom = String(s.cliente || '').trim();
        const key = `${cta}__${nom}`;
        if (!mapa.has(key)) {
          mapa.set(key, { cuenta: cta, nombre: nom });
        }
      }
    }
    return Array.from(mapa.values());
  }, [clientes, servicios]);

  // Clientes filtrados por la búsqueda inteligente (cuenta, nombre, apellido)
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch || !clienteSearch.trim()) return listaClientesDisponibles;
    return listaClientesDisponibles.filter(c => coincideCliente(c, clienteSearch));
  }, [listaClientesDisponibles, clienteSearch]);

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

  // Descripción textual del período filtrado
  let periodoTexto = '';
  if (desde && hasta) {
    periodoTexto = `${formatDateDisplay(desde)} al ${formatDateDisplay(hasta)}`;
  } else if (desde) {
    periodoTexto = `Desde el ${formatDateDisplay(desde)}`;
  } else if (hasta) {
    periodoTexto = `Hasta el ${formatDateDisplay(hasta)}`;
  } else if (anio !== 'TODOS') {
    if (mes !== 'TODOS') {
      const mesObj = mesesNombres.find(m => m.val === mes);
      periodoTexto = `${mesObj?.label} de ${anio}`;
    } else {
      periodoTexto = `Año ${anio} completo`;
    }
  } else {
    periodoTexto = 'Histórico Completo (Todos los años)';
  }

  // Filtrado de servicios por período
  const serviciosFiltradosPorPeriodo = useMemo(() => {
    let filtrados = [...servicios];

    if (desde && hasta) {
      filtrados = filtrados.filter(s => s.fecha && s.fecha >= desde && s.fecha <= hasta);
    } else if (desde) {
      filtrados = filtrados.filter(s => s.fecha && s.fecha >= desde);
    } else if (hasta) {
      filtrados = filtrados.filter(s => s.fecha && s.fecha <= hasta);
    } else if (anio && anio !== 'TODOS') {
      if (mes && mes !== 'TODOS') {
        const prefix = `${anio}-${('0' + mes).slice(-2)}`;
        filtrados = filtrados.filter(s => s.fecha && s.fecha.startsWith(prefix));
      } else {
        filtrados = filtrados.filter(s => s.fecha && s.fecha.startsWith(String(anio)));
      }
    }

    return filtrados;
  }, [servicios, anio, mes, desde, hasta]);

  // CÁLCULO ESPECÍFICO: REPORTE DETALLADO POR CLIENTE
  const datosReporteCliente = useMemo(() => {
    if (tipoReporte !== 'cliente_especifico' || !clienteSeleccionado) {
      return { serviciosCliente: [], totalGeneralCliente: 0, totalHorasCliente: 0, totalCantidadCliente: 0, resumenJerarquico: [] };
    }

    // Filtrar estrictamente los servicios de ese cliente
    const ctaObjetivo = String(clienteSeleccionado.cuenta || '').trim().toLowerCase();
    const nomObjetivo = String(clienteSeleccionado.nombre || '').trim().toLowerCase();

    const deEsteCliente = serviciosFiltradosPorPeriodo.filter(s => {
      const cta = String(s.cuenta || '').trim().toLowerCase();
      const nom = String(s.cliente || '').trim().toLowerCase();
      if (ctaObjetivo !== '' && cta === ctaObjetivo) return true;
      if (nomObjetivo !== '' && nom === nomObjetivo) return true;
      return false;
    });

    // Ordenar con la regla oficial (SERV- descendente primero, luego REC- descendente)
    const ordenados = ordenarServiciosDesc(deEsteCliente);

    // Agrupación jerárquica: Maquinaria -> Implemento
    const maquinasMap = new Map<string, {
      maquinaria: string;
      implementosMap: Map<string, {
        implemento: string;
        total: number;
        serviciosCount: number;
        horas: number;
        cantidad: number;
      }>;
      totalMaquinaria: number;
      totalServicios: number;
      totalHoras: number;
      totalCantidad: number;
    }>();

    let sumTotal = 0;
    let sumHoras = 0;
    let sumCant = 0;

    for (const s of ordenados) {
      const valorTotal = Number(s.total) || 0;
      const valorHoras = Number(s.horas) || 0;
      const valorCant = Number(s.cantidad) || 0;

      sumTotal += valorTotal;
      sumHoras += valorHoras;
      sumCant += valorCant;

      const maq = (s.maquinaria && s.maquinaria.trim() !== '') ? s.maquinaria.trim() : 'Sin asignar';
      const imp = (s.implemento && s.implemento.trim() !== '') ? s.implemento.trim() : '—';

      if (!maquinasMap.has(maq)) {
        maquinasMap.set(maq, {
          maquinaria: maq,
          implementosMap: new Map(),
          totalMaquinaria: 0,
          totalServicios: 0,
          totalHoras: 0,
          totalCantidad: 0,
        });
      }

      const maqEntry = maquinasMap.get(maq)!;
      maqEntry.totalMaquinaria += valorTotal;
      maqEntry.totalServicios += 1;
      maqEntry.totalHoras += valorHoras;
      maqEntry.totalCantidad += valorCant;

      if (!maqEntry.implementosMap.has(imp)) {
        maqEntry.implementosMap.set(imp, {
          implemento: imp,
          total: 0,
          serviciosCount: 0,
          horas: 0,
          cantidad: 0,
        });
      }

      const impEntry = maqEntry.implementosMap.get(imp)!;
      impEntry.total += valorTotal;
      impEntry.serviciosCount += 1;
      impEntry.horas += valorHoras;
      impEntry.cantidad += valorCant;
    }

    const resumenJerarquico = Array.from(maquinasMap.values()).map(m => {
      const imps = Array.from(m.implementosMap.values()).map(imp => ({
        ...imp,
        total: Math.round(imp.total * 100) / 100,
        horas: Math.round(imp.horas * 100) / 100,
        cantidad: Math.round(imp.cantidad * 100) / 100,
      }));

      // Total de cada maquinaria: suma exacta de todos sus implementos
      const sumImpsTotal = imps.reduce((acc, imp) => acc + imp.total, 0);

      return {
        maquinaria: m.maquinaria,
        implementos: imps,
        totalMaquinaria: Math.round(sumImpsTotal * 100) / 100,
        totalServicios: m.totalServicios,
        totalHoras: Math.round(m.totalHoras * 100) / 100,
        totalCantidad: Math.round(m.totalCantidad * 100) / 100,
      };
    });

    // Total general del cliente: suma exacta de las maquinarias (y por tanto de todos sus implementos)
    const sumMaqsTotal = resumenJerarquico.reduce((acc, m) => acc + m.totalMaquinaria, 0);

    return {
      serviciosCliente: ordenados,
      totalGeneralCliente: Math.round(sumMaqsTotal * 100) / 100,
      totalHorasCliente: Math.round(sumHoras * 100) / 100,
      totalCantidadCliente: Math.round(sumCant * 100) / 100,
      resumenJerarquico
    };
  }, [tipoReporte, clienteSeleccionado, serviciosFiltradosPorPeriodo]);

  // CÁLCULO DE REPORTES AGRUPADOS (Maquinaria e Implemento, Cliente, Maquinaria/Cliente, Operador)
  const { items, totalGeneral, totalHoras, totalCantidad, totalServicios } = useMemo(() => {
    if (tipoReporte === 'cliente_especifico') {
      return { items: [], totalGeneral: 0, totalHoras: 0, totalCantidad: 0, totalServicios: 0 };
    }

    const acumulador: Record<string, ReporteItem> = {};

    let sumTotGeneral = 0;
    let sumTotHoras = 0;
    let sumTotCantidad = 0;

    for (const s of serviciosFiltradosPorPeriodo) {
      const maquina = s.maquinaria && s.maquinaria.trim() !== '' ? s.maquinaria.trim() : 'Sin asignar';
      const imp = s.implemento && s.implemento.trim() !== '' ? s.implemento.trim() : '—';
      const cta = s.cuenta && String(s.cuenta).trim() !== '' ? String(s.cuenta).trim() : 'S/N';
      const cli = s.cliente && s.cliente.trim() !== '' ? s.cliente.trim() : 'Sin nombre';
      const op = s.operador && s.operador.trim() !== '' ? s.operador.trim() : 'Sin operador';

      let cat = '';
      let sub = '';
      let key = '';
      let itemMaq: string | undefined = undefined;
      let itemImp: string | undefined = undefined;
      let itemCta: string | undefined = undefined;
      let itemCli: string | undefined = undefined;
      let itemOp: string | undefined = undefined;

      if (tipoReporte === 'maquinaria') {
        cat = maquina;
        sub = imp;
        itemMaq = maquina;
        itemImp = imp;
        key = `${maquina}__${imp}`;
      } else if (tipoReporte === 'maquinaria_cliente') {
        // Cuatro campos independientes: Maquinaria, Implemento, Cuenta, Cliente
        cat = maquina;
        sub = imp;
        itemMaq = maquina;
        itemImp = imp;
        itemCta = cta;
        itemCli = cli;
        key = `${cta}__${cli}__${maquina}__${imp}`;
      } else if (tipoReporte === 'cliente') {
        // Dos campos independientes: Cuenta y Cliente
        cat = cta;
        sub = cli;
        itemCta = cta;
        itemCli = cli;
        key = `${cta}__${cli}`;
      } else if (tipoReporte === 'operador') {
        // Tres campos independientes: Operador, Maquinaria e Implemento
        cat = op;
        sub = imp !== '—' ? `${maquina} / ${imp}` : maquina;
        itemOp = op;
        itemMaq = maquina;
        itemImp = imp;
        key = `${op}__${maquina}__${imp}`;
      }

      if (!acumulador[key]) {
        acumulador[key] = {
          categoria: cat,
          subcategoria: sub,
          maquinaria: itemMaq,
          implemento: itemImp,
          cuenta: itemCta,
          cliente: itemCli,
          operador: itemOp,
          servicios: 0,
          horas: 0,
          cantidad: 0,
          total: 0
        };
      }

      // SUMA DIRECTA de la columna Total (servicios.Total)
      const valorTotalServicio = Number(s.total) || 0;
      acumulador[key].servicios += 1;
      acumulador[key].horas += Number(s.horas) || 0;
      acumulador[key].cantidad += Number(s.cantidad) || 0;
      acumulador[key].total += valorTotalServicio;

      sumTotGeneral += valorTotalServicio;
      sumTotHoras += Number(s.horas) || 0;
      sumTotCantidad += Number(s.cantidad) || 0;
    }

    const itemsCalculados: ReporteItem[] = Object.values(acumulador).map(it => ({
      ...it,
      horas: Math.round(it.horas * 100) / 100,
      cantidad: Math.round(it.cantidad * 100) / 100,
      total: Math.round(it.total * 100) / 100,
    }));

    // ORDENAMIENTO SEGÚN REQUERIMIENTOS:
    if (tipoReporte === 'maquinaria_cliente') {
      // 1. Cuenta (de menor a mayor numérico natural: 1, 2, 10, 25, 100, 125, 148, 1000...).
      // 2. Cliente.
      // 3. Maquinaria.
      // 4. Implemento.
      // Todos los datos de una misma cuenta quedan juntos.
      itemsCalculados.sort((a, b) => {
        const diffCta = compararCuentas(a.cuenta, b.cuenta);
        if (diffCta !== 0) return diffCta;

        const diffCli = (a.cliente || '').localeCompare(b.cliente || '', undefined, { sensitivity: 'base' });
        if (diffCli !== 0) return diffCli;

        const diffMaq = (a.maquinaria || '').localeCompare(b.maquinaria || '', undefined, { sensitivity: 'base' });
        if (diffMaq !== 0) return diffMaq;

        return (a.implemento || '').localeCompare(b.implemento || '', undefined, { sensitivity: 'base' });
      });
    } else if (tipoReporte === 'cliente') {
      // 1. Cuenta (de menor a mayor numérico natural).
      // 2. Cliente.
      itemsCalculados.sort((a, b) => {
        const diffCta = compararCuentas(a.cuenta, b.cuenta);
        if (diffCta !== 0) return diffCta;

        return (a.cliente || '').localeCompare(b.cliente || '', undefined, { sensitivity: 'base' });
      });
    } else if (tipoReporte === 'maquinaria') {
      // Orden por Maquinaria y luego Implemento
      itemsCalculados.sort((a, b) => {
        const diffMaq = (a.maquinaria || '').localeCompare(b.maquinaria || '', undefined, { sensitivity: 'base' });
        if (diffMaq !== 0) return diffMaq;
        return (a.implemento || '').localeCompare(b.implemento || '', undefined, { sensitivity: 'base' });
      });
    } else if (tipoReporte === 'operador') {
      // Orden por Operador, luego Maquinaria, luego Implemento
      itemsCalculados.sort((a, b) => {
        const diffOp = (a.operador || '').localeCompare(b.operador || '', undefined, { sensitivity: 'base' });
        if (diffOp !== 0) return diffOp;
        const diffMaq = (a.maquinaria || '').localeCompare(b.maquinaria || '', undefined, { sensitivity: 'base' });
        if (diffMaq !== 0) return diffMaq;
        return (a.implemento || '').localeCompare(b.implemento || '', undefined, { sensitivity: 'base' });
      });
    }

    return {
      items: itemsCalculados,
      totalGeneral: Math.round(sumTotGeneral * 100) / 100,
      totalHoras: Math.round(sumTotHoras * 100) / 100,
      totalCantidad: Math.round(sumTotCantidad * 100) / 100,
      totalServicios: serviciosFiltradosPorPeriodo.length
    };
  }, [serviciosFiltradosPorPeriodo, tipoReporte]);

  const handleLimpiarPeriodo = () => {
    setDesde('');
    setHasta('');
    setMes('TODOS');
    setAnio('TODOS');
  };

  const handleImprimirReporte = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (tipoReporte === 'cliente_especifico') {
        if (!clienteSeleccionado) {
          alert('Por favor seleccione un cliente en el buscador superior para exportar el reporte.');
          return;
        }

        const aoa: any[][] = [
          ['CONTROL DE MAQUINARIA'],
          ['REPORTE DETALLADO POR CLIENTE'],
          [],
          ['Cuenta:', clienteSeleccionado.cuenta || 'S/N'],
          ['Cliente:', clienteSeleccionado.nombre],
          ['Período:', periodoTexto],
          ['Fecha de Emisión:', new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })],
          [],
          ['RESUMEN POR MAQUINARIA E IMPLEMENTO'],
          []
        ];

        // Resumen jerárquico Maquinaria -> Implemento
        datosReporteCliente.resumenJerarquico.forEach(m => {
          aoa.push([m.maquinaria.toUpperCase()]);
          m.implementos.forEach(imp => {
            aoa.push(['', imp.implemento, imp.total]);
          });
          aoa.push([`TOTAL ${m.maquinaria.toUpperCase()}`, '', m.totalMaquinaria]);
          aoa.push([]);
        });

        aoa.push(['TOTAL GENERAL', '', datosReporteCliente.totalGeneralCliente]);
        aoa.push([]);
        aoa.push([]);

        // Detalle de servicios del cliente
        aoa.push([`DETALLE DE SERVICIOS DEL CLIENTE (${datosReporteCliente.serviciosCliente.length} SERVICIOS)`]);
        aoa.push([
          'Nro. Servicio',
          'Fecha',
          'Maquinaria',
          'Implemento',
          'Operador',
          'Tipo',
          'Inicio',
          'Fin',
          'Cantidad',
          'Unidad',
          'Horas',
          'Precio ($us)',
          'Total ($us)'
        ]);

        datosReporteCliente.serviciosCliente.forEach(s => {
          aoa.push([
            s.nroServicio,
            formatDateDisplay(s.fecha),
            s.maquinaria,
            s.implemento || '—',
            s.operador,
            s.tipo || '—',
            s.inicio || '—',
            s.fin || '—',
            Number(s.cantidad) || 0,
            s.unidad,
            Number(s.horas) || 0,
            Number(s.precio) || 0,
            Number(s.total) || 0
          ]);
        });

        // Totales al pie
        aoa.push([
          'TOTALES',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          datosReporteCliente.totalCantidadCliente,
          '',
          datosReporteCliente.totalHorasCliente,
          '',
          datosReporteCliente.totalGeneralCliente
        ]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
          { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
          { wch: 12 }, { wch: 14 }, { wch: 16 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Cliente');
        const filename = `Reporte_Cliente_${clienteSeleccionado.cuenta || 'SN'}_${clienteSeleccionado.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        XLSX.writeFile(wb, filename);
        return;
      }

      // Otros tipos de reporte
      let tituloReporte = 'REPORTE CONSOLIDADO';
      let nombreHoja = 'Resumen';
      if (tipoReporte === 'maquinaria') {
        tituloReporte = 'RESUMEN POR MAQUINARIA E IMPLEMENTO';
        nombreHoja = 'Maquinaria e Implemento';
      } else if (tipoReporte === 'cliente') {
        tituloReporte = 'RESUMEN GENERAL POR CLIENTE';
        nombreHoja = 'Clientes';
      } else if (tipoReporte === 'maquinaria_cliente') {
        tituloReporte = 'REPORTE POR MAQUINARIA, IMPLEMENTO Y CLIENTE';
        nombreHoja = 'Maquinaria y Cliente';
      } else if (tipoReporte === 'operador') {
        tituloReporte = 'RESUMEN POR OPERADOR';
        nombreHoja = 'Operadores';
      }

      const aoa: any[][] = [
        ['CONTROL DE MAQUINARIA'],
        [tituloReporte],
        ['Período:', periodoTexto],
        ['Fecha de Emisión:', new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })],
        []
      ];

      if (tipoReporte === 'maquinaria') {
        aoa.push(['Maquinaria', 'Implemento', 'Servicios', 'Horas', 'Cantidad', 'Total ($us)']);
        items.forEach(item => {
          aoa.push([
            item.maquinaria,
            item.implemento || '—',
            item.servicios,
            item.horas,
            item.cantidad,
            item.total
          ]);
        });
        aoa.push(['TOTAL GENERAL', '', totalServicios, totalHoras, totalCantidad, totalGeneral]);
      } else if (tipoReporte === 'cliente') {
        aoa.push(['Cuenta', 'Cliente', 'Servicios', 'Horas', 'Cantidad', 'Total ($us)']);
        items.forEach(item => {
          aoa.push([
            item.cuenta || 'S/N',
            item.cliente || 'Sin nombre',
            item.servicios,
            item.horas,
            item.cantidad,
            item.total
          ]);
        });
        aoa.push(['TOTAL GENERAL', '', totalServicios, totalHoras, totalCantidad, totalGeneral]);
      } else if (tipoReporte === 'maquinaria_cliente') {
        // Columnas independientes según especificación:
        // A = Maquinaria | B = Implemento | C = Cuenta | D = Cliente | E = Servicios | F = Cantidad | G = Horas | H = Total
        aoa.push(['Maquinaria', 'Implemento', 'Cuenta', 'Cliente', 'Servicios', 'Cantidad', 'Horas', 'Total ($us)']);
        items.forEach(item => {
          aoa.push([
            item.maquinaria,
            item.implemento || '—',
            item.cuenta || 'S/N',
            item.cliente || 'Sin nombre',
            item.servicios,
            item.cantidad,
            item.horas,
            item.total
          ]);
        });
        aoa.push(['TOTAL GENERAL', '', '', '', totalServicios, totalCantidad, totalHoras, totalGeneral]);
      } else if (tipoReporte === 'operador') {
        aoa.push(['Operador', 'Maquinaria', 'Implemento', 'Servicios', 'Horas', 'Cantidad', 'Total ($us)']);
        items.forEach(item => {
          aoa.push([
            item.operador,
            item.maquinaria,
            item.implemento || '—',
            item.servicios,
            item.horas,
            item.cantidad,
            item.total
          ]);
        });
        aoa.push(['TOTAL GENERAL', '', '', totalServicios, totalHoras, totalCantidad, totalGeneral]);
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Anchos de columnas ajustados por cada tipo de reporte
      if (tipoReporte === 'maquinaria_cliente') {
        ws['!cols'] = [
          { wch: 22 }, // Maquinaria
          { wch: 20 }, // Implemento
          { wch: 12 }, // Cuenta
          { wch: 28 }, // Cliente
          { wch: 12 }, // Servicios
          { wch: 14 }, // Cantidad
          { wch: 14 }, // Horas
          { wch: 16 }  // Total ($us)
        ];
      } else if (tipoReporte === 'cliente') {
        ws['!cols'] = [
          { wch: 14 }, // Cuenta
          { wch: 28 }, // Cliente
          { wch: 12 }, // Servicios
          { wch: 14 }, // Horas
          { wch: 14 }, // Cantidad
          { wch: 16 }  // Total ($us)
        ];
      } else if (tipoReporte === 'operador') {
        ws['!cols'] = [
          { wch: 24 }, // Operador
          { wch: 22 }, // Maquinaria
          { wch: 20 }, // Implemento
          { wch: 12 }, // Servicios
          { wch: 14 }, // Horas
          { wch: 14 }, // Cantidad
          { wch: 16 }  // Total ($us)
        ];
      } else {
        ws['!cols'] = [
          { wch: 22 }, // Maquinaria
          { wch: 20 }, // Implemento
          { wch: 12 }, // Servicios
          { wch: 14 }, // Horas
          { wch: 14 }, // Cantidad
          { wch: 16 }  // Total ($us)
        ];
      }
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
      const filename = `Reporte_${tipoReporte}_${periodoTexto.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      console.error('Error al exportar Excel:', err);
      alert('Error al generar archivo Excel: ' + (err.message || 'Error desconocido'));
    }
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
              <p className="text-xs text-slate-500">Resumen consolidado y reportes detallados oficiales del sistema</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefrescarServicios && (
              <button
                type="button"
                onClick={onRefrescarServicios}
                disabled={isLoadingServicios}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Actualizar datos completos"
              >
                <RotateCcw className={`w-4 h-4 ${isLoadingServicios ? 'animate-spin' : ''}`} />
                <span>{isLoadingServicios ? 'Cargando...' : 'Actualizar'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportarExcel}
              className="h-11 px-4 sm:px-5 bg-green-700 hover:bg-green-800 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-green-700/20 transition flex items-center justify-center gap-2 cursor-pointer relative z-10"
              title="Descargar reporte en formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>EXPORTAR A EXCEL</span>
            </button>

            <button
              type="button"
              onClick={handleImprimirReporte}
              className="h-11 px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer relative z-10"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR REPORTE</span>
            </button>
          </div>
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
              onChange={(e) => {
                setTipoReporte(e.target.value as TipoReporte);
              }}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="maquinaria">📊 Resumen por Maquinaria e Implemento</option>
              <option value="cliente_especifico">👤 Reporte Detallado por Cliente</option>
              <option value="cliente">👥 Resumen General por Cliente</option>
              <option value="maquinaria_cliente">🚜 Maquinaria, Implemento y Cliente</option>
              <option value="operador">👷 Resumen por Operador</option>
            </select>
          </div>

          {/* 2. Año */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Año
            </label>
            <select
              value={anio}
              disabled={!!(desde || hasta)}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              <option value="TODOS">Todos los años</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* 3. Mes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mes
            </label>
            <select
              value={mes}
              disabled={!!(desde || hasta) || anio === 'TODOS'}
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

          {/* 4. Restablecer Periodo */}
          <div className="flex items-end">
            <button
              onClick={handleLimpiarPeriodo}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </button>
          </div>
        </div>

        {/* SELECTOR EXCLUSIVO PARA REPORTE DETALLADO POR CLIENTE */}
        {tipoReporte === 'cliente_especifico' && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <label className="block text-xs font-extrabold text-blue-900 uppercase">
              Seleccionar Cliente para el Reporte *
            </label>
            <div className="relative" ref={dropdownRef}>
              <div 
                className="w-full min-h-11 px-3 py-2 bg-white border border-blue-300 rounded-xl flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs">
                      Cta: #{clienteSeleccionado.cuenta}
                    </span>
                    <span>{clienteSeleccionado.nombre}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm font-medium">
                    Buscar cliente por Cuenta (ej: 148), Nombre o Apellido...
                  </span>
                )}
                <div className="flex items-center gap-1 text-slate-400">
                  {clienteSeleccionado && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClienteSeleccionado(null);
                        setClienteSearch('');
                      }}
                      className="p-1 hover:text-red-500 rounded"
                      title="Quitar cliente seleccionado"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Menú desplegable con buscador inteligente */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-72 flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escriba número de cuenta o nombre (ej: 148, Juan, Romero)..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-medium"
                    />
                    {clienteSearch && (
                      <button
                        type="button"
                        onClick={() => setClienteSearch('')}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-56 divide-y divide-slate-100 text-xs sm:text-sm">
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No se encontró ningún cliente con ese término de búsqueda.
                      </div>
                    ) : (
                      clientesFiltrados.map((c, i) => {
                        const esSeleccionado = clienteSeleccionado?.cuenta === c.cuenta && clienteSeleccionado?.nombre === c.nombre;
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setClienteSeleccionado(c);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition ${
                              esSeleccionado ? 'bg-blue-50 font-bold text-blue-700' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                {c.cuenta || 'S/N'}
                              </span>
                              <span>{c.nombre}</span>
                            </div>
                            {esSeleccionado && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rango de fechas personalizado opcional (Desde / Hasta) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <span className="font-bold text-slate-500 whitespace-nowrap">Filtrar por Rango Específico:</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400 text-[11px] font-bold">Desde:</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
            />
            <span className="text-slate-400 text-[11px] font-bold">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-10 px-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
            />
          </div>
          {(desde || hasta) && (
            <span className="text-blue-600 font-bold text-[11px]">
              (Sobrescribe filtro de mes y año)
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

              {tipoReporte === 'cliente_especifico' ? (
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    REPORTE DE SERVICIOS POR CLIENTE
                  </h1>
                  {clienteSeleccionado ? (
                    <div className="mt-2 text-sm font-semibold text-slate-800 space-y-0.5">
                      <p>
                        Cuenta: <strong className="font-mono text-blue-800 font-extrabold">{clienteSeleccionado.cuenta || 'S/N'}</strong>
                      </p>
                      <p>
                        Cliente: <strong className="text-slate-900 font-extrabold">{clienteSeleccionado.nombre}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 font-bold mt-1">
                      (Seleccione un cliente en el buscador superior para generar el reporte)
                    </p>
                  )}
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {tipoReporte === 'maquinaria' && 'Reporte de Servicios: Resumen por Maquinaria e Implemento'}
                  {tipoReporte === 'maquinaria_cliente' && 'Reporte de Servicios: Maquinaria, Implemento y Cliente'}
                  {tipoReporte === 'cliente' && 'Reporte de Servicios: Resumen General por Cliente'}
                  {tipoReporte === 'operador' && 'Reporte de Servicios: Resumen por Operador'}
                </h1>
              )}

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
              {tipoReporte === 'cliente_especifico' ? datosReporteCliente.serviciosCliente.length : totalServicios}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Horas Totales</span>
            <span className="text-xl font-black text-blue-700 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatNumber(tipoReporte === 'cliente_especifico' ? datosReporteCliente.totalHorasCliente : totalHoras, 2)} hrs
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">Otras Cantidades</span>
            <span className="text-xl font-black text-slate-700 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatNumber(tipoReporte === 'cliente_especifico' ? datosReporteCliente.totalCantidadCliente : totalCantidad, 2)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:border print:border-slate-300 print:p-2 print:shadow-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase block print:text-black">
              {tipoReporte === 'cliente_especifico' ? 'Total General del Cliente' : 'Total Facturado'}
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono-numbers mt-0.5 block print:text-black print:text-base">
              {formatCurrency(tipoReporte === 'cliente_especifico' ? datosReporteCliente.totalGeneralCliente : totalGeneral)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VISTA 1: REPORTE POR CLIENTE (RESUMEN JERÁRQUICO + DETALLE DE SERVICIOS)   */}
        {/* ========================================================================= */}
        {tipoReporte === 'cliente_especifico' ? (
          <div>
            {!clienteSeleccionado ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <User className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-600">Ningún cliente seleccionado</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Utilice el buscador superior para seleccionar un cliente por número de cuenta (ej. 148), nombre o apellido.
                </p>
              </div>
            ) : datosReporteCliente.serviciosCliente.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                No se registran servicios para {clienteSeleccionado.nombre} en el período seleccionado ({periodoTexto}).
              </div>
            ) : (
              <div>
                {/* 1. SECCIÓN DE RESUMEN POR MAQUINARIA E IMPLEMENTO (JERÁRQUICA) */}
                <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200 print:bg-white print:p-4 print:border-slate-300">
                  <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:border print:border-slate-400 print:shadow-none">
                    {/* Título de la sección */}
                    <div className="bg-[#0a2342] text-white px-5 py-3 flex items-center justify-between print:bg-slate-900">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-300 print:hidden" />
                        <span>RESUMEN POR MAQUINARIA E IMPLEMENTO</span>
                      </h2>
                      <span className="text-[11px] text-blue-200 font-medium print:text-slate-300">
                        {datosReporteCliente.resumenJerarquico.length} Maquinarias utilizadas
                      </span>
                    </div>

                    {/* Lista jerárquica con subtotales */}
                    <div className="p-5 sm:p-7 divide-y divide-slate-100 print:divide-slate-200 space-y-6">
                      {datosReporteCliente.resumenJerarquico.map((m, mIdx) => (
                        <div key={mIdx} className={mIdx > 0 ? "pt-6" : ""}>
                          {/* Nombre de la Maquinaria en mayúsculas */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                              {m.maquinaria.toUpperCase()}
                            </span>
                          </div>

                          {/* Lista de implementos */}
                          <div className="space-y-2 pl-3 sm:pl-5 text-xs sm:text-sm">
                            {m.implementos.map((imp, impIdx) => (
                              <div key={impIdx} className="flex items-baseline justify-between gap-2 text-slate-800">
                                <span className="font-semibold text-slate-800 shrink-0">
                                  {imp.implemento}
                                </span>

                                {/* Línea punteada que conecta con el subtotal */}
                                <div className="flex-1 border-b border-dotted border-slate-300 mx-2 relative top-[-4px] print:border-slate-400" />

                                {/* Subtotal del implemento calculado exclusivamente sumando servicios.Total */}
                                <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {formatCurrency(imp.total)}
                                </span>
                              </div>
                            ))}

                            {/* Total de la maquinaria */}
                            <div className="flex items-baseline justify-between gap-2 pt-2.5 mt-1 border-t border-slate-200 font-black text-slate-900 print:border-slate-300">
                              <span className="text-xs uppercase tracking-wider text-slate-950">
                                TOTAL {m.maquinaria.toUpperCase()}
                              </span>
                              <div className="flex-1 border-b border-dotted border-slate-400 mx-2 relative top-[-4px]" />
                              <span className="font-mono text-sm sm:text-base font-black text-blue-950 whitespace-nowrap">
                                {formatCurrency(m.totalMaquinaria)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* TOTAL GENERAL */}
                      <div className="pt-6 mt-4 border-t-2 border-slate-900 bg-slate-50/80 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 print:bg-white print:border-t-2 print:border-black">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950">
                            TOTAL GENERAL
                          </span>
                          <div className="flex-1 border-b border-dotted border-slate-500 mx-2 relative top-[-4px]" />
                          <span className="font-mono text-base sm:text-lg font-black text-emerald-700 whitespace-nowrap print:text-black">
                            {formatCurrency(datosReporteCliente.totalGeneralCliente)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. ENCABEZADO DE LA TABLA DETALLADA DE SERVICIOS */}
                <div className="px-6 py-4 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between print:bg-slate-100 print:py-2 print:border-slate-300">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    DETALLE DE SERVICIOS DEL CLIENTE ({datosReporteCliente.serviciosCliente.length} SERVICIOS)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium print:hidden">
                    Ordenados del más reciente al más antiguo
                  </span>
                </div>

                {/* 3. TABLA CON LAS 13 COLUMNAS COMPLETAS */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-200 print-table">
                <thead className="bg-[#0a2342] text-white">
                  <tr>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider">Nro. Servicio</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider">Fecha</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider">Maquinaria</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider">Implemento</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider">Operador</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Tipo</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Inicio</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Fin</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Cantidad</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Unidad</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Horas</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Precio</th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {datosReporteCliente.serviciosCliente.map((s, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50">
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {s.nroServicio}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-600">
                        {formatDateDisplay(s.fecha)}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {s.maquinaria}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {s.implemento && s.implemento.trim() !== '' ? s.implemento : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                        {s.operador}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">
                        {s.tipo || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                        {s.inicio || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                        {s.fin || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-700">
                        {s.cantidad ? formatNumber(s.cantidad, 2) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500 font-semibold">
                        {s.unidad}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                        {s.horas ? formatNumber(s.horas, 2) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(s.precio)}
                      </td>
                      {/* Total directo de servicios.Total */}
                      <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-600 whitespace-nowrap">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300">
                  <tr>
                    <td 
                      colSpan={8} 
                      className="px-3 py-3.5 text-slate-900 uppercase font-black tracking-wider text-xs sm:text-sm"
                    >
                      TOTAL GENERAL DEL CLIENTE
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-extrabold text-slate-800">
                      {formatNumber(datosReporteCliente.totalCantidadCliente, 2)}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold text-slate-500">
                      —
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-extrabold text-blue-900">
                      {formatNumber(datosReporteCliente.totalHorasCliente, 2)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-slate-500">
                      —
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-black text-emerald-700 text-sm sm:text-base whitespace-nowrap">
                      {formatCurrency(datosReporteCliente.totalGeneralCliente)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    ) : (
          /* ========================================================================= */
          /* VISTA 2: TABLAS CONSOLIDADAS (MAQUINARIA E IMPLEMENTO, CLIENTE, ETC.)    */
          /* ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200 print-table">
              <thead className="bg-[#0a2342] text-white">
                <tr>
                  {tipoReporte === 'maquinaria_cliente' ? (
                    <>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Maquinaria</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Implemento</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Cuenta</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Cliente</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Servicios</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Cantidad</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Horas</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                    </>
                  ) : tipoReporte === 'cliente' ? (
                    <>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Cuenta</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Servicios</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Horas</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Cantidad</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                    </>
                  ) : tipoReporte === 'operador' ? (
                    <>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Operador</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Maquinaria</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider">Implemento</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Servicios</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Horas</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Cantidad</th>
                      <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Maquinaria</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Implemento</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Servicios</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Horas</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Cantidad</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={
                        tipoReporte === 'maquinaria_cliente' ? 8 :
                        tipoReporte === 'operador' ? 7 : 6
                      } 
                      className="p-8 text-center text-slate-400"
                    >
                      No se registran servicios para el período seleccionado ({periodoTexto}).
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50">
                      {tipoReporte === 'maquinaria_cliente' ? (
                        <>
                          <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {item.maquinaria}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                            {item.implemento || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {item.cuenta || 'S/N'}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                            {item.cliente}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-center text-slate-700">
                            {item.servicios}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">
                            {formatNumber(item.cantidad, 2)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right font-semibold text-slate-700">
                            {formatNumber(item.horas, 2)}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-black text-right text-emerald-600 whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </td>
                        </>
                      ) : tipoReporte === 'cliente' ? (
                        <>
                          <td className="px-4 py-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {item.cuenta || 'S/N'}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                            {item.cliente}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-center text-slate-700">
                            {item.servicios}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right font-semibold text-slate-700">
                            {formatNumber(item.horas, 2)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-slate-600">
                            {formatNumber(item.cantidad, 2)}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-black text-right text-emerald-600 whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </td>
                        </>
                      ) : tipoReporte === 'operador' ? (
                        <>
                          <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {item.operador}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                            {item.maquinaria}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                            {item.implemento || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-center text-slate-700">
                            {item.servicios}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right font-semibold text-slate-700">
                            {formatNumber(item.horas, 2)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">
                            {formatNumber(item.cantidad, 2)}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-black text-right text-emerald-600 whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {item.maquinaria}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                            {item.implemento || '—'}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-center text-slate-700">
                            {item.servicios}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right font-semibold text-slate-700">
                            {formatNumber(item.horas, 2)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-slate-600">
                            {formatNumber(item.cantidad, 2)}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-black text-right text-emerald-600 whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300">
                  <tr>
                    {tipoReporte === 'maquinaria_cliente' ? (
                      <>
                        <td 
                          colSpan={4} 
                          className="px-3 py-3.5 text-slate-900 uppercase font-extrabold tracking-wider"
                        >
                          TOTAL GENERAL CONSOLIDADO
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono font-extrabold text-blue-900">
                          {totalServicios}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-extrabold text-slate-800">
                          {formatNumber(totalCantidad, 2)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-extrabold text-blue-900">
                          {formatNumber(totalHoras, 2)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                          {formatCurrency(totalGeneral)}
                        </td>
                      </>
                    ) : tipoReporte === 'operador' ? (
                      <>
                        <td 
                          colSpan={3} 
                          className="px-3 py-3.5 text-slate-900 uppercase font-extrabold tracking-wider"
                        >
                          TOTAL GENERAL CONSOLIDADO
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono font-extrabold text-blue-900">
                          {totalServicios}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-extrabold text-blue-900">
                          {formatNumber(totalHoras, 2)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-extrabold text-slate-800">
                          {formatNumber(totalCantidad, 2)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                          {formatCurrency(totalGeneral)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td 
                          colSpan={2} 
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
                        <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                          {formatCurrency(totalGeneral)}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Pie de Impresión */}
        <div className="p-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>CONTROL DE MAQUINARIA</strong> — Sistema de Gestión Oficial
          </div>
          <div>
            Totales calculados directamente desde los registros del sistema
          </div>
        </div>
      </div>
    </div>
  );
};
