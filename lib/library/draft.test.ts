// lib/library/draft.test.ts
// AI result → family, options and variant rows. D12 is proven here: an axis makes rows only where the performance
// table gives it different specs, so colours and drivers stay options instead of multiplying the rows.

import { describe, expect, it } from 'vitest';
import { datasheetResultSchema, type DatasheetResult } from '@/lib/ai/schemas/datasheet';
import caveResponse from '@/tests/fixtures/datasheets/cave-03.response.json';
import { MAX_VARIANTS_PER_FAMILY } from './constants';
import { buildDraft, efficacy } from './draft';

const cave = datasheetResultSchema.parse(caveResponse);

type Row = DatasheetResult['performance'][number];
type Axis = DatasheetResult['axes'][number]['axis'];

const spec = (raw: string, source: 'TEXT' | 'TABLE' = 'TABLE') => ({ raw, page: 1, source });
const NO_ROW_SPECS: Row['specs'] = {
  lumensDelivered: null,
  lumensChip: null,
  watts: null,
  beamAngle: null,
  length: null,
  width: null,
  height: null,
  diameter: null,
  cutOut: null,
  weight: null,
};
const row = (key: Row['key'], specs: Partial<Row['specs']>): Row => ({ key, specs: { ...NO_ROW_SPECS, ...specs } });
const axis = (name: Axis, raws: string[], codes: (string | null)[] = []) => ({
  axis: name,
  values: raws.map((raw, i) => ({ code: codes[i] ?? null, label: raw, raw, page: 1 })),
});

describe('buildDraft: CAVE 03', () => {
  const draft = buildDraft(cave);

  it('makes one variant per CCT, because only CCT changes the lumens', () => {
    expect(draft.variantAxes).toEqual(['CCT']);
    expect(draft.variantCount).toBe(3);
    expect(draft.variants.map((v) => [v.axisValues.CCT, v.lumensDeliveredMin, v.lumensChipMin])).toEqual([
      [2700, 194, 268],
      [3000, 204, 286],
      [4000, 215, 286],
    ]);
  });

  it('keeps the colours as options, not rows', () => {
    expect(draft.options.map((o) => [o.axis, o.code, o.label, o.sortOrder])).toEqual([
      ['FINISH', '01', 'Black', 0],
      ['FINISH', '09', 'Gold', 1],
      ['FINISH', '90', 'White', 2],
    ]);
  });

  it('copies the common specs onto every variant, converted', () => {
    for (const v of draft.variants) {
      expect(v).toMatchObject({
        wattsMin: 3,
        wattsMax: 3,
        cctMin: v.axisValues.CCT,
        cctMax: v.axisValues.CCT,
        ipFront: 44,
        ipRear: 20,
        criMin: 80,
        ugrMax: 19,
        electricalClass: 'II',
        lifetimeHours: 100000,
        weightKg: 0.05,
        cutOutMm: 30,
        diameterMm: 35,
        heightMm: 35,
        warrantyYears: 5,
        orderCode: null,
      });
    }
  });

  it('keeps the brand, the chip brand apart, and the code template as printed', () => {
    expect(draft.family.brandName).toBe('JISO');
    expect(draft.family.extraSpecs.ledChipBrand).toBe('Bridgelux');
    expect(draft.family.orderCodeTemplate).toBe('7IA53603-21J_-__');
    expect(draft.family.sourcePages).toEqual([1, 2]);
    expect(draft.family.figures).toHaveLength(5);
    expect(draft.unparsed).toEqual([]);
  });

  it("computes the luminaire's efficacy from delivered lumens", () => {
    const [first, , last] = draft.variants.map(efficacy);
    expect(first?.min).toBeCloseTo(64.7, 1);
    expect(last?.max).toBeCloseTo(71.7, 1);
  });

  it('records a value it could not convert, instead of guessing', () => {
    const unreadable = buildDraft({ ...cave, specs: { ...cave.specs, ik: spec('high', 'TEXT') } });
    expect(unreadable.unparsed).toEqual([{ field: 'specs.ik', raw: 'high', page: 1 }]);
    expect(unreadable.variants[0].ik).toBeNull();
  });
});

describe('buildDraft: a linear range', () => {
  // 5 lengths × 3 CCTs × 3 beams × 4 colours × 2 drivers. Lumens change with length and CCT, the beam angle with the
  // beam; every colour weighs the same, and the drivers aren't in the table.
  const lengths = ['600', '900', '1200', '1500', '1800'];
  const ccts = ['3000K', '4000K', '5000K'];
  const beams = ['15º', '30º', '60º'];
  const colours = ['01', '02', '03', '04'];
  const lumens = (l: number, c: number) => 1000 + l * 500 + c * 50;

  const linear: DatasheetResult = {
    ...cave,
    specs: { ...cave.specs, cutOut: null, diameter: null, height: null, ledChipBrand: null },
    axes: [
      axis('LENGTH', lengths.map((l) => `${l} mm`)),
      axis('CCT', ccts),
      axis('BEAM', beams),
      axis('FINISH', ['Black', 'White', 'Grey', 'Bronze'], colours),
      axis('DIMMING', ['ON/OFF', 'DALI'], ['N', 'D']),
    ],
    performance: [
      ...lengths.flatMap((l, li) =>
        ccts.map((c, ci) =>
          row(
            [
              { axis: 'LENGTH', raw: `${l} mm` },
              { axis: 'CCT', raw: c },
            ],
            { lumensDelivered: spec(String(lumens(li, ci))), watts: spec(`${10 + li * 5}W`), length: spec(`${l} mm`) },
          ),
        ),
      ),
      ...beams.map((b) => row([{ axis: 'BEAM', raw: b }], { beamAngle: spec(b) })),
      ...colours.map((c) => row([{ axis: 'FINISH', raw: c }], { weight: spec('1,2 kg') })),
    ],
    orderCodes: [],
  };
  const draft = buildDraft(linear);

  it('makes 45 variants from length, CCT and beam', () => {
    expect([...draft.variantAxes].sort()).toEqual(['BEAM', 'CCT', 'LENGTH']);
    expect(draft.variantCount).toBe(45);
    expect(draft.variants).toHaveLength(45);
  });

  it('keeps colours and drivers as options', () => {
    expect(draft.options.map((o) => `${o.axis}:${o.code}`)).toEqual([
      'FINISH:01',
      'FINISH:02',
      'FINISH:03',
      'FINISH:04',
      'DIMMING:N',
      'DIMMING:D',
    ]);
  });

  it('gives each variant the specs of the rows that match it', () => {
    const v = draft.variants.find((x) => x.axisValues.LENGTH === 1200 && x.axisValues.CCT === 4000 && x.axisValues.BEAM === 30);
    expect(v).toMatchObject({
      lumensDeliveredMin: lumens(2, 1),
      wattsMin: 20,
      lengthMm: 1200,
      cctMin: 4000,
      beamMin: 30,
      beamMax: 30,
      weightKg: 1.2,
    });
  });
});

describe('buildDraft: the variant cap', () => {
  it('counts every combination but builds only up to the cap', () => {
    const values = Array.from({ length: 13 }, (_, i) => i);
    const big: DatasheetResult = {
      ...cave,
      axes: [
        axis('CCT', values.map((i) => `${2000 + i * 300}K`)),
        axis('LENGTH', values.map((i) => `${300 + i * 300} mm`)),
        axis('BEAM', values.map((i) => `${10 + i * 5}º`)),
      ],
      performance: [
        ...values.map((i) => row([{ axis: 'CCT', raw: `${2000 + i * 300}K` }], { lumensDelivered: spec(String(200 + i)) })),
        ...values.map((i) => row([{ axis: 'LENGTH', raw: `${300 + i * 300} mm` }], { length: spec(`${300 + i * 300} mm`) })),
        ...values.map((i) => row([{ axis: 'BEAM', raw: `${10 + i * 5}º` }], { beamAngle: spec(`${10 + i * 5}º`) })),
      ],
    };
    const draft = buildDraft(big);
    expect(draft.variantCount).toBe(13 ** 3);
    expect(draft.variants).toHaveLength(MAX_VARIANTS_PER_FAMILY);
  });
});
