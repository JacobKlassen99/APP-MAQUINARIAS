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

    const servicio = {
      nroServicio: nroServicio,
      fecha: fechaStr,
      cuenta: String(fila[2] !== undefined && fila[2] !== null ? fila[2] : '').trim(),
      cliente: String(fila[3] || '').trim(),
      maquinaria: String(fila[4] || '').trim(),
      implemento: String(fila[5] || '').trim(),
      operador: String(fila[6] || '').trim(),
      tipo: String(fila[7] || '').trim(),
      inicio: String(fila[8] !== undefined && fila[8] !== null ? fila[8] : '').trim(),
      fin: String(fila[9] !== undefined && fila[9] !== null ? fila[9] : '').trim(),
      cantidad: parseNum(fila[10]),
      unidad: String(fila[11] || 'Hora').trim(),
      horas: parseNum(fila[12]),
      precio: parseNum(fila[13]),
      total: parseNum(fila[14]),
      filaIndex: i + 2
    };

    servicios.push(servicio);
  }

  if (!filtros) return servicios;

  let filtrados = servicios;

  if (filtros.busqueda && filtros.busqueda.trim() !== '') {
    const q = filtros.busqueda.toLowerCase().trim();
    filtrados = filtrados.filter(function(s) {
      return (
        s.nroServicio.toLowerCase().indexOf(q) !== -1 ||
        s.cuenta.toLowerCase().indexOf(q) !== -1 ||
        s.cliente.toLowerCase().indexOf(q) !== -1 ||
        s.maquinaria.toLowerCase().indexOf(q) !== -1 ||
        s.implemento.toLowerCase().indexOf(q) !== -1 ||
        s.operador.toLowerCase().indexOf(q) !== -1 ||
        s.tipo.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  if (filtros.desde && filtros.desde.trim() !== '') {
    filtrados = filtrados.filter(function(s) {
      return s.fecha >= filtros.desde;
    });
  }

  if (filtros.hasta && filtros.hasta.trim() !== '') {
    filtrados = filtrados.filter(function(s) {
      return s.fecha <= filtros.hasta;
    });
  }

  if (filtros.maquinaria && filtros.maquinaria.trim() !== '' && filtros.maquinaria !== 'TODAS') {
    filtrados = filtrados.filter(function(s) {
      return s.maquinaria === filtros.maquinaria;
    });
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
      const match = nro.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
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
    const hoja = obtenerHoja(HOJAS.SERVICIOS);
    if (!hoja) return { exito: false, mensaje: 'Hoja servicios no encontrada.' };

    const ultimaFila = hoja.getLastRow();
    if (ultimaFila <= 1) return { exito: false, mensaje: 'No hay registros para editar.' };

    const codigos = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
    let filaDestino = -1;
    const nroBuscar = datos.numero || datos.nroServicio;

    if (datos.fila && Number(datos.fila) >= 2) {
      filaDestino = Number(datos.fila);
    } else {
      for (let i = 0; i < codigos.length; i++) {
        if (String(codigos[i][0]).trim() === nroBuscar) {
          filaDestino = i + 2;
          break;
        }
      }
    }

    if (filaDestino === -1) {
      return { exito: false, mensaje: 'Servicio no encontrado: ' + nroBuscar };
    }

    const tarifaOficial = obtenerPrecioMaquinaria(datos.maquinaria, datos.implemento);
    const unidad = datos.unidad || (tarifaOficial ? tarifaOficial.unidad : 'Hora');
    const precio = datos.precio !== undefined ? Number(datos.precio) : (tarifaOficial ? tarifaOficial.precio : 0);

    datos.unidad = unidad;
    datos.precio = precio;
    const calculo = calcularServicio(datos);

    const fila = [
      nroBuscar,
      datos.fecha,
      datos.cuenta,
      datos.cliente,
      datos.maquinaria,
      datos.implemento || '',
      datos.operador,
      datos.tipo || '',
      datos.inicio !== undefined && datos.inicio !== null ? datos.inicio : '',
      datos.fin !== undefined && datos.fin !== null ? datos.fin : '',
      calculo.cantidad,
      unidad,
      calculo.horas,
      precio,
      calculo.total
    ];

    hoja.getRange(filaDestino, 1, 1, 15).setValues([fila]);
    SpreadsheetApp.flush();

    return { exito: true, ok: true, mensaje: 'Servicio actualizado correctamente en Google Sheets.' };
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

  const acumulador = {};

  for (let i = 0; i < servicios.length; i++) {
    const s = servicios[i];
    let key = '';
    let cat = '';
    let sub = '';

    if (tipo === 'maquinaria') {
      cat = s.maquinaria || 'Sin asignar';
      key = cat;
    } else if (tipo === 'maquinaria_cliente') {
      cat = s.maquinaria || 'Sin asignar';
      sub = s.cuenta + ' - ' + s.cliente;
      key = cat + '__' + sub;
    } else if (tipo === 'cliente') {
      cat = s.cuenta + ' - ' + s.cliente;
      key = cat;
    } else if (tipo === 'operador') {
      cat = s.operador || 'Sin operador';
      key = cat;
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

    acumulador[key].servicios += 1;
    acumulador[key].horas += Number(s.horas) || 0;
    acumulador[key].cantidad += Number(s.cantidad) || 0;
    acumulador[key].total += Number(s.total) || 0;
  }

  const items = [];
  let totalGeneral = 0;
  let totalHoras = 0;
  let totalCantidad = 0;
  let totalServicios = 0;

  for (const k in acumulador) {
    const item = acumulador[k];
    item.horas = Math.round(item.horas * 100) / 100;
    item.cantidad = Math.round(item.cantidad * 100) / 100;
    item.total = Math.round(item.total * 100) / 100;
    items.push(item);

    totalGeneral += item.total;
    totalHoras += item.horas;
    totalCantidad += item.cantidad;
    totalServicios += item.servicios;
  }

  items.sort(function(a, b) { return b.total - a.total; });

  return {
    items: items,
    totalGeneral: Math.round(totalGeneral * 100) / 100,
    totalHoras: Math.round(totalHoras * 100) / 100,
    totalCantidad: Math.round(totalCantidad * 100) / 100,
    totalServicios: totalServicios
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
