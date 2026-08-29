import type { FareHistoryPoint } from "@/lib/types";

export interface ChartPoint extends FareHistoryPoint {
  x: number;
  y: number;
}

export function buildFareTrend(points: FareHistoryPoint[], width = 700, height = 180) {
  if (points.length === 0) return [];
  const prices = points.map((point) => point.lowest_price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const spread = maximum - minimum;

  return points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : (index / (points.length - 1)) * width,
    y: spread === 0 ? height / 2 : height - ((point.lowest_price - minimum) / spread) * height,
  }));
}
