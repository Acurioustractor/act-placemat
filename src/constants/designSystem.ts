// ACT Placemat Design System
// Community-focused design tokens for elegant data visualization

export const COMMUNITY_COLORS = {
  // Primary Brand Colors - Community & Growth
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1', 
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Primary teal
    600: '#0f766e', // Main brand color
    700: '#0f5959',
    800: '#134e4a',
    900: '#042f2e'
  },
  
  // Secondary Colors - Earth & Foundation
  secondary: {
    50: '#fef7ee',
    100: '#fdedd3',
    200: '#fad6a5',
    300: '#f7b96d',
    400: '#f59e0b', // Warm amber
    500: '#d97706',
    600: '#b45309', // Secondary brand
    700: '#92400e',
    800: '#78350f',
    900: '#451a03'
  },
  
  // Accent Colors - Energy & Hope
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309', // Accent color
    800: '#92400e',
    900: '#78350f'
  },
  
  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#166534', // Success green
    800: '#15803d',
    900: '#14532d'
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#a16207', // Warning amber
    800: '#92400e',
    900: '#78350f'
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  
  // Neutral Colors - Balance & Text
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151', // Main text
    800: '#1f2937',
    900: '#111827'
  }
};

// Data Visualization Specific Colors
export const DATA_COLORS = {
  // Relationship Strength (Community Networks)
  relationships: {
    strong: COMMUNITY_COLORS.success[700],     // Deep green
    moderate: COMMUNITY_COLORS.success[500],   // Medium green  
    weak: COMMUNITY_COLORS.success[300],       // Light green
    inactive: COMMUNITY_COLORS.neutral[300],   // Gray
    potential: COMMUNITY_COLORS.accent[300]    // Soft amber
  },
  
  // Impact Levels (Community Outcomes)
  impact: {
    high: COMMUNITY_COLORS.primary[600],       // Deep teal
    medium: COMMUNITY_COLORS.primary[400],     // Medium teal
    low: COMMUNITY_COLORS.primary[200],        // Light teal
    potential: COMMUNITY_COLORS.primary[100]   // Very light teal
  },
  
  // Project Areas (ACT Focus Areas)
  projectAreas: {
    storyMatter: '#0f766e',          // Teal - storytelling, sovereignty
    economicFreedom: '#b45309',      // Amber - economic empowerment
    healingJustice: '#166534',       // Green - health, healing
    environmentalJustice: '#0891b2', // Blue - environmental protection
    politicalPower: '#7c2d12',       // Brown - political engagement
    other: '#6b7280'                 // Neutral gray
  },
  
  // Opportunity Pipeline Stages
  pipeline: {
    discovery: COMMUNITY_COLORS.neutral[400],    // Light gray
    applied: COMMUNITY_COLORS.accent[400],       // Amber
    negotiation: COMMUNITY_COLORS.secondary[600], // Orange
    closedWon: COMMUNITY_COLORS.success[600],    // Green
    closedLost: COMMUNITY_COLORS.error[400]      // Light red
  },
  
  // Chart Color Palettes
  categorical: [
    COMMUNITY_COLORS.primary[600],   // Teal
    COMMUNITY_COLORS.secondary[600], // Amber
    COMMUNITY_COLORS.success[600],   // Green
    COMMUNITY_COLORS.accent[400],    // Light amber
    COMMUNITY_COLORS.neutral[600],   // Gray
    COMMUNITY_COLORS.primary[400],   // Light teal
    COMMUNITY_COLORS.success[400],   // Light green
    COMMUNITY_COLORS.secondary[400]  // Light orange
  ],
  
  // Gradient Palettes for Heatmaps
  heatmap: {
    teal: [
      COMMUNITY_COLORS.primary[100],
      COMMUNITY_COLORS.primary[300],
      COMMUNITY_COLORS.primary[500],
      COMMUNITY_COLORS.primary[700],
      COMMUNITY_COLORS.primary[900]
    ],
    impact: [
      '#f0fdfa', // Very light teal
      '#99f6e4', // Light teal
      '#2dd4bf', // Medium teal
      '#0f766e', // Dark teal
      '#042f2e'  // Very dark teal
    ]
  }
};

// Typography System
export const TYPOGRAPHY = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace'
  },
  
  fontSize: {
    // Chart and Data Text
    xs: '0.75rem',    // 12px - Small data labels
    sm: '0.875rem',   // 14px - Standard data labels
    base: '1rem',     // 16px - Body text
    lg: '1.125rem',   // 18px - Chart titles
    xl: '1.25rem',    // 20px - Section headers
    '2xl': '1.5rem',  // 24px - Page headers
    '3xl': '1.875rem', // 30px - Dashboard title
    '4xl': '2.25rem'  // 36px - Hero metrics
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  lineHeight: {
    tight: '1.25',    // Headings
    normal: '1.5',    // Body text
    relaxed: '1.625'  // Reading text
  }
};

// Spacing System (8px base unit)
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  base: '1rem',    // 16px
  md: '1.5rem',    // 24px
  lg: '2rem',      // 32px
  xl: '2.5rem',    // 40px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  
  // Chart specific
  chartPadding: '1.5rem',     // 24px
  chartMargin: '1rem',        // 16px
  sectionSpacing: '2rem',     // 32px
  cardPadding: '1.5rem'       // 24px
};

// Shadows for Depth
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  
  // Card shadows
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  cardHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
};

// Border Radius
export const BORDER_RADIUS = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  full: '9999px'
};

// Chart Theme Configuration
export const CHART_THEME = {
  background: COMMUNITY_COLORS.neutral[50],
  textColor: COMMUNITY_COLORS.neutral[700],
  fontSize: parseInt(TYPOGRAPHY.fontSize.sm) * 16, // Convert rem to px
  fontFamily: TYPOGRAPHY.fontFamily.primary,
  
  grid: {
    line: {
      stroke: COMMUNITY_COLORS.neutral[200],
      strokeWidth: 1
    }
  },
  
  axis: {
    domain: {
      line: {
        stroke: COMMUNITY_COLORS.neutral[300],
        strokeWidth: 1
      }
    },
    ticks: {
      line: {
        stroke: COMMUNITY_COLORS.neutral[300],
        strokeWidth: 1
      },
      text: {
        fontSize: parseInt(TYPOGRAPHY.fontSize.xs) * 16,
        fill: COMMUNITY_COLORS.neutral[600]
      }
    },
    legend: {
      text: {
        fontSize: parseInt(TYPOGRAPHY.fontSize.sm) * 16,
        fill: COMMUNITY_COLORS.neutral[700],
        fontWeight: TYPOGRAPHY.fontWeight.medium
      }
    }
  },
  
  tooltip: {
    container: {
      background: COMMUNITY_COLORS.neutral[900],
      color: COMMUNITY_COLORS.neutral[50],
      fontSize: TYPOGRAPHY.fontSize.sm,
      borderRadius: BORDER_RADIUS.md,
      boxShadow: SHADOWS.lg
    }
  }
};

// Animation and Transitions
export const ANIMATIONS = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  },
  
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
  }
};

// Breakpoints for Responsive Design
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Component Variants
export const COMPONENT_VARIANTS = {
  card: {
    elevated: {
      backgroundColor: COMMUNITY_COLORS.neutral[50],
      boxShadow: SHADOWS.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.cardPadding
    },
    flat: {
      backgroundColor: 'transparent',
      border: `1px solid ${COMMUNITY_COLORS.neutral[200]}`,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.cardPadding
    }
  },
  
  button: {
    primary: {
      backgroundColor: COMMUNITY_COLORS.primary[600],
      color: COMMUNITY_COLORS.neutral[50],
      borderRadius: BORDER_RADIUS.md,
      padding: `${SPACING.sm} ${SPACING.base}`,
      fontWeight: TYPOGRAPHY.fontWeight.medium
    },
    secondary: {
      backgroundColor: 'transparent',
      color: COMMUNITY_COLORS.primary[600],
      border: `1px solid ${COMMUNITY_COLORS.primary[600]}`,
      borderRadius: BORDER_RADIUS.md,
      padding: `${SPACING.sm} ${SPACING.base}`,
      fontWeight: TYPOGRAPHY.fontWeight.medium
    }
  }
};

export default {
  colors: COMMUNITY_COLORS,
  dataColors: DATA_COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  shadows: SHADOWS,
  borderRadius: BORDER_RADIUS,
  chartTheme: CHART_THEME,
  animations: ANIMATIONS,
  breakpoints: BREAKPOINTS,
  variants: COMPONENT_VARIANTS
};