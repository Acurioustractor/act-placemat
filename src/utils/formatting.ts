// Utility functions for number and text formatting

/**
 * Format currency with appropriate scale (K, M, B)
 * @param amount - Amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  options: {
    showCents?: boolean;
    scale?: 'auto' | 'none' | 'K' | 'M' | 'B';
    prefix?: string;
  } = {}
): string {
  const { showCents = false, scale = 'auto', prefix = '$' } = options;

  if (amount === 0) return `${prefix}0`;
  
  // Handle negative numbers
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  let formattedValue: string;
  let suffix = '';
  
  if (scale === 'auto') {
    if (absAmount >= 1_000_000_000) {
      formattedValue = (absAmount / 1_000_000_000).toFixed(1);
      suffix = 'B';
    } else if (absAmount >= 1_000_000) {
      formattedValue = (absAmount / 1_000_000).toFixed(1);
      suffix = 'M';
    } else if (absAmount >= 1_000) {
      formattedValue = (absAmount / 1_000).toFixed(0);
      suffix = 'K';
    } else {
      formattedValue = showCents ? absAmount.toFixed(2) : absAmount.toFixed(0);
    }
  } else if (scale === 'K') {
    formattedValue = (absAmount / 1_000).toFixed(0);
    suffix = 'K';
  } else if (scale === 'M') {
    formattedValue = (absAmount / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (scale === 'B') {
    formattedValue = (absAmount / 1_000_000_000).toFixed(1);
    suffix = 'B';
  } else {
    formattedValue = showCents ? absAmount.toFixed(2) : absAmount.toLocaleString();
  }
  
  // Remove unnecessary decimal zeros
  formattedValue = formattedValue.replace(/\.0+$/, '');
  
  return `${isNegative ? '-' : ''}${prefix}${formattedValue}${suffix}`;
}

/**
 * Format percentage with proper decimal places
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (value === 0) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with appropriate scale
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value === 0) return '0';
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  
  return value.toLocaleString();
}

/**
 * Format compact number display for dashboard metrics
 * @param value - Value to format
 * @param label - Label for the metric
 * @returns Object with formatted value and context
 */
export function formatMetric(value: number, label: string) {
  const formatted = formatNumber(value);
  return {
    value: formatted,
    label,
    rawValue: value
  };
}