/**
 * =========================================================================
 * CONTROL DE MAQUINARIA - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * =========================================================================
 * 
 * Base de datos oficial en Google Sheets.
 * Hojas utilizadas:
 * - 'clientes' (Cuenta, Nombre)
 * - 'operadores' (Operador)
 * - 'maquinaria' (Maquinaria, Implemento/Servicio, Precio, Unidad)
 * - 'servicios' (15 columnas fijas)
 */

const HOJAS = {
  CLIENTES: 'clientes',
  OPERADORES: 'operadores',
  MAQUINARIA: 'maquinaria',
  SERVICIOS: 'servicios'
};

/**
 * Sirve la aplicación HTML y atiende solicitudes API GET
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.action || e.parameter.accion)) {
    return procesarApi(e.parameter);
  }

  const htmlOutput = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Control de Maquinaria')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
  return htmlOutput;
}

/**
 * Atiende solicitudes API POST
 */
function doPost(e) {
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }
    const accion = postData.action || postData.accion || (e && e.parameter ? (e.parameter.action || e.parameter.accion) : '');
    const resultado = despacharAccion(accion, postData);
    
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ exito: false, ok: false, mensaje: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function procesarApi(params) {
  const accion = params.action || params.accion;
  let payload = params;
  if (params.data) {
    try {
      payload = Object.assign({}, params, JSON.parse(params.data));
    } catch (e) {}
  }
  const resultado = despacharAccion(accion, payload);
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function despacharAccion(accion, payload) {
  const acc = String(accion || '').trim();
  switch (acc) {
    case 'servicios':
    case 'obtenerServicios':
      return obtenerServicios(payload.filtros || payload || {});
    case 'clientes':
    case 'obtenerClientes':
      return obtenerClientes();
    case 'operadores':
    case 'obtenerOperadores':
      return obtenerOperadores();
    case 'maquinaria':
    case 'obtenerMaquinaria':
      return obtenerMaquinaria();
    case 'dashboard':
    case 'obtenerDashboard':
      return obtenerDashboard();
    case 'reportes':
    case 'generarReporte':
      return generarReporte(payload.filtros || payload);
    case 'datosIniciales':
    case 'obtenerDatosIniciales':
      return obtenerDatosIniciales();
    case 'guardarServicio':
      return guardarServicio(payload.datos || payload.servicio || payload);
    case 'editarServicio':
      return editarServicio(payload.datos || payload.servicio || payload);
    case 'eliminarServicio':
      return eliminarServicio(payload.nroServicio || payload.numero || payload.fila || payload.id);
    case 'buscarClientes':
      return buscarClientes(payload.criterio || payload.texto || payload.q || '');
    case 'sincronizarNumeroServicios':
      return sincronizarNumeroServicios();
    case 'guardarCliente':
      return guardarCliente(payload.cliente || payload);
    case 'eliminarCliente':
      return eliminarCliente(payload.cuenta);
    case 'guardarOperador':
      return guardarOperador(payload.nombre || payload.operador, payload.oldNombre);
    case 'eliminarOperador':
      return eliminarOperador(payload.nombre || payload.operador);
    case 'guardarMaquinaria':
      return guardarMaquinaria(payload.item || payload, payload.oldMaq, payload.oldImp);
    case 'eliminarMaquinaria':
      return eliminarMaquinaria(payload.maquinaria, payload.implemento);
    case 'crearCopiaSeguridad':
      return crearCopiaSeguridad();
    case 'configurarBackupDiario':
      return configurarBackupDiario();
    case 'obtenerConfiguracion':
      return obtenerConfiguracion();
    default:
      return { exito: false, ok: false, mensaje: 'Acción no reconocida: ' + acc };
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function obtenerHoja(nombreExacto) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(nombreExacto);
  if (!sheet) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase() === nombreExacto.toLowerCase()) {
        return sheets[i];
      }
    }
  }
  return sheet;
}

/**
 * Inicializa el sistema sin alterar ningún dato existente
 */
function inicializarSistema() {
  const ss = getSpreadsheet();

  let hClientes = obtenerHoja(HOJAS.CLIENTES);
  if (!hClientes) {
    hClientes = ss.insertSheet(HOJAS.CLIENTES);
    hClientes.appendRow(['Cuenta', 'Nombre']);
  } else if (hClientes.getLastRow() === 0) {
    hClientes.appendRow(['Cuenta', 'Nombre']);
  }

  let hOperadores = obtenerHoja(HOJAS.OPERADORES);
  if (!hOperadores) {
    hOperadores = ss.insertSheet(HOJAS.OPERADORES);
    hOperadores.appendRow(['Operador']);
  } else if (hOperadores.getLastRow() === 0) {
    hOperadores.appendRow(['Operador']);
  }

  let hMaquinaria = obtenerHoja(HOJAS.MAQUINARIA);
  if (!hMaquinaria) {
    hMaquinaria = ss.insertSheet(HOJAS.MAQUINARIA);
    hMaquinaria.appendRow(['Maquinaria', 'Implemento/Servicio', 'Precio', 'Unidad']);
  } else if (hMaquinaria.getLastRow() === 0) {
    hMaquinaria.appendRow(['Maquinaria', 'Implemento/Servicio', 'Precio', 'Unidad']);
  }

  let hServicios = obtenerHoja(HOJAS.SERVICIOS);
  if (!hServicios) {
    hServicios = ss.insertSheet(HOJAS.SERVICIOS);
    hServicios.appendRow([
      'Nro. Servicio', 'Fecha', 'Cuenta', 'Cliente', 'Maquinaria',
      'Implemento', 'Operador', 'Tipo', 'Inicio', 'Fin',
      'Cantidad', 'Unidad', 'Horas', 'Precio', 'Total'
    ]);
  } else if (hServicios.getLastRow() === 0) {
    hServicios.appendRow([
      'Nro. Servicio', 'Fecha', 'Cuenta', 'Cliente', 'Maquinaria',
      'Implemento', 'Operador', 'Tipo', 'Inicio', 'Fin',
      'Cantidad', 'Unidad', 'Horas', 'Precio', 'Total'
    ]);
  }

  return { exito: true, mensaje: 'Sistema inicializado. Hojas conservadas.' };
}

/**
 * Obtiene todos los catálogos y números iniciales
 */
function obtenerDatosIniciales() {
  return {
    clientes: obtenerClientes(),
    operadores: obtenerOperadores(),
    maquinaria: obtenerMaquinaria(),
    siguienteNumero: obtenerSiguienteNumeroServicio(),
    ultimoNumero: sincronizarNumeroServicios().ultimo
  };
}

/**
 * Lee todos los clientes reales de la hoja 'clientes'
 */
function obtenerClientes() {
  const hoja = obtenerHoja(HOJAS.CLIENTES);
  if (!hoja) return [];
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return [];

  const valores = hoja.getRange(2, 1, ultimaFila - 1, 2).getValues();
  const clientes = [];
  for (let i = 0; i < valores.length; i++) {
    const cuenta = String(valores[i][0] !== undefined && valores[i][0] !== null ? valores[i][0] : '').trim();
    const nombre = String(valores[i][1] || '').trim();
    if (cuenta || nombre) {
      clientes.push({ cuenta: cuenta, nombre: nombre });
    }
  }
  return clientes;
}

function buscarClientes(criterio) {
  const clientes = obtenerClientes();
  if (!criterio || !criterio.trim()) return clientes;
  const q = criterio.toLowerCase().trim();
  return clientes.filter(function(c) {
    return c.cuenta.toLowerCase().indexOf(q) !== -1 || c.nombre.toLowerCase().indexOf(q) !== -1;
  });
}

/**
 * Lee los operadores reales de la hoja 'operadores'
 */
function obtenerOperadores() {
  const hoja = obtenerHoja(HOJAS.OPERADORES);
  if (!hoja) return [];
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return [];

  const valores = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  const operadores = [];
  for (let i = 0; i < valores.length; i++) {
    const op = String(valores[i][0] || '').trim();
    if (op) {
      operadores.push({ operador: op });
    }
  }
  return operadores;
}

/**
 * Lee la maquinaria real de la hoja 'maquinaria'
 */
function obtenerMaquinaria() {
  const hoja = obtenerHoja(HOJAS.MAQUINARIA);
  if (!hoja) return [];
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return [];

  const valores = hoja.getRange(2, 1, ultimaFila - 1, 4).getValues();
  const list = [];
  for (let i = 0; i < valores.length; i++) {
    const maq = String(valores[i][0] || '').trim();
    if (maq) {
      const imp = String(valores[i][1] !== undefined && valores[i][1] !== null ? valores[i][1] : '').trim();
      let precio = valores[i][2];
      if (typeof precio === 'string') {
        precio = parseFloat(precio.replace(',', '.'));
      }
      const unidad = String(valores[i][3] || 'Hora').trim();
      list.push({
        maquinaria: maq,
        implemento: imp,
        precio: isNaN(precio) ? 0 : Number(precio),
        unidad: unidad
      });
    }
  }
  return list;
}

function obtenerImplementos(maquinariaNombre) {
  const all = obtenerMaquinaria();
  return all.filter(function(m) {
    return m.maquinaria === maquinariaNombre;
  });
}

function obtenerPrecioMaquinaria(maquinariaNombre, implementoNombre) {
  const all = obtenerMaquinaria();
  const impBuscado = (implementoNombre || '').trim().toLowerCase();
  
  for (let i = 0; i < all.length; i++) {
    if (all[i].maquinaria === maquinariaNombre) {
      const impActual = (all[i].implemento || '').trim().toLowerCase();
      if (impActual === impBuscado || (!impActual && !impBuscado)) {
        return { precio: all[i].precio, unidad: all[i].unidad };
      }
    }
  }

  for (let j = 0; j < all.length; j++) {
    if (all[j].maquinaria === maquinariaNombre) {
      return { precio: all[j].precio, unidad: all[j].unidad };
    }
  }

  return null;
}

/**
 * FUNCIÓN CENTRAL: obtenerServicios(filtros)
 * Lee directamente todas las filas de la hoja 'servicios', convierte
 * fechas a cadenas seguras 'YYYY-MM-DD' y devuelve ÚNICAMENTE los registros reales de Google Sheets.
 */
function obtenerServicios(filtros) {
  const hoja = obtenerHoja(HOJAS.SERVICIOS);
  if (!hoja) return [];
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return [];

  const cantidadColumnas = 15;
  const rango = hoja.getRange(2, 1, ultimaFila - 1, cantidadColumnas);
  const valores = rango.getValues();
  const zonaHoraria = Session.getScriptTimeZone();

  const servicios = [];

  for (let i = 0; i < valores.length; i++) {
    const fila = valores[i];
    const nroServicio = String(fila[0] || '').trim();
    if (!nroServicio) continue;

    // Normalización de fecha
    let fechaStr = '';
    const rawFecha = fila[1];
    if (rawFecha instanceof Date && !isNaN(rawFecha.getTime())) {
      fechaStr = Utilities.formatDate(rawFecha, zonaHoraria, 'yyyy-MM-dd');
    } else if (typeof rawFecha === 'string') {
      fechaStr = rawFecha.trim();
      const partes = fechaStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (partes) {
        fechaStr = partes[3] + '-' + partes[2] + '-' + partes[1];
      }
    } else if (rawFecha) {
      fechaStr = String(rawFecha);
    }

    const parseNum = function(val) {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const clean = parseFloat(val.replace(',', '.'));
        return isNaN(clean) ? 0 : clean;
      }
      return 0;
    };

    // Normalización de inicio y fin (NUNCA convertir a Date ni GMT)
    let strInicio = '';
    let strFin = '';
    if (fila[8] instanceof Date) {
      strInicio = '';
    } else if (fila[8] !== undefined && fila[8] !== null) {
      strInicio = String(fila[8]).trim();
      if (strInicio.indexOf('GMT') !== -1 || strInicio.indexOf('hora de') !== -1) {
        strInicio = '';
      }
    }
    if (fila[9] instanceof Date) {
      strFin = '';
    } else if (fila[9] !== undefined && fila[9] !== null) {
      strFin = String(fila[9]).trim();
      if (strFin.indexOf('GMT') !== -1 || strFin.indexOf('hora de') !== -1) {
        strFin = '';
      }
    }

    const servicio = {
      id: nroServicio,
      numero: nroServicio,
      nroServicio: nroServicio,
      fecha: fechaStr,
      cuenta: String(fila[2] !== undefined && fila[2] !== null ? fila[2] : '').trim(),
      cliente: String(fila[3] || '').trim(),
      maquinaria: String(fila[4] || '').trim(),
      implemento: String(fila[5] || '').trim(),
      operador: String(fila[6] || '').trim(),
      tipo: String(fila[7] || '').trim(),
      inicio: strInicio,
      fin: strFin,
      cantidad: parseNum(fila[10]),
      unidad: String(fila[11] || 'Hora').trim(),
      horas: parseNum(fila[12]),
      precio: parseNum(fila[13]),
      total: parseNum(fila[14]),
      fila: i + 2,
      filaIndex: i + 2
    };

    servicios.push(servicio);
  }

  filtros = filtros || {};
  let filtrados = servicios;

  const textoBusqueda = String(filtros.busqueda || filtros.buscar || filtros.q || '').toLowerCase().trim();
  if (textoBusqueda !== '') {
    filtrados = filtrados.filter(function(s) {
      return (
        s.nroServicio.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.cuenta.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.cliente.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.maquinaria.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.implemento.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.operador.toLowerCase().indexOf(textoBusqueda) !== -1 ||
        s.tipo.toLowerCase().indexOf(textoBusqueda) !== -1
      );
    });
  }

  if (filtros.desde && String(filtros.desde).trim() !== '') {
    const dStr = String(filtros.desde).trim();
    filtrados = filtrados.filter(function(s) {
      return s.fecha >= dStr;
    });
  }

  if (filtros.hasta && String(filtros.hasta).trim() !== '') {
    const hStr = String(filtros.hasta).trim();
    filtrados = filtrados.filter(function(s) {
      return s.fecha <= hStr;
    });
  }

  if (filtros.maquinaria && String(filtros.maquinaria).trim() !== '' && filtros.maquinaria !== 'TODAS') {
    filtrados = filtrados.filter(function(s) {
      return s.maquinaria === filtros.maquinaria;
    });
  }

  // Ordenamiento oficial:
  // 1. Primero todos los registros nuevos que comienzan con SERV-
  // 2. Dentro de SERV-, del número más alto al más bajo (SERV-000009 > SERV-000008 > ... > SERV-000001)
  // 3. Después todos los registros históricos que comienzan con REC-
  // 4. Dentro de REC-, del número más alto al más bajo (REC-000940 > REC-000939 > ... > REC-000001)
  // 5. Otros formatos al final, del número más alto al más bajo
  filtrados.sort(function(a, b) {
    const nroA = String(a.nroServicio || a.numero || '').trim().toUpperCase();
    const nroB = String(b.nroServicio || b.numero || '').trim().toUpperCase();

    const esServA = nroA.indexOf('SERV-') === 0;
    const esServB = nroB.indexOf('SERV-') === 0;
    const esRecA = nroA.indexOf('REC-') === 0;
    const esRecB = nroB.indexOf('REC-') === 0;

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

    const fechaA = String(a.fecha || '');
    const fechaB = String(b.fecha || '');
    if (fechaA !== fechaB) {
      return fechaA < fechaB ? 1 : -1;
    }

    return (b.filaIndex || 0) - (a.filaIndex || 0);
  });

  const tienePaginacion = (filtros.page !== undefined && filtros.page !== null && filtros.page !== '') ||
                          (filtros.pagina !== undefined && filtros.pagina !== null && filtros.pagina !== '') ||
                          (filtros.limit !== undefined && filtros.limit !== null && filtros.limit !== '') ||
                          (filtros.limite !== undefined && filtros.limite !== null && filtros.limite !== '');

  if (tienePaginacion) {
    const total = filtrados.length;
    const page = Math.max(1, parseInt(filtros.page || filtros.pagina, 10) || 1);
    const limit = Math.max(1, parseInt(filtros.limit || filtros.limite, 10) || 100);
    const totalPaginas = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const datosPaginados = filtrados.slice(offset, offset + limit);

    return {
      ok: true,
      exito: true,
      datos: datosPaginados,
      total: total,
      pagina: page,
      limite: limit,
      totalPaginas: totalPaginas
    };
  }

  return filtrados;
}

/**
 * Cálculo matemático de horas y totales
 */
function calcularServicio(datos) {
  let horas = 0;
  let cantidad = Number(datos.cantidad) || 0;
  const precio = Number(datos.precio) || 0;

  if (datos.unidad === 'Hora') {
    if (datos.tipo === 'Horómetro') {
      const ini = parseFloat(String(datos.inicio).replace(',', '.'));
      const fn = parseFloat(String(datos.fin).replace(',', '.'));
      if (!isNaN(ini) && !isNaN(fn)) {
        horas = Math.max(0, fn - ini);
      }
    } else if (datos.tipo === 'Horario') {
      const parseTime = function(tStr) {
        if (!tStr) return null;
        const p = String(tStr).trim().split(':');
        if (p.length < 2) return null;
        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
      };
      const t1 = parseTime(datos.inicio);
      const t2 = parseTime(datos.fin);
      if (t1 !== null && t2 !== null) {
        let diff = t2 - t1;
        if (diff < 0) diff += 24 * 60; // Cruce de medianoche
        horas = diff / 60;
      }
    }
    horas = Math.round(horas * 100) / 100;
    cantidad = horas;
  }

  const total = Math.round(cantidad * precio * 100) / 100;
  return { horas: horas, cantidad: cantidad, total: total };
}

/**
 * Comprueba duplicados según Fecha, Cuenta, Cliente, Maquinaria, Implemento, Operador, Tipo, Inicio, Fin
 */
function comprobarDuplicado(datos, excluirNro) {
  const servicios = obtenerServicios({});
  for (let i = 0; i < servicios.length; i++) {
    const s = servicios[i];
    const nroActual = datos.numero || datos.nroServicio;
    if (excluirNro && s.nroServicio === excluirNro) continue;
    if (nroActual && s.nroServicio === nroActual) continue;

    if (
      s.fecha === datos.fecha &&
      String(s.cuenta) === String(datos.cuenta) &&
      s.maquinaria === datos.maquinaria &&
      String(s.implemento || '') === String(datos.implemento || '') &&
      s.operador === datos.operador &&
      String(s.tipo || '') === String(datos.tipo || '') &&
      String(s.inicio || '') === String(datos.inicio || '') &&
      String(s.fin || '') === String(datos.fin || '')
    ) {
      return s.nroServicio;
    }
  }
  return null;
}

/**
 * Obtiene el siguiente correlativo SERV-XXXXXX a partir de Google Sheets
 */
function obtenerSiguienteNumeroServicio() {
  const sincronizado = sincronizarNumeroServicios();
  const max = sincronizado.maxId;
  const siguiente = max + 1;
  const relleno = ('000000' + siguiente).slice(-6);
  return 'SERV-' + relleno;
}

function sincronizarNumeroServicios() {
  const hoja = obtenerHoja(HOJAS.SERVICIOS);
  if (!hoja) return { ultimo: 'SERV-000000', maxId: 0, total: 0 };
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return { ultimo: 'SERV-000000', maxId: 0, total: 0 };

  const valores = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  let maxId = 0;
  let total = 0;

  for (let i = 0; i < valores.length; i++) {
    const nro = String(valores[i][0] || '').trim();
    if (nro) {
      total++;
      // REGLA ESTRICTA: Solo considerar números que comienzan con SERV- (REC- no debe influir jamás)
      const match = nro.toUpperCase().match(/^SERV-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxId) maxId = val;
      }
    }
  }

  const ultimo = maxId > 0 ? 'SERV-' + ('000000' + maxId).slice(-6) : 'SERV-000000';
  return { ultimo: ultimo, maxId: maxId, total: total };
}

/**
 * FUNCIÓN PRIORIDAD MÁXIMA: guardarServicio(datos)
 * Escribe realmente en Google Sheets tras validar datos y duplicados.
 */
function guardarServicio(datos) {
  try {
    let hoja = obtenerHoja(HOJAS.SERVICIOS);
    if (!hoja) {
      inicializarSistema();
      hoja = obtenerHoja(HOJAS.SERVICIOS);
    }

    // 1. Validaciones
    if (!datos.fecha) {
      return { exito: false, mensaje: 'La fecha es obligatoria.' };
    }
    if (!datos.cuenta || !datos.cliente) {
      return { exito: false, mensaje: 'El cliente es obligatorio.' };
    }
    if (!datos.maquinaria) {
      return { exito: false, mensaje: 'La maquinaria es obligatoria.' };
    }
    if (!datos.operador) {
      return { exito: false, mensaje: 'El operador es obligatorio.' };
    }

    // Obtener precio y unidad oficiales si no vienen
    const tarifaOficial = obtenerPrecioMaquinaria(datos.maquinaria, datos.implemento);
    const unidad = datos.unidad || (tarifaOficial ? tarifaOficial.unidad : 'Hora');
    const precio = datos.precio !== undefined ? Number(datos.precio) : (tarifaOficial ? tarifaOficial.precio : 0);

    datos.unidad = unidad;
    datos.precio = precio;

    if (unidad === 'Hora') {
      if (!datos.tipo) {
        return { exito: false, mensaje: 'Para servicios por Hora, el tipo (Horómetro o Horario) es obligatorio.' };
      }
      if (datos.inicio === undefined || datos.inicio === '' || datos.fin === undefined || datos.fin === '') {
        return { exito: false, mensaje: 'Para servicios por Hora, debe indicar Inicio y Fin.' };
      }
    } else {
      // Para Unidad o Kilómetro, el tipo puede ir vacío
      if (Number(datos.cantidad) <= 0) {
        return { exito: false, mensaje: 'Para servicios por ' + unidad + ', la cantidad debe ser mayor a 0.' };
      }
    }

    // 2. Comprobación de duplicados
    const forzar = datos.forzarGuardar === true || datos.forzarGuardar === 'true';
    if (!forzar) {
      const duplicadoNro = comprobarDuplicado(datos);
      if (duplicadoNro) {
        return {
          exito: false,
          duplicado: true,
          nroServicio: duplicadoNro,
          mensaje: 'Ya existe el servicio ' + duplicadoNro + ' con estos mismos datos. ¿Desea guardar de todos modos?'
        };
      }
    }

    // 3. Cálculo
    const calculo = calcularServicio(datos);
    const nroServicio = datos.numero || datos.nroServicio || obtenerSiguienteNumeroServicio();

    // 4. Inserción de la nueva fila exactamente en las 15 columnas
    const fila = [
      nroServicio,
      datos.fecha,
      datos.cuenta,
      datos.cliente,
      datos.maquinaria,
      datos.implemento !== undefined && datos.implemento !== null ? datos.implemento : '',
      datos.operador,
      datos.tipo !== undefined && datos.tipo !== null ? datos.tipo : '',
      datos.inicio !== undefined && datos.inicio !== null ? datos.inicio : '',
      datos.fin !== undefined && datos.fin !== null ? datos.fin : '',
      calculo.cantidad,
      unidad,
      calculo.horas,
      precio,
      calculo.total
    ];

    hoja.appendRow(fila);
    SpreadsheetApp.flush();

    return {
      exito: true,
      ok: true,
      mensaje: 'Servicio guardado correctamente en Google Sheets.',
      nroServicio: nroServicio
    };
  } catch (err) {
    return {
      exito: false,
      ok: false,
      mensaje: 'Error del servidor al guardar: ' + err.message
    };
  }
}

/**
 * Edita un servicio existente sin alterar su número
 */
function editarServicio(datos) {
  try {
    if (!datos) {
      return { exito: false, ok: false, mensaje: 'No se indicó el servicio a editar.' };
    }

    const hoja = obtenerHoja(HOJAS.SERVICIOS);
    if (!hoja) return { exito: false, ok: false, mensaje: 'Hoja servicios no encontrada.' };

    const ultimaFila = hoja.getLastRow();
    if (ultimaFila <= 1) return { exito: false, ok: false, mensaje: 'No hay registros para editar.' };

    const filaIndicada = parseInt(datos.fila !== undefined ? datos.fila : datos.filaIndex, 10);
    let nroBuscar = String(datos.numero || datos.nroServicio || datos.id || '').trim();

    if (!filaIndicada && !nroBuscar) {
      return { exito: false, ok: false, mensaje: 'No se indicó el servicio a editar.' };
    }

    let filaDestino = -1;

    // 1. Si viene la fila real de Google Sheets, verificarla
    if (filaIndicada && filaIndicada >= 2 && filaIndicada <= ultimaFila) {
      const codigoEnFila = String(hoja.getRange(filaIndicada, 1).getValue()).trim();
      if (!nroBuscar || codigoEnFila.toUpperCase() === nroBuscar.toUpperCase()) {
        filaDestino = filaIndicada;
        if (!nroBuscar) nroBuscar = codigoEnFila;
      }
    }

    // 2. Si no coincidió la fila o no vino, buscar por número de servicio
    if (filaDestino === -1 && nroBuscar) {
      const codigos = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
      for (let i = 0; i < codigos.length; i++) {
        if (String(codigos[i][0]).trim().toUpperCase() === nroBuscar.toUpperCase()) {
          filaDestino = i + 2;
          nroBuscar = String(codigos[i][0]).trim();
          break;
        }
      }
    }

    if (filaDestino === -1) {
      return { exito: false, ok: false, mensaje: 'Servicio no encontrado en Google Sheets: ' + (nroBuscar || ('Fila ' + filaIndicada)) };
    }

    const tarifaOficial = obtenerPrecioMaquinaria(datos.maquinaria, datos.implemento);
    const unidad = datos.unidad || (tarifaOficial ? tarifaOficial.unidad : 'Hora');
    const precio = datos.precio !== undefined ? Number(datos.precio) : (tarifaOficial ? tarifaOficial.precio : 0);

    datos.unidad = unidad;
    datos.precio = precio;
    const calculo = calcularServicio(datos);

    // Limpieza de inicio y fin para evitar fechas y GMT
    let inicioVal = datos.inicio !== undefined && datos.inicio !== null ? String(datos.inicio).trim() : '';
    let finVal = datos.fin !== undefined && datos.fin !== null ? String(datos.fin).trim() : '';
    if (inicioVal.indexOf('GMT') !== -1 || inicioVal.indexOf('hora de') !== -1) inicioVal = '';
    if (finVal.indexOf('GMT') !== -1 || finVal.indexOf('hora de') !== -1) finVal = '';

    const filaActualizada = [
      nroBuscar,
      datos.fecha,
      datos.cuenta,
      datos.cliente,
      datos.maquinaria,
      datos.implemento || '',
      datos.operador,
      datos.tipo || '',
      inicioVal,
      finVal,
      calculo.cantidad,
      unidad,
      calculo.horas,
      precio,
      calculo.total
    ];

    hoja.getRange(filaDestino, 1, 1, 15).setValues([filaActualizada]);
    SpreadsheetApp.flush();

    return { 
      exito: true, 
      ok: true, 
      mensaje: 'Servicio actualizado correctamente.',
      numero: nroBuscar,
      nroServicio: nroBuscar,
      fila: filaDestino
    };
  } catch (err) {
    return { exito: false, ok: false, mensaje: 'Error al actualizar servicio: ' + err.message };
  }
}

/**
 * Elimina el registro correspondiente en Google Sheets
 */
function eliminarServicio(param) {
  try {
    const hoja = obtenerHoja(HOJAS.SERVICIOS);
    if (!hoja) return { exito: false, ok: false, mensaje: 'Hoja no encontrada.' };

    const ultimaFila = hoja.getLastRow();
    if (ultimaFila <= 1) return { exito: false, ok: false, mensaje: 'No hay registros.' };

    // Si viene como número de fila directo
    if (typeof param === 'number' && param >= 2 && param <= ultimaFila) {
      hoja.deleteRow(param);
      SpreadsheetApp.flush();
      return { exito: true, ok: true, mensaje: 'Servicio eliminado correctamente de Google Sheets.' };
    }

    const nroServicio = String(param).trim();
    const codigos = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();

    for (let i = 0; i < codigos.length; i++) {
      if (String(codigos[i][0]).trim() === nroServicio) {
        hoja.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { exito: true, ok: true, mensaje: 'Servicio ' + nroServicio + ' eliminado correctamente de Google Sheets.' };
      }
    }

    return { exito: false, ok: false, mensaje: 'No se encontró el servicio para eliminar.' };
  } catch (err) {
    return { exito: false, ok: false, mensaje: 'Error al eliminar: ' + err.message };
  }
}

function obtenerServicioPorFila(filaOId) {
  const servicios = obtenerServicios({});
  if (typeof filaOId === 'number') {
    for (let i = 0; i < servicios.length; i++) {
      if (servicios[i].filaIndex === filaOId) return servicios[i];
    }
  }
  const idStr = String(filaOId).trim();
  for (let j = 0; j < servicios.length; j++) {
    if (servicios[j].nroServicio === idStr) return servicios[j];
  }
  return null;
}

/**
 * Consulta del Dashboard basada en los registros reales
 */
function obtenerDashboard() {
  const servicios = obtenerServicios({});
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const mesActual = hoy.substring(0, 7);

  let serviciosHoy = 0;
  let serviciosMes = 0;
  let horasMes = 0;
  let totalMes = 0;

  for (let i = 0; i < servicios.length; i++) {
    const s = servicios[i];
    if (s.fecha === hoy) {
      serviciosHoy++;
    }
    if (s.fecha && s.fecha.substring(0, 7) === mesActual) {
      serviciosMes++;
      horasMes += Number(s.horas) || 0;
      totalMes += Number(s.total) || 0;
    }
  }

  const sorted = servicios.slice().reverse();

  return {
    totalServicios: servicios.length,
    serviciosHoy: serviciosHoy,
    serviciosMes: serviciosMes,
    horasMes: Math.round(horasMes * 100) / 100,
    totalMes: Math.round(totalMes * 100) / 100,
    ultimoServicio: sorted.length > 0 ? sorted[0] : null,
    ultimosServicios: sorted.slice(0, 5)
  };
}

/**
 * Generación de reportes resumidos
 */
function generarReporte(filtros) {
  const tipo = (filtros && filtros.tipo) ? filtros.tipo : 'maquinaria';
  const anio = (filtros && filtros.anio) ? filtros.anio : '';
  const mes = (filtros && filtros.mes) ? filtros.mes : '';
  const desde = (filtros && filtros.desde) ? filtros.desde : '';
  const hasta = (filtros && filtros.hasta) ? filtros.hasta : '';

  let servicios = obtenerServicios({});

  if (desde && hasta) {
    servicios = servicios.filter(function(s) {
      return s.fecha >= desde && s.fecha <= hasta;
    });
  } else if (anio) {
    if (mes && mes !== 'TODOS') {
      const prefix = anio + '-' + ('0' + mes).slice(-2);
      servicios = servicios.filter(function(s) {
        return s.fecha.substring(0, 7) === prefix;
      });
    } else {
      servicios = servicios.filter(function(s) {
        return s.fecha.substring(0, 4) === String(anio);
      });
    }
  }

  // Filtro opcional por cliente específico si viene indicado
  const cuentaCliente = (filtros && filtros.cuenta) ? String(filtros.cuenta).trim() : '';
  const nombreCliente = (filtros && filtros.cliente) ? String(filtros.cliente).trim().toLowerCase() : '';
  if (cuentaCliente !== '' || nombreCliente !== '') {
    servicios = servicios.filter(function(s) {
      if (cuentaCliente !== '' && String(s.cuenta).trim() === cuentaCliente) return true;
      if (nombreCliente !== '' && String(s.cliente).trim().toLowerCase().indexOf(nombreCliente) !== -1) return true;
      return false;
    });
  }

  const acumulador = {};
  let totalGeneralDirecto = 0;

  for (let i = 0; i < servicios.length; i++) {
    const s = servicios[i];
    let key = '';
    let cat = '';
    let sub = '';

    const imp = (s.implemento && String(s.implemento).trim() !== '') ? String(s.implemento).trim() : '—';

    if (tipo === 'maquinaria') {
      cat = s.maquinaria || 'Sin asignar';
      sub = imp;
      key = cat + '__' + sub;
    } else if (tipo === 'maquinaria_cliente') {
      cat = s.maquinaria || 'Sin asignar';
      sub = (imp !== '—' ? imp + ' — ' : '') + 'Cuenta #' + s.cuenta + ' - ' + s.cliente;
      key = cat + '__' + sub;
    } else if (tipo === 'cliente' || tipo === 'cliente_especifico') {
      cat = 'Cuenta #' + s.cuenta + ' - ' + s.cliente;
      sub = imp !== '—' ? (s.maquinaria + ' / ' + imp) : s.maquinaria;
      key = cat + (tipo === 'cliente_especifico' ? '__' + sub : '');
    } else if (tipo === 'operador') {
      cat = s.operador || 'Sin operador';
      sub = s.maquinaria + (imp !== '—' ? ' (' + imp + ')' : '');
      key = cat + '__' + sub;
    }

    if (!acumulador[key]) {
      acumulador[key] = {
        categoria: cat,
        subcategoria: sub || undefined,
        servicios: 0,
        horas: 0,
        cantidad: 0,
        total: 0
      };
    }

    const valorTotalServicio = Number(s.total) || 0;
    acumulador[key].servicios += 1;
    acumulador[key].horas += Number(s.horas) || 0;
    acumulador[key].cantidad += Number(s.cantidad) || 0;
    acumulador[key].total += valorTotalServicio;
    totalGeneralDirecto += valorTotalServicio;
  }

  const items = [];
  let totalHoras = 0;
  let totalCantidad = 0;
  let totalServicios = 0;

  for (const k in acumulador) {
    const item = acumulador[k];
    item.horas = Math.round(item.horas * 100) / 100;
    item.cantidad = Math.round(item.cantidad * 100) / 100;
    item.total = Math.round(item.total * 100) / 100;
    items.push(item);

    totalHoras += item.horas;
    totalCantidad += item.cantidad;
    totalServicios += item.servicios;
  }

  items.sort(function(a, b) { return b.total - a.total; });

  return {
    items: items,
    totalGeneral: Math.round(totalGeneralDirecto * 100) / 100,
    totalHoras: Math.round(totalHoras * 100) / 100,
    totalCantidad: Math.round(totalCantidad * 100) / 100,
    totalServicios: totalServicios,
    serviciosDetalle: tipo === 'cliente_especifico' ? servicios : undefined
  };
}

function reporteMensualMaquinaria(anio, mes, desde, hasta) {
  return generarReporte({ tipo: 'maquinaria', anio: anio, mes: mes, desde: desde, hasta: hasta });
}

function reporteMensualMaquinariaCliente(anio, mes, desde, hasta) {
  return generarReporte({ tipo: 'maquinaria_cliente', anio: anio, mes: mes, desde: desde, hasta: hasta });
}

function reporteMensualCliente(anio, mes, desde, hasta) {
  return generarReporte({ tipo: 'cliente', anio: anio, mes: mes, desde: desde, hasta: hasta });
}

function reporteMensualOperador(anio, mes, desde, hasta) {
  return generarReporte({ tipo: 'operador', anio: anio, mes: mes, desde: desde, hasta: hasta });
}

function obtenerConfiguracion() {
  const ss = getSpreadsheet();
  const sheets = ss.getSheets();
  const hojasInfo = [];
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    hojasInfo.push({
      nombre: sh.getName(),
      filas: Math.max(0, sh.getLastRow() - 1)
    });
  }

  return {
    moneda: '$us.',
    ultimoServicio: sincronizarNumeroServicios().ultimo,
    hojas: hojasInfo,
    clientesCount: obtenerClientes().length,
    operadoresCount: obtenerOperadores().length,
    maquinariaCount: obtenerMaquinaria().length,
    serviciosCount: obtenerServicios({}).length
  };
}

function guardarCliente(cliente) {
  const hoja = obtenerHoja(HOJAS.CLIENTES);
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(cliente.cuenta).trim()) {
      hoja.getRange(i + 1, 2).setValue(cliente.nombre);
      SpreadsheetApp.flush();
      return { exito: true, mensaje: 'Cliente actualizado en Google Sheets.' };
    }
  }
  hoja.appendRow([cliente.cuenta, cliente.nombre]);
  SpreadsheetApp.flush();
  return { exito: true, mensaje: 'Cliente agregado a Google Sheets.' };
}

function eliminarCliente(cuenta) {
  const hoja = obtenerHoja(HOJAS.CLIENTES);
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(cuenta).trim()) {
      hoja.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { exito: true, mensaje: 'Cliente eliminado de Google Sheets.' };
    }
  }
  return { exito: false, mensaje: 'Cliente no encontrado.' };
}

function guardarOperador(nombre, oldNombre) {
  const hoja = obtenerHoja(HOJAS.OPERADORES);
  const data = hoja.getDataRange().getValues();
  if (oldNombre) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === oldNombre.trim()) {
        hoja.getRange(i + 1, 1).setValue(nombre.trim());
        SpreadsheetApp.flush();
        return { exito: true, mensaje: 'Operador actualizado en Google Sheets.' };
      }
    }
  }
  hoja.appendRow([nombre.trim()]);
  SpreadsheetApp.flush();
  return { exito: true, mensaje: 'Operador guardado en Google Sheets.' };
}

function eliminarOperador(nombre) {
  const hoja = obtenerHoja(HOJAS.OPERADORES);
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nombre.trim()) {
      hoja.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { exito: true, mensaje: 'Operador eliminado de Google Sheets.' };
    }
  }
  return { exito: false, mensaje: 'Operador no encontrado.' };
}

function guardarMaquinaria(item, oldMaq, oldImp) {
  const hoja = obtenerHoja(HOJAS.MAQUINARIA);
  const data = hoja.getDataRange().getValues();
  if (oldMaq !== undefined) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === oldMaq.trim() && String(data[i][1] || '').trim() === (oldImp || '').trim()) {
        hoja.getRange(i + 1, 1, 1, 4).setValues([[item.maquinaria, item.implemento || '', item.precio, item.unidad]]);
        SpreadsheetApp.flush();
        return { exito: true, mensaje: 'Maquinaria actualizada en Google Sheets.' };
      }
    }
  }
  hoja.appendRow([item.maquinaria, item.implemento || '', item.precio, item.unidad]);
  SpreadsheetApp.flush();
  return { exito: true, mensaje: 'Maquinaria agregada a Google Sheets.' };
}

function eliminarMaquinaria(maquinaria, implemento) {
  const hoja = obtenerHoja(HOJAS.MAQUINARIA);
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === maquinaria.trim() && String(data[i][1] || '').trim() === (implemento || '').trim()) {
      hoja.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { exito: true, mensaje: 'Maquinaria eliminada de Google Sheets.' };
    }
  }
  return { exito: false, mensaje: 'Maquinaria no encontrada.' };
}

function crearCopiaSeguridad() {
  const ss = getSpreadsheet();
  const fechaStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
  const nombreCopia = 'Backup_Maquinaria_' + fechaStr;

  try {
    const archivo = DriveApp.getFileById(ss.getId());
    const copia = archivo.makeCopy(nombreCopia);
    PropertiesService.getUserProperties().setProperty('ULTIMA_COPIA_FECHA', fechaStr.replace('_', ' '));

    return {
      exito: true,
      mensaje: 'Copia de seguridad creada en Google Drive.',
      nombreArchivo: copia.getName(),
      url: copia.getUrl(),
      fecha: fechaStr.replace('_', ' ')
    };
  } catch (err) {
    return {
      exito: false,
      mensaje: 'Error al generar copia: ' + err.message
    };
  }
}

function configurarBackupDiario() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'ejecutarBackupAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('ejecutarBackupAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();

  return { exito: true, mensaje: 'Copia automática programada a las 23:00 hrs.' };
}

function ejecutarBackupAutomatico() {
  crearCopiaSeguridad();
}
