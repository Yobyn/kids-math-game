import { FieldPulseService } from './field-pulse.service';

describe('FieldPulseService', () => {
  let service: FieldPulseService;
  let heard: number[];

  beforeEach(() => {
    service = new FieldPulseService();
    heard = [];
    service.pulses$.subscribe(strength => heard.push(strength));
  });

  it('passes a pulse through to whoever is listening', () => {
    service.pulse(0.5);
    expect(heard).toEqual([0.5]);
  });

  it('clamps a strength above full', () => {
    service.pulse(4);
    expect(heard).toEqual([1]);
  });

  it('clamps a negative strength to nothing', () => {
    service.pulse(-2);
    expect(heard).toEqual([0]);
  });

  it('keeps every pulse, so a burst of them still registers', () => {
    service.pulse(0.3);
    service.pulse(0.4);
    expect(heard).toEqual([0.3, 0.4]);
  });

  it('carries a tap to wherever it landed', () => {
    const taps: { x: number; y: number }[] = [];
    service.taps$.subscribe(point => taps.push(point));
    service.tap(12, 34);
    expect(taps).toEqual([{ x: 12, y: 34 }]);
  });

  it('drops a tap with no real position', () => {
    const taps: { x: number; y: number }[] = [];
    service.taps$.subscribe(point => taps.push(point));
    service.tap(NaN, 3);
    service.tap(3, Infinity);
    expect(taps).toEqual([]);
  });

  it('keeps the two vocabularies apart: a tap is never a pulse, and a pulse never a tap', () => {
    const taps: { x: number; y: number }[] = [];
    service.taps$.subscribe(point => taps.push(point));
    service.tap(1, 1);
    service.pulse(0.5);
    expect(heard).toEqual([0.5]);
    expect(taps).toEqual([{ x: 1, y: 1 }]);
  });
});
