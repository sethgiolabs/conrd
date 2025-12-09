export interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  ubicacion: string;
  stock_actual: number;
  stock_minimo: number;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'Inactive';
  employeeId?: string; // Nuevo campo visual
  lastActive?: string; // Nuevo campo visual
  avatar?: string; // Opcional para la UI
}

export interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  worker: string;
  reason?: string; // Motivo de la salida (e.g. Desgaste, Préstamo)
}

export type UserRole = 'Admin' | 'Editor' | 'Empleado';

export interface AppUser {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  phone?: string;
  employeeId?: string;
  lastActive?: string;
}

export type ViewState = 'MASTER' | 'MOVEMENTS_IN' | 'MOVEMENTS_OUT' | 'WORKERS' | 'SUMMARY' | 'USERS';