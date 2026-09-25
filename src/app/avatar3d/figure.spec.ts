import { FIGURES, HH, chinY, crownY, figureFor, hang, headsTall, torsoRadius, wrist } from './figure';

describe('figure', () => {
  describe('the boy, measured from the reference', () => {
    const boy = FIGURES.boy;
    const inHH = (units: number) => units / HH;

    it('stands about 7.3 heads tall, as the reference does', () => {
      expect(headsTall(boy)).toBeGreaterThan(7.1);
      expect(headsTall(boy)).toBeLessThan(7.5);
    });

    it('puts the landmarks where the reference has them', () => {
      expect(inHH(chinY(boy))).toBeCloseTo(6.28, 1);
      expect(inHH(crownY(boy))).toBeCloseTo(7.28, 1);
      expect(inHH(boy.crotch)).toBeCloseTo(3.45, 2);
      expect(inHH(boy.knee[1])).toBeCloseTo(2, 2);
      expect(inHH(boy.belt)).toBeCloseTo(3.95, 2);
      expect(inHH(boy.hem)).toBeCloseTo(4.05, 2);
    });

    it('is as wide as the reference: shoulders over twice the head, a narrower waist', () => {
      // A width in head heights is a half-width in units
      const shoulders = boy.shoulder[0] + boy.armRadii[0];
      expect(shoulders).toBeGreaterThan(2.1);
      expect(shoulders).toBeLessThan(2.5);
      const chest = Math.max(...boy.torso.map(([r]) => r));
      const waist = torsoRadius(boy, boy.belt + 0.3);
      expect(chest).toBeGreaterThan(waist);
      expect(boy.headScale[0]).toBeCloseTo(0.8, 2);
    });

    it('is a body, not a board: its chest about two thirds as deep as it is wide', () => {
      Object.values(FIGURES).forEach(figure => {
        expect(figure.torsoDepth).toBeGreaterThan(0.55);
        expect(figure.torsoDepth).toBeLessThan(0.8);
      });
    });

    it('has longer legs than torso, crotch to collar', () => {
      const collar = boy.torso[boy.torso.length - 1][1];
      expect(boy.crotch).toBeGreaterThan(collar - boy.crotch);
    });
  });

  describe('the girl', () => {
    it('is a little shorter than the boy, and still about seven heads tall', () => {
      expect(crownY(FIGURES.girl)).toBeLessThan(crownY(FIGURES.boy));
      expect(headsTall(FIGURES.girl)).toBeGreaterThan(6.9);
      expect(headsTall(FIGURES.girl)).toBeLessThan(7.4);
    });

    it('has a softer, narrower head', () => {
      expect(FIGURES.girl.headScale[0]).toBeLessThan(FIGURES.boy.headScale[0]);
    });
  });

  it('keeps every figure’s outline climbing from crotch to collar, and the head above the collar', () => {
    Object.values(FIGURES).forEach(figure => {
      for (let i = 1; i < figure.torso.length; i++) {
        expect(figure.torso[i][1]).toBeGreaterThan(figure.torso[i - 1][1]);
      }
      expect(chinY(figure)).toBeGreaterThan(figure.torso[figure.torso.length - 1][1]);
      expect(figure.crotch).toBeLessThan(figure.belt);
      expect(figure.belt).toBeLessThan(figure.hem);
      expect(figure.knee[1]).toBeLessThan(figure.hip[1]);
      expect(figure.ankle[1]).toBeLessThan(figure.knee[1]);
    });
  });

  it('measures the torso straight between its points, and is nothing outside it', () => {
    const boy = FIGURES.boy;
    const [[r0, y0], [r1, y1]] = boy.torso;
    expect(torsoRadius(boy, y0)).toBeCloseTo(r0, 9);
    expect(torsoRadius(boy, y1)).toBeCloseTo(r1, 9);
    expect(torsoRadius(boy, (y0 + y1) / 2)).toBeCloseTo((r0 + r1) / 2, 9);
    expect(torsoRadius(boy, y0 - 0.01)).toBe(0);
    expect(torsoRadius(boy, boy.torso[boy.torso.length - 1][1] + 0.01)).toBe(0);
  });

  it('hangs an arm from the shoulder, out and down', () => {
    expect(hang([1, 10], 2, 0, 1)).toEqual([1, 8]);
    const [x, y] = hang([1, 10], 2, Math.PI / 2, 1);
    expect(x).toBeCloseTo(3, 9);
    expect(y).toBeCloseTo(10, 9);
    expect(hang([1, 10], 2, Math.PI / 2, -1)[0]).toBeCloseTo(-1, 9);
    const boy = FIGURES.boy;
    const [wx, wy] = wrist(boy);
    expect(wx).toBeGreaterThan(boy.shoulder[0]);
    expect(wy).toBeLessThan(boy.shoulder[1] - boy.upperArm);
  });

  it('hangs each arm clear of the chest all the way down, touching at most', () => {
    Object.entries(FIGURES).forEach(([type, figure]) => {
      const elbow = hang(figure.shoulder, figure.upperArm, figure.armSwing, 1);
      const [wx, wy] = wrist(figure);
      const [rShoulder, rElbow, rWrist] = figure.armRadii;
      // From a third of the way down the upper arm (above that it joins the shoulder) to the wrist
      for (let t = 0.3; t <= 2; t += 0.05) {
        const upper = t <= 1;
        const k = upper ? t : t - 1;
        const x = upper ? figure.shoulder[0] + (elbow[0] - figure.shoulder[0]) * k : elbow[0] + (wx - elbow[0]) * k;
        const y = upper ? figure.shoulder[1] + (elbow[1] - figure.shoulder[1]) * k : elbow[1] + (wy - elbow[1]) * k;
        const r = upper ? rShoulder + (rElbow - rShoulder) * k : rElbow + (rWrist - rElbow) * k;
        expect(x - r).toBeGreaterThan(torsoRadius(figure, y) - 0.1, `${type} arm into the body at ${y.toFixed(2)}`);
      }
    });
  });

  it('falls back to the boy for a body type it does not know', () => {
    expect(figureFor(undefined)).toBe(FIGURES.boy);
    expect(figureFor('robot' as any)).toBe(FIGURES.boy);
    expect(figureFor('girl')).toBe(FIGURES.girl);
  });
});
