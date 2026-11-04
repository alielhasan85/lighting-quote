// lib/units.test.ts
// Printed values → numbers. Every converted spec in the library depends on these rules (D11), so a misread
// separator or a lost minus sign is caught here and never by looking at a product.

import { describe, expect, it } from 'vitest';
import {
  parseBound,
  parseElectricalClass,
  parseEnergyClass,
  parseHours,
  parseIk,
  parseIp,
  parseKilograms,
  parseMillimetres,
  parseRange,
  parseValue,
  parseYesNo,
} from './units';

describe('parseRange', () => {
  it('reads one value as a range of one', () => {
    expect(parseRange('10W', 'watts')).toEqual({ min: 10, max: 10 });
    expect(parseRange('1.5 W', 'watts')).toEqual({ min: 1.5, max: 1.5 });
    expect(parseRange('30º', 'degrees')).toEqual({ min: 30, max: 30 });
  });

  it('reads ranges and lists, and stops where the chain ends', () => {
    expect(parseRange('2700/3000K', 'kelvin')).toEqual({ min: 2700, max: 3000 });
    expect(parseRange('1000-1200 lm', 'lumens')).toEqual({ min: 1000, max: 1200 });
    expect(parseRange('AC220-240V', 'volts')).toEqual({ min: 220, max: 240 });
    expect(parseRange('AC220-240V 50/60Hz', 'volts')).toEqual({ min: 220, max: 240 });
    expect(parseRange('2700K / 3000K / 4000K', 'kelvin')).toEqual({ min: 2700, max: 4000 });
    expect(parseRange('1000 lm to 1200 lm', 'lumens')).toEqual({ min: 1000, max: 1200 });
  });

  it('keeps the sign on temperatures, and two values in printed order', () => {
    expect(parseRange('-20ºC ~ +45ºC', 'celsius')).toEqual({ min: -20, max: 45 });
    expect(parseRange('−25°C – 40°C', 'celsius')).toEqual({ min: -25, max: 40 });
    // Reversed on the sheet stays reversed, so verify.ts can flag it
    expect(parseRange('+45ºC ~ -20ºC', 'celsius')).toEqual({ min: 45, max: -20 });
  });

  it('never reads a dash between numbers as a minus', () => {
    expect(parseRange('-20-45ºC', 'celsius')).toEqual({ min: -20, max: 45 });
  });

  it('returns null when no number is printed', () => {
    expect(parseRange('', 'watts')).toBeNull();
    expect(parseRange('—', 'lumens')).toBeNull();
  });
});

describe('parseValue: European and English numbers', () => {
  it('reads a dot or comma before exactly 3 digits as thousands for whole-number units', () => {
    expect(parseValue('100.000 h', 'hours')).toBe(100000);
    expect(parseValue('15.000', 'cycles')).toBe(15000);
    expect(parseValue('1,200 lm', 'lumens')).toBe(1200);
    expect(parseValue('2.700K', 'kelvin')).toBe(2700);
    expect(parseValue('1.200 mm', 'mm')).toBe(1200);
  });

  it('reads it as a decimal point otherwise', () => {
    expect(parseValue('0,05 Kg', 'kg')).toBe(0.05);
    expect(parseValue('1.5 W', 'watts')).toBe(1.5);
    expect(parseValue('0,9', 'ratio')).toBe(0.9);
    expect(parseValue('35,5 mm', 'mm')).toBe(35.5);
  });

  it('reads both separators: the last one is the decimal', () => {
    expect(parseValue('1.234,5 mm', 'mm')).toBe(1234.5);
    expect(parseValue('1,234.5 mm', 'mm')).toBe(1234.5);
  });

  it('refuses a fraction where only whole numbers make sense', () => {
    expect(parseValue('1.5 lm', 'lumens')).toBeNull();
  });
});

describe('ratings and bounds', () => {
  it('reads IP and IK codes', () => {
    expect(parseIp('IP65')).toBe(65);
    expect(parseIp('Ext 44')).toBe(44);
    expect(parseIk('IK08')).toBe(8);
    expect(parseIp('sealed')).toBeNull();
  });

  it('reads > and < bounds as the number', () => {
    expect(parseBound('>80')).toBe(80);
    expect(parseBound('<19')).toBe(19);
    expect(parseBound('Ra ≥ 90')).toBe(90);
  });

  it('reads the electrical class as a roman numeral', () => {
    expect(parseElectricalClass('Class II')).toBe('II');
    expect(parseElectricalClass('Clase I')).toBe('I');
    expect(parseElectricalClass('III')).toBe('III');
    expect(parseElectricalClass('Class 2')).toBe('II');
    expect(parseElectricalClass('none')).toBeNull();
  });

  it('reads energy classes and yes/no values', () => {
    expect(parseEnergyClass('a++')).toBe('A++');
    expect(parseEnergyClass('Class F')).toBe('F');
    expect(parseEnergyClass('n/a')).toBeNull();
    expect(parseYesNo('Flicker free')).toBe(true);
    expect(parseYesNo('Sí')).toBe(true);
    expect(parseYesNo('No')).toBe(false);
    expect(parseYesNo('<3%')).toBeNull();
  });
});

describe('units that convert', () => {
  it('reads lengths in mm, cm and m', () => {
    expect(parseMillimetres('Ø30')).toBe(30);
    expect(parseMillimetres('35mm')).toBe(35);
    expect(parseMillimetres('3,5 cm')).toBe(35);
    expect(parseMillimetres('1,2 m')).toBe(1200);
  });

  it('reads weights in kg and g', () => {
    expect(parseKilograms('0,05 Kg')).toBe(0.05);
    expect(parseKilograms('50 g')).toBe(0.05);
  });

  it('reads lifetime hours past an L/B rating', () => {
    expect(parseHours('100.000 h')).toBe(100000);
    expect(parseHours('L70B10 50.000h')).toBe(50000);
  });
});
