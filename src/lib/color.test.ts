import { describe, expect, it } from 'vitest';
import { getColor, getThresholdLabel } from './color';

const thresholds = [
  { min: 0, max: 49, color: '#dbeafe', label: 'Baixo' },
  { min: 50, max: 79, color: '#60a5fa', label: 'Médio' },
  { min: 80, max: 100, color: '#1d4ed8', label: 'Alto' }
];

describe('getColor', () => {
  it('retorna cor esperada para cada faixa', () => {
    expect(getColor(10, thresholds, '#ccc')).toBe('#dbeafe');
    expect(getColor(60, thresholds, '#ccc')).toBe('#60a5fa');
    expect(getColor(90, thresholds, '#ccc')).toBe('#1d4ed8');
  });

  it('retorna noDataColor quando valor ausente', () => {
    expect(getColor(undefined, thresholds, '#ccc')).toBe('#ccc');
  });
});

describe('getThresholdLabel', () => {
  it('retorna label da faixa', () => {
    expect(getThresholdLabel(75, thresholds)).toBe('Médio');
  });
});
