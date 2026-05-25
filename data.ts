// Mock data - positions are percentages on the map canvas (0-100)

export type HazardType = 'debris' | 'pothole' | 'speed_bump' | 'sharp_curve' | 'parked_vehicle';

export interface Hazard {
  id: string;
  type: HazardType;
  title: string;
  severity: 'low' | 'medium' | 'high';
  x: number;
  y: number;
  distance: number; // meters from start
  reportedBy?: string;
  reportedAt?: string;
}

export interface POI {
  id: string;
  kind: 'fuel' | 'hotel';
  name: string;
  brand?: string;
  rating: number;
  price?: string;
  distance: string;
  fuelStatus?: 'In Stock' | 'Limited' | 'No Diesel' | 'Empty';
  lastUpdated?: string;
  image?: string;
  x: number;
  y: number;
}

export interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  distance: string;
  phone: string;
  open: boolean;
  image?: string;
  x: number;
  y: number;
}

export interface PartSupplier {
  id: string;
  name: string;
  parts: string[];
  rating: number;
  distance: string;
  phone: string;
  x: number;
  y: number;
}

export const hazards: Hazard[] = [
  { id: 'h1', type: 'pothole', title: 'Deep pothole on slow lane', severity: 'high', x: 30, y: 72, distance: 450 },
  { id: 'h2', type: 'debris', title: 'Tire debris on shoulder', severity: 'low', x: 46, y: 54, distance: 1200 },
  { id: 'h3', type: 'speed_bump', title: 'New unmarked speed bump', severity: 'medium', x: 62, y: 36, distance: 2800 },
];

export const pois: POI[] = [
  { id: 'p1', kind: 'fuel', name: 'Shell Ultra', brand: 'Shell', rating: 4.5, x: 22, y: 78, distance: '1.2km', fuelStatus: 'In Stock' },
  { id: 'p2', kind: 'hotel', name: 'Roadside Inn', rating: 4.2, x: 54, y: 44, distance: '4.5km' },
];

export const mechanics: Mechanic[] = [
  { id: 'm1', name: 'Expert Auto Care', specialty: 'General Service', rating: 4.8, reviews: 156, distance: '1.5km', phone: '+123456789', open: true, x: 35, y: 68 },
  { id: 'm2', name: 'Precision Brakes', specialty: 'Brake Specialist', rating: 4.9, reviews: 89, distance: '3.2km', phone: '+123456780', open: true, x: 70, y: 25 },
];

export const suppliers: PartSupplier[] = [
  { id: 's1', name: 'Global Parts Hub', parts: ['Engines', 'Brakes', 'Tires'], rating: 4.7, distance: '5.0km', phone: '+123456781', x: 15, y: 80 },
  { id: 's2', name: 'QuickSpares', parts: ['Electrical', 'Suspension'], rating: 4.5, distance: '2.1km', phone: '+123456782', x: 45, y: 55 },
];

export const routePath = [
  { x: 15, y: 86 },
  { x: 22, y: 78 },
  { x: 30, y: 72 },
  { x: 38, y: 64 },
  { x: 46, y: 54 },
  { x: 54, y: 44 },
  { x: 62, y: 36 },
  { x: 70, y: 28 },
  { x: 78, y: 20 },
  { x: 86, y: 12 },
  { x: 92, y: 6 },
];
