export interface Forecast {
  id: string;
  userId: string;
  month: number;
  year: number;
  amount: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastCreateInput {
  userId: string;
  month: number;
  year: number;
  amount: number;
  confidence: number;
}

export interface ForecastUpdateInput {
  amount?: number;
  confidence?: number;
}

export interface ForecastResponse {
  id: string;
  userId: string;
  month: number;
  year: number;
  amount: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastRequest {
  userId: string;
  months: number;
}
