
export interface SheetData {
  headers: string[];
  rows: Record<string, any>[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

export enum DashboardState {
  LOADING = 'LOADING',
  IDLE = 'IDLE',
  ERROR = 'ERROR',
  ANALYZING = 'ANALYZING'
}
