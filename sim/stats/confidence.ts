/**
 * Statistical helpers for calculating Mean, Standard Deviation, and 95% Confidence Intervals
 * using the Student's t-distribution.
 */

// Critical t-values for two-tailed 95% confidence (alpha = 0.05)
const T_CRITICAL_95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
  26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
  40: 2.021, 50: 2.009, 60: 2.000, 100: 1.984, 1000: 1.960,
};

function getTCritical(df: number): number {
  if (df <= 0) return 1.96;
  if (T_CRITICAL_95[df]) return T_CRITICAL_95[df];
  if (df < 30) return 2.05;
  if (df < 60) return 2.01;
  return 1.96;
}

export interface MetricDistribution {
  n: number;
  mean: number;
  stdDev: number;
  ci95Lower: number;
  ci95Upper: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export function computeDistribution(samples: number[]): MetricDistribution {
  if (!samples || samples.length === 0) {
    return {
      n: 0,
      mean: 0,
      stdDev: 0,
      ci95Lower: 0,
      ci95Upper: 0,
      median: 0,
      min: 0,
      max: 0,
      p25: 0,
      p75: 0,
    };
  }

  const n = samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const sum = samples.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  let variance = 0;
  if (n > 1) {
    const sumSqDiff = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    variance = sumSqDiff / (n - 1);
  }
  const stdDev = Math.sqrt(variance);

  const df = n - 1;
  const t = getTCritical(df);
  const standardError = n > 1 ? stdDev / Math.sqrt(n) : 0;
  const marginOfError = t * standardError;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];

  return {
    n,
    mean: Number(mean.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
    ci95Lower: Number((mean - marginOfError).toFixed(4)),
    ci95Upper: Number((mean + marginOfError).toFixed(4)),
    median: Number(median.toFixed(4)),
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    p25: Number(p25.toFixed(4)),
    p75: Number(p75.toFixed(4)),
  };
}
