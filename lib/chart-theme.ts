'use client';

import { useMemo } from 'react';
import { useTheme } from '@/lib/theme';

/**
 * useChartTheme — reads CSS custom properties from the document root and
 * returns a Recharts-compatible theme object. Re-evaluates when the app
 * theme toggles between dark and light so charts always match the UI.
 *
 * Usage:
 *   const chart = useChartTheme();
 *   <XAxis tick={{ fill: chart.tickFill }} ... />
 *   <CartesianGrid stroke={chart.gridStroke} ... />
 *   <Tooltip contentStyle={chart.tooltipStyle} ... />
 */

export interface ChartTheme {
  /** Fill color for axis tick labels */
  tickFill: string;
  /** Stroke color for CartesianGrid lines */
  gridStroke: string;
  /** Style object for Recharts Tooltip */
  tooltipStyle: React.CSSProperties;
  /** Background fill for cursor/hover region */
  cursorFill: string;
  /** Reference line stroke (e.g. midpoint guides) */
  refLineStroke: string;
  /** Bar fill for incomplete / secondary bars */
  barFillMuted: string;
  /** Bar fill for complete / highlight bars */
  barFillPrimary: string;
  /** Teal accent (used for 100% completion) */
  teal: string;
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartTheme(): ChartTheme {
  // Re-compute whenever the theme toggles
  const { isDark } = useTheme();

  return useMemo(() => {
    const textMuted     = getCSSVar('--text-muted')      || (isDark ? '#5E5A78' : '#999999');
    const border        = getCSSVar('--border')          || (isDark ? '#2E2A45' : '#E8E8F0');
    const surfaceEl     = getCSSVar('--surface-elevated')|| (isDark ? '#231F38' : '#F5F5FF');
    const textPrimary   = getCSSVar('--text-primary')    || (isDark ? '#F0EEFF' : '#1A1A2E');
    const primary       = getCSSVar('--primary')         || '#6C63FF';
    const teal          = getCSSVar('--teal')            || '#4ECDC4';

    return {
      tickFill:      textMuted,
      gridStroke:    border,
      refLineStroke: isDark ? '#3D3A55' : '#DDDDEE',
      cursorFill:    isDark ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.04)',
      barFillPrimary: primary,
      barFillMuted:  isDark ? 'rgba(108,99,255,0.35)' : 'rgba(108,99,255,0.25)',
      teal,
      tooltipStyle: {
        background:   surfaceEl,
        border:       `1px solid ${border}`,
        borderRadius: 12,
        color:        textPrimary,
        fontSize:     12,
        fontWeight:   600,
        boxShadow:    isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);
}
