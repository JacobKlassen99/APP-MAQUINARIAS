import { 
  Cliente, 
  Operador, 
  MaquinariaConfig, 
  Servicio, 
  FiltrosServicio, 
  FiltrosPaginacion,
  RespuestaPaginada,
  DashboardStats,
  TipoReporte,
  ReporteItem
} from '../types';
import { ordenarServiciosDesc } from '../utils/formatters';

declare global {
  interface Window {
    google?: {
      script?: {
        run: {
          withSuccessHandler: (fn: (res: any) => void) => {
            withFailureHandler: (fn: (err: any) => void) => any;
          };
          [key: string]: any;
        };
      };
    };
  }
}

/**
 * URL oficial del Web App de Google Apps Script.
 * Google Sheets es la ÚNICA fuente de información.
 */
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwFzFAs95Yaf_X4kdUurEtKhjW36-qa2xcZlGPsI2FOiH7qLGPG3uwpHNoKF7AU8REN/exec';

// Soporta variable de entorno en Netlify (VITE_APPS_SCRIPT_URL o VITE_GAS_URL) con fallback automático a la URL oficial
const ENV_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env)
  ? ((import.meta as any).env.VITE_APPS_SCRIPT_URL || (import.meta as any).env.VITE_GAS_URL)
  : undefined;

export const APPS_SCRIPT_URL = (ENV_URL && typeof ENV_URL === 'string' && ENV_URL.startsWith('http'))
  ? ENV_URL.trim()
  : DEFAULT_URL;

function isGasMode(): boolean {
  return typeof window !== 'undefined' && typeof window.google?.script?.run !== 'undefined';
}

function callGasNative<T = any>(functionName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!window.google?.script?.run) {
      reject(new Error('google.script.run no está disponible en este entorno'));
      return;
    }

    const runner = window.google.script.run
      .withSuccessHandler((res: any) => {
        if (res && (res.ok === false || res.exito === false) && (res.error || res.mensaje)) {
          reject(new Error(res.error || res.mensaje));
          return;
        }
        const data = res && res.datos !== undefined ? res.datos : res;
        resolve(data);
      })
      .withFailureHandler((err: any) => {
        const msg = err && err.message ? err.message : String(err);
        reject(new Error(msg));
      });

    if (typeof runner[functionName] === 'function') {
      runner[functionName](...args);
    } else {
      reject(new Error(`Función '${functionName}' no existe en el script del servidor`));
    }
  });
}

/**
 * Petición HTTP GET al Web App real de Google Apps Script con reintento automático si Google entrega HTML transitorio
 */
async function callGasGet<T = any>(action: string, params: Record<string, string> = {}, maxRetries = 2): Promise<T> {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        if (attempt < maxRetries && (text.includes('<html') || text.includes('<!DOCTYPE'))) {
          // Breve espera antes del reintento para superar el límite transitorio de concurrencia de Google
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw new Error(`El Web App no devolvió JSON válido. Respuesta: ${text.slice(0, 160)}`);
      }

      if (json && (json.ok === false || json.exito === false)) {
        const errorMsg = json.error || json.mensaje || 'Error en la respuesta del Web App';
        throw new Error(errorMsg);
      }

      return (json && json.datos !== undefined ? json.datos : json) as T;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Error al conectar con Google Apps Script');
}

/**
 * Petición HTTP GET al Web App real de Google Apps Script preservando la estructura completa de respuesta (para paginación)
 */
async function callGasGetFull<T = any>(action: string, params: Record<string, string> = {}, maxRetries = 2): Promise<T> {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        if (attempt < maxRetries && (text.includes('<html') || text.includes('<!DOCTYPE'))) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw new Error(`El Web App no devolvió JSON válido. Respuesta: ${text.slice(0, 160)}`);
      }

      if (json && (json.ok === false || json.exito === false)) {
        const errorMsg = json.error || json.mensaje || 'Error en la respuesta del Web App';
        throw new Error(errorMsg);
      }

      return json as T;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Error al conectar con Google Apps Script');
}

/**
 * Petición HTTP POST al Web App real de Google Apps Script
 */
async function callGasPost<T = any>(action: string, datos: any = {}, extraProps: Record<string, any> = {}): Promise<T> {
  const payload = {
    action,
    datos,
    ...extraProps,
  };

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`El Web App no devolvió JSON válido tras POST. Respuesta: ${text.slice(0, 160)}`);
  }

  if (json && (json.ok === false || json.exito === false)) {
    const errorMsg = json.error || json.mensaje || 'Error al procesar la solicitud en Google Sheets';
    throw new Error(errorMsg);
  }

  return (json && json.datos !== undefined ? json.datos : json) as T;
}

/**
 * Normaliza servicios de Google Sheets al formato de la aplicación
 */
function normalizarServicios(raw: any[]): Servicio[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const nro = String(item.numero || item.nroServicio || '').trim();
    
    // NUNCA permitir cadenas de fecha/GMT en horómetro o inicio/fin
    let rawInicio = String(item.inicio ?? '').trim();
    let rawFin = String(item.fin ?? '').trim();
    if (rawInicio.includes('GMT') || rawInicio.includes('hora de') || /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d+/.test(rawInicio)) {
      rawInicio = '';
    }
    if (rawFin.includes('GMT') || rawFin.includes('hora de') || /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d+/.test(rawFin)) {
      rawFin = '';
    }

    const filaNum = typeof item.fila === 'number' 
      ? item.fila 
      : (typeof item.filaIndex === 'number' 
        ? item.filaIndex 
        : (parseInt(item.fila || item.filaIndex, 10) || undefined));

    return {
      nroServicio: nro,
      numero: nro,
      fecha: String(item.fecha || '').trim(),
      cuenta: String(item.cuenta || '').trim(),
      cliente: String(item.cliente || '').trim(),
      maquinaria: String(item.maquinaria || '').trim(),
      implemento: String(item.implemento || '').trim(),
      operador: String(item.operador || '').trim(),
      tipo: (item.tipo as any) || '',
      inicio: rawInicio,
      fin: rawFin,
      cantidad: Number(item.cantidad) || 0,
      unidad: (item.unidad as any) || 'Hora',
      horas: Number(item.horas) || 0,
      precio: Number(item.precio) || 0,
      total: Number(item.total) || 0,
      id: nro,
      fila: filaNum,
    };
  });
}

function procesarReporteEnCliente(servicios: Servicio[], filtros: {
  tipo: TipoReporte;
  anio?: string;
  mes?: string;
  desde?: string;
  hasta?: string;
}) {
  let filtrados = servicios;

  if (filtros.anio) {
    filtrados = filtrados.filter(s => s.fecha && s.fecha.startsWith(filtros.anio!));
  }
  if (filtros.mes && filtros.anio) {
    const mesPad = filtros.mes.padStart(2, '0');
    const prefijo = `${filtros.anio}-${mesPad}`;
    filtrados = filtrados.filter(s => s.fecha && s.fecha.startsWith(prefijo));
  }
  if (filtros.desde) {
    filtrados = filtrados.filter(s => s.fecha >= filtros.desde!);
  }
  if (filtros.hasta) {
    filtrados = filtrados.filter(s => s.fecha <= filtros.hasta!);
  }

  const grupos = new Map<string, ReporteItem>();

  filtrados.forEach(s => {
    let clave = '';
    let cat = '';
    let subcat: string | undefined = undefined;

    const imp = s.implemento ? s.implemento.trim() : '—';

    switch (filtros.tipo) {
      case 'maquinaria':
        cat = s.maquinaria || 'Sin asignar';
        subcat = imp;
        clave = `${cat}|${subcat}`;
        break;
      case 'maquinaria_cliente':
        cat = s.maquinaria || 'Sin asignar';
        subcat = `${imp !== '—' ? imp + ' — ' : ''}${s.cliente} (${s.cuenta})`;
        clave = `${cat}|${subcat}`;
        break;
      case 'cliente':
        cat = s.cliente;
        subcat = `Cta: ${s.cuenta}`;
        clave = `${cat}|${subcat}`;
        break;
      case 'cliente_especifico':
        cat = `Cuenta #${s.cuenta} - ${s.cliente}`;
        subcat = imp !== '—' ? `${s.maquinaria} / ${imp}` : s.maquinaria;
        clave = `${cat}|${subcat}`;
        break;
      case 'operador':
        cat = s.operador || 'Sin operador';
        subcat = s.maquinaria + (imp !== '—' ? ` (${imp})` : '');
        clave = `${cat}|${subcat}`;
        break;
    }

    const actual = grupos.get(clave) || {
      categoria: cat,
      subcategoria: subcat,
      servicios: 0,
      horas: 0,
      cantidad: 0,
      total: 0,
    };

    actual.servicios += 1;
    actual.horas += s.horas;
    actual.cantidad += s.cantidad;
    actual.total += s.total;

    grupos.set(clave, actual);
  });

  const items = Array.from(grupos.values()).map(it => ({
    ...it,
    horas: Math.round(it.horas * 100) / 100,
    cantidad: Math.round(it.cantidad * 100) / 100,
    total: Math.round(it.total * 100) / 100,
  }));

  const totalGeneral = Math.round(items.reduce((sum, it) => sum + it.total, 0) * 100) / 100;
  const totalHoras = Math.round(items.reduce((sum, it) => sum + it.horas, 0) * 100) / 100;
  const totalCantidad = Math.round(items.reduce((sum, it) => sum + it.cantidad, 0) * 100) / 100;
  const totalServicios = items.reduce((sum, it) => sum + it.servicios, 0);

  return {
    items,
    totalGeneral,
    totalHoras,
    totalCantidad,
    totalServicios,
  };
}

export const gasService = {
  /**
   * Obtiene los catálogos de Google Sheets
   */
  async obtenerDatosIniciales(): Promise<{
    clientes: Cliente[];
    operadores: Operador[];
    maquinaria: MaquinariaConfig[];
    siguienteNumero: string;
    ultimoNumero: string;
  }> {
    if (isGasMode()) {
      const res = await callGasNative<any>('obtenerDatosIniciales');
      return {
        clientes: (res.clientes || []).map((c: any) => ({
          cuenta: String(c.cuenta || ''),
          nombre: String(c.nombre || ''),
          fila: typeof c.fila === 'number' ? c.fila : undefined,
        })),
        operadores: (res.operadores || []).map((o: any) => ({
          operador: String(o.nombre || o.operador || ''),
          nombre: String(o.nombre || o.operador || ''),
          fila: typeof o.fila === 'number' ? o.fila : undefined,
        })),
        maquinaria: (res.maquinaria || []).map((m: any) => ({
          maquinaria: String(m.maquinaria || ''),
          implemento: String(m.implemento || ''),
          precio: Number(m.precio) || 0,
          unidad: (m.unidad as any) || 'Hora',
          fila: typeof m.fila === 'number' ? m.fila : undefined,
        })),
        siguienteNumero: res.siguienteNumero || 'SERV-000001',
        ultimoNumero: res.ultimoNumero || 'SERV-000000',
      };
    }

    // HTTP GET a los endpoints del Web App real
    const [clientesRaw, operadoresRaw, maquinariaRaw, configRaw] = await Promise.all([
      callGasGet<any[]>('clientes'),
      callGasGet<any[]>('operadores'),
      callGasGet<any[]>('maquinaria'),
      callGasGet<any>('configuracion'),
    ]);

    const clientes: Cliente[] = (Array.isArray(clientesRaw) ? clientesRaw : []).map((c: any) => ({
      cuenta: String(c.cuenta || ''),
      nombre: String(c.nombre || ''),
      fila: typeof c.fila === 'number' ? c.fila : undefined,
    }));

    const operadores: Operador[] = (Array.isArray(operadoresRaw) ? operadoresRaw : []).map((o: any) => ({
      operador: String(o.nombre || o.operador || ''),
      nombre: String(o.nombre || o.operador || ''),
      fila: typeof o.fila === 'number' ? o.fila : undefined,
    }));

    const maquinaria: MaquinariaConfig[] = (Array.isArray(maquinariaRaw) ? maquinariaRaw : []).map((m: any) => ({
      maquinaria: String(m.maquinaria || ''),
      implemento: String(m.implemento || ''),
      precio: Number(m.precio) || 0,
      unidad: (m.unidad as any) || 'Hora',
      fila: typeof m.fila === 'number' ? m.fila : undefined,
    }));

    // REGLA ESTRICTA: El correlativo SERV- solo se basa en registros SERV- (los REC- históricos no intervienen)
    let ultimoServId = 0;
    if (configRaw?.ultimoServicio) {
      const strVal = String(configRaw.ultimoServicio).trim().toUpperCase();
      const match = strVal.match(/^SERV-(\d+)/);
      if (match) {
        ultimoServId = parseInt(match[1], 10);
      } else if (typeof configRaw.ultimoServicio === 'number' && configRaw.ultimoServicio < 500) {
        // En caso de que el backend entregue el número entero directamente
        ultimoServId = configRaw.ultimoServicio;
      }
    }

    const sigId = ultimoServId + 1;
    const ultimoNumero = 'SERV-' + ('000000' + ultimoServId).slice(-6);
    const siguienteNumero = 'SERV-' + ('000000' + sigId).slice(-6);

    return {
      clientes,
      operadores,
      maquinaria,
      siguienteNumero,
      ultimoNumero,
    };
  },

  /**
   * Obtiene los servicios desde Google Sheets
   */
  async obtenerServicios(filtros: FiltrosServicio = {}): Promise<Servicio[]> {
    if (isGasMode()) {
      const params = {
        buscar: filtros.busqueda || '',
        maquinaria: filtros.maquinaria === 'TODAS' ? '' : (filtros.maquinaria || ''),
        desde: filtros.desde || '',
        hasta: filtros.hasta || '',
      };
      const res = await callGasNative<any[]>('obtenerServicios', params);
      return ordenarServiciosDesc(normalizarServicios(res));
    }

    const params: Record<string, string> = {};
    if (filtros.busqueda) params.buscar = filtros.busqueda;
    if (filtros.maquinaria && filtros.maquinaria !== 'TODAS') params.maquinaria = filtros.maquinaria;
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;

    const data = await callGasGet<any[]>('servicios', params);
    return ordenarServiciosDesc(normalizarServicios(data));
  },

  /**
   * Obtiene servicios con paginación real desde Google Sheets (100 por página)
   * Devuelve { ok, datos: [...100], total, pagina, limite, totalPaginas }
   */
  async obtenerServiciosPaginados(filtros: FiltrosPaginacion = {}): Promise<RespuestaPaginada<Servicio>> {
    const requestedPage = Math.max(1, Number(filtros.page || filtros.pagina) || 1);
    const requestedLimit = Math.max(1, Math.min(500, Number(filtros.limit || filtros.limite) || 100));

    const params: Record<string, string> = {
      page: String(requestedPage),
      limit: String(requestedLimit),
      pagina: String(requestedPage),
      limite: String(requestedLimit),
    };
    if (filtros.busqueda) {
      params.buscar = filtros.busqueda;
      params.busqueda = filtros.busqueda;
    }
    if (filtros.maquinaria && filtros.maquinaria !== 'TODAS') {
      params.maquinaria = filtros.maquinaria;
    }
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;

    let res: any;
    if (isGasMode()) {
      res = await callGasNative<any>('obtenerServicios', params);
    } else {
      res = await callGasGetFull<any>('servicios', params);
    }

    // 1. Si el backend en Google Apps Script ya devuelve la respuesta paginada con metadatos
    if (res && res.total !== undefined && res.totalPaginas !== undefined && Array.isArray(res.datos)) {
      const normalizados = normalizarServicios(res.datos);
      const ordenados = ordenarServiciosDesc(normalizados);
      return {
        ok: true,
        datos: ordenados,
        total: Number(res.total) || 0,
        pagina: Number(res.pagina) || requestedPage,
        limite: Number(res.limite) || requestedLimit,
        totalPaginas: Number(res.totalPaginas) || Math.max(1, Math.ceil((Number(res.total) || 1) / requestedLimit))
      };
    }

    // 2. Resiliencia: si el Web App aún devuelve el array antes de actualizar la implementación en Apps Script
    const rawList = Array.isArray(res) ? res : (res?.datos || []);
    const listaNormalizada = normalizarServicios(rawList);
    const ordenados = ordenarServiciosDesc(listaNormalizada);
    const total = ordenados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / requestedLimit));
    const offset = (requestedPage - 1) * requestedLimit;
    const datosPaginados = ordenados.slice(offset, offset + requestedLimit);

    return {
      ok: true,
      datos: datosPaginados,
      total: total,
      pagina: requestedPage,
      limite: requestedLimit,
      totalPaginas: totalPaginas
    };
  },

  /**
   * Guarda un nuevo servicio en Google Sheets
   */
  async guardarServicio(datos: any, forzarGuardar: boolean = false): Promise<{
    exito: boolean;
    ok?: boolean;
    mensaje: string;
    nroServicio?: string;
    numero?: string;
    fila?: number;
    duplicado?: boolean;
  }> {
    const datosLimpios = {
      fecha: datos.fecha,
      cuenta: String(datos.cuenta || ''),
      cliente: datos.cliente,
      maquinaria: datos.maquinaria,
      implemento: datos.implemento || '',
      operador: datos.operador,
      tipo: datos.tipo || '',
      inicio: String(datos.inicio ?? ''),
      fin: String(datos.fin ?? ''),
      cantidad: Number(datos.cantidad) || 0,
      unidad: datos.unidad || 'Hora',
      horas: Number(datos.horas) || 0,
      precio: Number(datos.precio) || 0,
      total: Number(datos.total) || 0,
      forzarGuardar: !!forzarGuardar,
    };

    if (isGasMode()) {
      const res = await callGasNative<any>('guardarServicio', datosLimpios);
      return {
        exito: !!(res?.exito || res?.ok),
        ok: !!(res?.exito || res?.ok),
        duplicado: !!res?.duplicado,
        mensaje: res?.mensaje || 'Servicio guardado correctamente en Google Sheets.',
        nroServicio: res?.nroServicio || res?.numero,
        numero: res?.nroServicio || res?.numero,
        fila: res?.fila,
      };
    }

    const res = await callGasPost<any>('guardarServicio', datosLimpios);
    const nro = res?.numero || res?.nroServicio || res?.servicio?.numero;
    const fila = res?.fila || res?.servicio?.fila;

    return {
      exito: true,
      ok: true,
      duplicado: !!res?.duplicado,
      mensaje: res?.mensaje || 'Servicio guardado correctamente en Google Sheets.',
      nroServicio: nro,
      numero: nro,
      fila: fila,
    };
  },

  /**
   * Edita un servicio existente en Google Sheets
   */
  async editarServicio(datos: any): Promise<{
    exito: boolean;
    ok?: boolean;
    mensaje: string;
    numero?: string;
    nroServicio?: string;
    fila?: number;
  }> {
    const filaNum = typeof datos.fila === 'number' 
      ? datos.fila 
      : (typeof datos.filaIndex === 'number' 
        ? datos.filaIndex 
        : (parseInt(datos.fila || datos.filaIndex, 10) || undefined));
    const nro = datos.numero || datos.nroServicio;

    let iniStr = String(datos.inicio ?? '').trim();
    let finStr = String(datos.fin ?? '').trim();
    if (iniStr.includes('GMT') || iniStr.includes('hora de')) iniStr = '';
    if (finStr.includes('GMT') || finStr.includes('hora de')) finStr = '';

    const datosLimpios = {
      fila: filaNum,
      numero: nro,
      nroServicio: nro,
      fecha: datos.fecha,
      cuenta: String(datos.cuenta || ''),
      cliente: datos.cliente,
      maquinaria: datos.maquinaria,
      implemento: datos.implemento || '',
      operador: datos.operador,
      tipo: datos.tipo || '',
      inicio: iniStr,
      fin: finStr,
      cantidad: Number(datos.cantidad) || 0,
      unidad: datos.unidad || 'Hora',
      horas: Number(datos.horas) || 0,
      precio: Number(datos.precio) || 0,
      total: Number(datos.total) || 0,
    };

    if (isGasMode()) {
      const res = await callGasNative<any>('editarServicio', datosLimpios);
      return {
        exito: !!(res?.exito || res?.ok),
        ok: !!(res?.exito || res?.ok),
        mensaje: res?.mensaje || 'Servicio actualizado correctamente.',
        numero: res?.numero || nro,
        nroServicio: res?.nroServicio || res?.numero || nro,
        fila: res?.fila || filaNum,
      };
    }

    const extraProps: any = {};
    if (typeof filaNum === 'number') {
      extraProps.fila = filaNum;
    }
    if (nro) {
      extraProps.numero = nro;
      extraProps.nroServicio = nro;
    }

    const res = await callGasPost<any>('editarServicio', datosLimpios, extraProps);
    const num = res?.numero || res?.nroServicio || nro;
    return {
      exito: !!(res?.exito || res?.ok),
      ok: !!(res?.exito || res?.ok),
      mensaje: res?.mensaje || 'Servicio actualizado correctamente.',
      numero: num,
      nroServicio: num,
      fila: res?.fila || filaNum,
    };
  },

  /**
   * Elimina un servicio en Google Sheets
   */
  async eliminarServicio(nroServicio: string, fila?: number): Promise<{
    exito: boolean;
    ok?: boolean;
    mensaje: string;
  }> {
    if (isGasMode()) {
      const res = await callGasNative<any>('eliminarServicio', fila || nroServicio);
      return {
        exito: !!(res?.exito || res?.ok),
        ok: !!(res?.exito || res?.ok),
        mensaje: res?.mensaje || 'Servicio eliminado correctamente de Google Sheets.',
      };
    }

    let targetFila = fila;
    if (typeof targetFila !== 'number') {
      try {
        const servs = await callGasGet<any[]>('servicios');
        const found = servs.find((s: any) => s.numero === nroServicio || s.nroServicio === nroServicio);
        if (found && typeof found.fila === 'number') {
          targetFila = found.fila;
        }
      } catch {
        // Continuar
      }
    }

    const extraProps: any = {
      numero: nroServicio,
      nroServicio: nroServicio,
    };
    if (typeof targetFila === 'number') {
      extraProps.fila = targetFila;
    }

    const res = await callGasPost<any>('eliminarServicio', {
      fila: targetFila,
      numero: nroServicio,
      nroServicio: nroServicio,
    }, extraProps);

    return {
      exito: true,
      ok: true,
      mensaje: res?.mensaje || 'Servicio eliminado correctamente de Google Sheets.',
    };
  },

  /**
   * Obtiene estadísticas del Dashboard desde Google Sheets
   */
  async obtenerDashboard(): Promise<DashboardStats> {
    if (isGasMode()) {
      const [res, servsRes] = await Promise.all([
        callGasNative<any>('obtenerDashboard'),
        callGasNative<any[]>('obtenerServicios')
      ]);
      const servs = ordenarServiciosDesc(normalizarServicios(servsRes));
      return {
        totalServicios: Number(res.totalServicios) || servs.length || 0,
        serviciosHoy: Number(res.serviciosHoy) || 0,
        serviciosMes: Number(res.serviciosMes) || 0,
        horasMes: Number(res.horasMes) || 0,
        totalMes: Number(res.totalMes) || 0,
        ultimoServicio: servs[0] || res.ultimoServicio || null,
        ultimosServicios: servs.slice(0, 5),
      };
    }

    const [data, servsRaw] = await Promise.all([
      callGasGet<any>('dashboard'),
      callGasGet<any[]>('servicios')
    ]);
    const servs = ordenarServiciosDesc(normalizarServicios(servsRaw));

    return {
      totalServicios: Number(data.totalServicios) || servs.length || 0,
      serviciosHoy: Number(data.serviciosHoy) || 0,
      serviciosMes: Number(data.serviciosMes) || 0,
      horasMes: Number(data.horasMes) || 0,
      totalMes: Number(data.totalMes) || 0,
      ultimoServicio: servs[0] || data.ultimoServicio || null,
      ultimosServicios: servs.slice(0, 5),
    };
  },

  /**
   * Genera reporte agrupado según el tipo y período
   */
  async generarReporte(filtros: {
    tipo: TipoReporte;
    anio?: string;
    mes?: string;
    desde?: string;
    hasta?: string;
  }): Promise<{
    items: ReporteItem[];
    totalGeneral: number;
    totalHoras: number;
    totalCantidad: number;
    totalServicios: number;
  }> {
    if (isGasMode()) {
      return callGasNative('generarReporte', filtros);
    }

    const servs = await this.obtenerServicios({
      desde: filtros.desde,
      hasta: filtros.hasta,
    });

    return procesarReporteEnCliente(servs, filtros);
  },

  /**
   * Busca clientes en Google Sheets
   */
  async buscarClientes(criterio: string): Promise<Cliente[]> {
    if (isGasMode()) {
      const res = await callGasNative<any[]>('buscarClientes', criterio);
      return (Array.isArray(res) ? res : []).map((c: any) => ({
        cuenta: String(c.cuenta || ''),
        nombre: String(c.nombre || ''),
        fila: typeof c.fila === 'number' ? c.fila : undefined,
      }));
    }

    const data = await callGasGet<any[]>('buscarClientes', { texto: criterio });
    return (Array.isArray(data) ? data : []).map((c: any) => ({
      cuenta: String(c.cuenta || ''),
      nombre: String(c.nombre || ''),
      fila: typeof c.fila === 'number' ? c.fila : undefined,
    }));
  },

  /**
   * Sincroniza correlativo del último servicio con Google Sheets
   */
  async sincronizarNumeroServicios(): Promise<{
    ultimo: string;
    maxId: number;
    total: number;
  }> {
    if (isGasMode()) {
      return callGasNative('sincronizarNumeroServicios');
    }

    const config = await callGasGet<any>('configuracion');
    const ultimoId = typeof config.ultimoServicio === 'number'
      ? config.ultimoServicio
      : (parseInt(String(config.ultimoServicio || '0').replace(/\D/g, ''), 10) || 0);

    const total = Array.isArray(config.hojas)
      ? (config.hojas.find((h: any) => h.nombre === 'servicios')?.filas || ultimoId)
      : ultimoId;

    return {
      ultimo: 'SERV-' + ('000000' + ultimoId).slice(-6),
      maxId: ultimoId,
      total: total,
    };
  },

  /**
   * Guarda un nuevo cliente en Google Sheets
   */
  async guardarCliente(cliente: Cliente): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('guardarCliente', cliente);
    }

    const payload = {
      cuenta: String(cliente.cuenta || '').trim(),
      nombre: String(cliente.nombre || '').trim(),
    };

    const res = await callGasPost<any>('guardarCliente', payload, payload);
    return {
      exito: true,
      mensaje: res?.mensaje || 'Cliente guardado correctamente en Google Sheets.',
    };
  },

  /**
   * Elimina un cliente de Google Sheets
   */
  async eliminarCliente(cuenta: string, fila?: number): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('eliminarCliente', cuenta);
    }

    let targetFila = fila;
    if (typeof targetFila !== 'number') {
      try {
        const cls = await callGasGet<any[]>('clientes');
        const found = cls.find((c: any) => String(c.cuenta).trim() === String(cuenta).trim());
        if (found && typeof found.fila === 'number') targetFila = found.fila;
      } catch {}
    }

    const extraProps: any = { cuenta: String(cuenta) };
    if (typeof targetFila === 'number') extraProps.fila = targetFila;

    const res = await callGasPost<any>('eliminarCliente', {
      cuenta: String(cuenta),
      fila: targetFila,
    }, extraProps);

    return {
      exito: true,
      mensaje: res?.mensaje || 'Cliente eliminado correctamente de Google Sheets.',
    };
  },

  /**
   * Guarda un operador en Google Sheets
   */
  async guardarOperador(operador: string): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('guardarOperador', operador);
    }

    const nombre = String(operador || '').trim();
    const payload = { nombre, operador: nombre };

    const res = await callGasPost<any>('guardarOperador', payload, payload);
    return {
      exito: true,
      mensaje: res?.mensaje || 'Operador guardado correctamente en Google Sheets.',
    };
  },

  /**
   * Elimina un operador de Google Sheets
   */
  async eliminarOperador(operador: string, fila?: number): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('eliminarOperador', operador);
    }

    let targetFila = fila;
    if (typeof targetFila !== 'number') {
      try {
        const ops = await callGasGet<any[]>('operadores');
        const found = ops.find((o: any) => (o.nombre || o.operador) === operador);
        if (found && typeof found.fila === 'number') targetFila = found.fila;
      } catch {}
    }

    const extraProps: any = { nombre: operador, operador: operador };
    if (typeof targetFila === 'number') extraProps.fila = targetFila;

    const res = await callGasPost<any>('eliminarOperador', {
      nombre: operador,
      operador: operador,
      fila: targetFila,
    }, extraProps);

    return {
      exito: true,
      mensaje: res?.mensaje || 'Operador eliminado correctamente de Google Sheets.',
    };
  },

  /**
   * Guarda configuración de maquinaria en Google Sheets
   */
  async guardarMaquinaria(item: MaquinariaConfig): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('guardarMaquinaria', item);
    }

    const datos = {
      maquinaria: item.maquinaria,
      implemento: item.implemento || '',
      precio: Number(item.precio) || 0,
      unidad: item.unidad || 'Hora',
    };

    const res = await callGasPost<any>('guardarMaquinaria', datos, datos);
    return {
      exito: true,
      mensaje: res?.mensaje || 'Maquinaria guardada correctamente en Google Sheets.',
    };
  },

  /**
   * Elimina configuración de maquinaria de Google Sheets
   */
  async eliminarMaquinaria(maquinaria: string, implemento: string, fila?: number): Promise<{ exito: boolean; mensaje: string }> {
    if (isGasMode()) {
      return callGasNative('eliminarMaquinaria', maquinaria, implemento);
    }

    let targetFila = fila;
    if (typeof targetFila !== 'number') {
      try {
        const maqs = await callGasGet<any[]>('maquinaria');
        const found = maqs.find((m: any) => m.maquinaria === maquinaria && (m.implemento || '') === (implemento || ''));
        if (found && typeof found.fila === 'number') targetFila = found.fila;
      } catch {}
    }

    const extraProps: any = { maquinaria, implemento };
    if (typeof targetFila === 'number') extraProps.fila = targetFila;

    const res = await callGasPost<any>('eliminarMaquinaria', {
      maquinaria,
      implemento,
      fila: targetFila,
    }, extraProps);

    return {
      exito: true,
      mensaje: res?.mensaje || 'Maquinaria eliminada correctamente de Google Sheets.',
    };
  },

  /**
   * Obtiene información general de la base de datos de Google Sheets
   */
  async obtenerConfiguracion(): Promise<{
    moneda: string;
    ultimoServicio: string;
    hojas: { nombre: string; filas: number }[];
    clientesCount: number;
    operadoresCount: number;
    maquinariaCount: number;
    serviciosCount: number;
  }> {
    if (isGasMode()) {
      return callGasNative('obtenerConfiguracion');
    }

    const config = await callGasGet<any>('configuracion');
    const ultimoId = typeof config.ultimoServicio === 'number'
      ? config.ultimoServicio
      : (parseInt(String(config.ultimoServicio || '0').replace(/\D/g, ''), 10) || 0);

    const hojas = Array.isArray(config.hojas) ? config.hojas : [];
    const getFilas = (nom: string) => hojas.find((h: any) => h.nombre === nom)?.filas || 0;

    return {
      moneda: config.moneda || '$us.',
      ultimoServicio: 'SERV-' + ('000000' + ultimoId).slice(-6),
      hojas: hojas,
      clientesCount: getFilas('clientes'),
      operadoresCount: getFilas('operadores'),
      maquinariaCount: getFilas('maquinaria'),
      serviciosCount: getFilas('servicios'),
    };
  },
};
