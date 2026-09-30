export interface Cliente {
  cuenta: string;
  nombre: string;
  fila?: number;
}

export interface Operador {
  operador: string;
  nombre?: string;
  fila?: number;
}

export type UnidadMedida = 'Hora' | 'Unidad' | 'Kilómetro';
export type TipoHora = 'Horómetro' | 'Horario' | '';

export interface MaquinariaConfig {
  maquinaria: string;
  implemento: string; // "Implemento/Servicio" header in sheet
  precio: number;
  unidad: UnidadMedida;
  fila?: number;
}

export interface Servicio {
  nroServicio: string; // e.g. SERV-000001
  fecha: string;       // YYYY-MM-DD
  cuenta: string;
  cliente: string;
  maquinaria: string;
  implemento: string;
  operador: string;
  tipo: TipoHora;      // 'Horómetro' | 'Horario' | ''
  inicio: string;      // string for flexibility (e.g. "1250" or "08:00")
  fin: string;         // string for flexibility (e.g. "1258" or "17:00")
  cantidad: number;
  unidad: UnidadMedida;
  horas: number;
  precio: number;
  total: number;
  id?: string;
  fila?: number;
  numero?: string;
}

export interface FiltrosServicio {
  busqueda?: string;
  desde?: string;
  hasta?: string;
  maquinaria?: string;
}

export interface FiltrosPaginacion extends FiltrosServicio {
  page?: number;
  limit?: number;
  pagina?: number;
  limite?: number;
  buscar?: string;
}

export interface RespuestaPaginada<T> {
  ok: boolean;
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ReporteItem {
  categoria: string;
  subcategoria?: string;
  servicios: number;
  horas: number;
  cantidad: number;
  total: number;
}

export type TipoReporte = 
  | 'maquinaria' 
  | 'maquinaria_cliente' 
  | 'cliente' 
  | 'operador';

export interface DashboardStats {
  totalServicios: number;
  serviciosHoy: number;
  serviciosMes: number;
  horasMes: number;
  totalMes: number;
  ultimoServicio: Servicio | null;
  ultimosServicios?: Servicio[];
}
