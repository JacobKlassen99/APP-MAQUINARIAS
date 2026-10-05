import { TipoHora, Servicio } from '../types';

/**
 * Formats monetary amounts to user requirement:
 * "$us. 39,00", "$us. 312,00", "$us. 3,60", "$us. 360,00"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '$us. 0,00';
  }
  const num = Number(amount);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$us. ${formattedInt},${decPart}`;
}

/**
 * Formats a plain number with comma decimals
 */
export function formatNumber(val: number | string | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0';
  }
  const num = Number(val);
  if (Number.isInteger(num) && decimals === 0) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

/**
 * Formats a date YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // If it's already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // If it's YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  // If it's a date string
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return dateStr;
}

/**
 * Gets today's date in YYYY-MM-DD for date input
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Limpia y extrae el valor numérico puro del horómetro,
 * eliminando definitivamente cualquier conversión no deseada a Date, GMT o hora de Bolivia.
 * Si Google Sheets convirtió un número como 4021.2 en fecha "Mon Feb 01 4021",
 * recupera el número original con precisión.
 */
export function limpiarValorHorometro(val: any, horas?: number, inicioBase?: string): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str) return '';

  // Si ya es un número limpio (ej: "1250", "1258.5", "1258,5")
  if (/^-?\d+([.,]\d+)?$/.test(str)) {
    return str.replace(',', '.');
  }

  // Si contiene GMT, hora de Bolivia o formato de fecha JavaScript
  if (str.includes('GMT') || str.includes('hora de') || /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+/.test(str)) {
    // Si tenemos inicioBase numérico y horas conocidas > 0, calcular fin exacto: fin = inicio + horas
    if (horas !== undefined && horas !== null && Number(horas) > 0 && inicioBase) {
      const baseNum = parseFloat(String(inicioBase).replace(',', '.'));
      if (!isNaN(baseNum)) {
        const calculado = Math.round((baseNum + Number(horas)) * 100) / 100;
        return String(calculado);
      }
    }

    // Intentar extraer año y mes si Google Sheets convirtió un número decimal a Fecha (ej. 4021 Feb -> 4021.2)
    const match = str.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{3,5})/);
    if (match) {
      const monthStr = match[1];
      const year = match[3];
      const monthMap: Record<string, number> = {
        Jan: 1, Ene: 1, Feb: 2, Mar: 3, Apr: 4, Abr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Ago: 8, Sep: 9, Set: 9, Oct: 10, Nov: 11, Dec: 12, Dic: 12
      };
      const monthNum = monthMap[monthStr];
      if (monthNum && monthNum > 0) {
        return `${year}.${monthNum}`;
      }
      return year;
    }

    // Si hay un número de 3 o más dígitos (como el año/horómetro)
    const yearMatch = str.match(/\b([1-9]\d{2,4})\b/);
    if (yearMatch) {
      return yearMatch[1];
    }

    return '';
  }

  return str;
}

/**
 * Calculates hours based on Tipo (Horómetro vs Horario)
 */
export function calcularHoras(tipo: TipoHora | string, inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;

  const t = String(tipo || '').toLowerCase();
  const isHorario = t.includes('horar') || (String(inicio).includes(':') && String(fin).includes(':'));

  if (!isHorario) {
    const cleanIni = limpiarValorHorometro(inicio);
    const cleanFin = limpiarValorHorometro(fin);
    const valInicio = parseFloat(cleanIni.replace(',', '.'));
    const valFin = parseFloat(cleanFin.replace(',', '.'));
    if (isNaN(valInicio) || isNaN(valFin)) return 0;
    const diff = valFin - valInicio;
    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
  }

  if (isHorario) {
    const parseTime = (timeStr: string) => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    const t1 = parseTime(inicio);
    const t2 = parseTime(fin);
    if (t1 === null || t2 === null) return 0;

    let diffMinutes = t2 - t1;
    // Midnight rollover support (e.g., 22:00 -> 02:00 is 4 hours)
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    const hours = diffMinutes / 60;
    return Math.round(hours * 100) / 100;
  }

  return 0;
}

/**
 * Formats next sequence: SERV-000001, SERV-000125
 */
export function formatNumeroServicio(seq: number): string {
  const padded = String(seq).padStart(6, '0');
  return `SERV-${padded}`;
}

/**
 * Extracts number from "SERV-000125" -> 125
 */
export function parseNumeroServicio(nro: string): number {
  if (!nro) return 0;
  const match = nro.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Ordena servicios siguiendo la regla oficial del sistema:
 * 1. Primero todos los registros nuevos que comienzan con SERV-
 * 2. Dentro de SERV-, del número más alto al más bajo (SERV-000009 > SERV-000008 > ... > SERV-000001)
 * 3. Después todos los registros históricos que comienzan con REC-
 * 4. Dentro de REC-, del número más alto al más bajo (REC-000940 > REC-000939 > ... > REC-000001)
 * 5. Otros formatos al final, del número más alto al más bajo.
 * 6. Desempate secundario por fecha descendente y fila de Google Sheets.
 */
export function ordenarServiciosDesc(items: Servicio[]): Servicio[] {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const nroA = String(a.nroServicio || a.numero || '').trim().toUpperCase();
    const nroB = String(b.nroServicio || b.numero || '').trim().toUpperCase();

    const esServA = nroA.startsWith('SERV-');
    const esServB = nroB.startsWith('SERV-');
    const esRecA = nroA.startsWith('REC-');
    const esRecB = nroB.startsWith('REC-');

    const tierA = esServA ? 1 : (esRecA ? 2 : 3);
    const tierB = esServB ? 1 : (esRecB ? 2 : 3);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    const numA = parseInt(nroA.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(nroB.replace(/\D/g, ''), 10) || 0;

    if (numA !== numB) {
      return numB - numA;
    }

    if (b.fecha && a.fecha && b.fecha !== a.fecha) {
      return b.fecha.localeCompare(a.fecha);
    }

    return (b.fila || 0) - (a.fila || 0);
  });
}

/**
 * Normaliza una cadena de texto para búsquedas:
 * - Elimina acentos y tildes (á->a, é->e, í->i, ó->o, ú->u, ñ se preserva o normaliza limpiamente)
 * - Convierte a minúsculas
 * - Elimina espacios redundantes
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Evalúa si un cliente coincide con el término de búsqueda.
 * Permite buscar por:
 * - Número de cuenta (ej. "148")
 * - Cualquier nombre o apellido (ej. "Juan", "Romero", "García", "Pérez")
 * - Combinaciones parciales o no contiguas (ej. "Juan García", "Romero García")
 * - Sin distinción de mayúsculas/minúsculas ni acentos ("García" === "garcia")
 */
export function coincideCliente(
  cliente: { cuenta?: string; nombre?: string },
  terminoBusqueda: string
): boolean {
  if (!terminoBusqueda || !terminoBusqueda.trim()) return false;

  const queryNorm = normalizarTexto(terminoBusqueda);
  if (!queryNorm) return false;

  const cuentaNorm = normalizarTexto(cliente.cuenta || '');
  const nombreNorm = normalizarTexto(cliente.nombre || '');
  const textoCompleto = `${cuentaNorm} ${nombreNorm}`.trim();

  // 1. Coincidencia directa completa en la cuenta o en el nombre completo
  if (textoCompleto.includes(queryNorm)) {
    return true;
  }

  // 2. Coincidencia por términos/palabras separadas (ej. "Juan García" en "Juan Romero García")
  const palabras = queryNorm.split(/\s+/).filter(Boolean);
  if (palabras.length > 0) {
    return palabras.every((palabra) => textoCompleto.includes(palabra));
  }

  return false;
}

