import { ARM_TOUCH, FIGURES, HH, MEASURED, STYLE, clearOfChest, stylise, chinY, crownY, figureFor, hang, headsTall, torsoRadius, wrist } from './figure';

const BODY_TYPES_HERE = ['boy', 'girl'] as const;

describe('figure', () => {
  describe('the boy, measured from the reference', () => {
    const boy = MEASURED.boy;
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
    it('is a little shorter than the boy, and measured about seven heads tall', () => {
      expect(crownY(MEASURED.girl)).toBeLessThan(crownY(MEASURED.boy));
      expect(headsTall(MEASURED.girl)).toBeGreaterThan(6.9);
      expect(headsTall(MEASURED.girl)).toBeLessThan(7.4);
      // And stays shorter once stylised
      expect(crownY(FIGURES.girl)).toBeLessThan(crownY(FIGURES.boy));
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
        expect(x - r).toBeGreaterThan(torsoRadius(figure, y) - ARM_TOUCH, `${type} arm into the body at ${y.toFixed(2)}`);
      }
    });
  });

  describe('stylised: in between the chibi character and the reference (Yobyn, 2026-09-26)', () => {
    it('stands about three and a third heads tall: nearer the chibi two and a half than the measured seven', () => {
      BODY_TYPES_HERE.forEach(type => {
        expect(headsTall(FIGURES[type])).toBeGreaterThan(3);
        expect(headsTall(FIGURES[type])).toBeLessThan(3.7);
        expect(headsTall(FIGURES[type])).toBeLessThan(headsTall(MEASURED[type]) - 2);
      });
    });

    it('has a bigger head and a shorter, sturdier body than measured', () => {
      BODY_TYPES_HERE.forEach(type => {
        const [s, m] = [FIGURES[type], MEASURED[type]];
        expect(s.headScale[1]).toBeCloseTo(m.headScale[1] * STYLE.head, 9);
        expect(s.crotch).toBeCloseTo(m.crotch * STYLE.body, 9);
        expect(s.knee[1]).toBeCloseTo(m.knee[1] * STYLE.body, 9);
        expect(s.legRadii[0]).toBeCloseTo(m.legRadii[0] * STYLE.build, 9);
        expect(torsoRadius(s, s.hem)).toBeCloseTo(torsoRadius(m, m.hem) * STYLE.build, 6);
        expect(s.upperArm).toBeCloseTo(m.upperArm * STYLE.body, 9);
        // A neck fit for a bigger head, hands and feet in proportion
        expect(s.neckRadius).toBeCloseTo(m.neckRadius * STYLE.build * Math.sqrt(STYLE.head), 9);
        expect(s.handLength).toBeCloseTo(m.handLength * STYLE.body * STYLE.build, 9);
        expect(s.foot[0]).toBeCloseTo(m.foot[0] * STYLE.build, 9);
        expect(s.foot[1]).toBeCloseTo(m.foot[1] * STYLE.build, 9);
      });
    });

    it('keeps the chin on the collar: the head grows up from where the chin was', () => {
      BODY_TYPES_HERE.forEach(type => {
        const [s, m] = [FIGURES[type], MEASURED[type]];
        expect(chinY(s)).toBeCloseTo(chinY(m) * STYLE.body, 9);
        expect(crownY(s) - chinY(s)).toBeCloseTo((crownY(m) - chinY(m)) * STYLE.head, 9);
      });
    });

    it('moves the shoulder out by as much as the arm thickened, so a thicker arm is not in the chest', () => {
      const m = MEASURED.boy;
      const s = FIGURES.boy;
      // At least as far out as the arm grew; further if the chest would otherwise meet the arm
      expect(s.shoulder[0] - (s.armRadii[0] - m.armRadii[0])).toBeGreaterThanOrEqual(m.shoulder[0] * STYLE.build - 1e-9);
      // And the measured figures needed no moving at all
      BODY_TYPES_HERE.forEach(type => expect(clearOfChest(MEASURED[type])).toBe(MEASURED[type]));
    });

    it('stands relaxed, not in the reference\u2019s A-pose: arms nearer the body, elbows soft', () => {
      BODY_TYPES_HERE.forEach(type => {
        expect(FIGURES[type].armSwing).toBeLessThan(MEASURED[type].armSwing);
        expect(FIGURES[type].elbowBend).toBeGreaterThan(0.2);
        expect(FIGURES[type].elbowBend).toBeLessThan(0.6);
        expect(MEASURED[type].elbowBend).toBe(0);
      });
    });

    it('is the measured figure exactly when nothing is stylised', () => {
      BODY_TYPES_HERE.forEach(type => {
        expect(stylise(MEASURED[type], { head: 1, body: 1, build: 1 })).toEqual(MEASURED[type]);
      });
    });
  });

  it('falls back to the boy for a body type it does not know', () => {
    expect(figureFor(undefined)).toBe(FIGURES.boy);
    expect(figureFor('robot' as any)).toBe(FIGURES.boy);
    expect(figureFor('girl')).toBe(FIGURES.girl);
  });
});
