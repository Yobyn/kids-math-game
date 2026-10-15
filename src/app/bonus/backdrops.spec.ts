import { BACKDROP_ALPHA, HILL_LAYERS, cloudsAt, courtLines, hillLine } from './backdrops';

describe('a background of its own for each bonus game', () => {
  it('stays faint, so the particle field shows through', () => {
    expect(BACKDROP_ALPHA).toBeLessThanOrEqual(0.15);
  });

  it('runs Springbal\'s hills right across the board, above the ground and below the top', () => {
    HILL_LAYERS.forEach((_, layer) => {
      const line = hillLine(360, 340, 0, layer);
      expect(line[0].x).toBe(0);
      expect(line[line.length - 1].x).toBe(360);
      line.forEach(point => {
        expect(point.y).toBeLessThan(340);
        expect(point.y).toBeGreaterThan(340 * 0.5);
      });
    });
  });

  it('slides the hills by as the world goes by, the far ones slower, with no seam', () => {
    const at = (travelled: number, layer: number) => hillLine(360, 340, travelled, layer)[10].y;
    expect(at(40, 0)).not.toBe(at(0, 0));
    // the far row has moved less: it takes longer to come back round
    const span = (layer: number) => 360 * HILL_LAYERS[layer].wave / HILL_LAYERS[layer].speed;
    expect(span(0)).toBeGreaterThan(span(1));
    // a whole span later the hills are where they were
    expect(at(span(1), 1)).toBeCloseTo(at(0, 1), 6);
  });

  it('marks Balspel\'s court inside the board, the circle in the middle', () => {
    const court = courtLines(360, 520);
    expect(court.inset).toBeGreaterThanOrEqual(10);
    expect(court.middle).toBe(260);
    expect(court.circle).toBeLessThan(360 / 2 - court.inset);
  });

  it('drifts Ballonnen\'s clouds across the sky and brings them round again, still when calm', () => {
    const now = cloudsAt(360, 450, 0, false);
    const later = cloudsAt(360, 450, 5, false);
    expect(now.length).toBe(4);
    now.forEach((cloud, i) => {
      expect(later[i].x).not.toBe(cloud.x);
      expect(cloud.y).toBeLessThan(450);
    });
    // much later, every cloud is still somewhere it can be seen coming in or going out
    cloudsAt(360, 450, 1000, false).forEach(cloud => {
      expect(cloud.x).toBeGreaterThanOrEqual(-cloud.size);
      expect(cloud.x).toBeLessThanOrEqual(360 + cloud.size);
    });
    expect(cloudsAt(360, 450, 5, true)).toEqual(cloudsAt(360, 450, 0, true));
  });
});
