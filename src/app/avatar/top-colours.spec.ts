import { DEFAULT_TOP_COLOUR, NO_ITEM, TOP_ITEMS, defaultAvatar } from './avatar-model';
import { TOP_COLOURS, ownTopColour, topColourOf } from './top-colours';

describe('top colours', () => {
  it('offers a handful of plain colours, all different, none a top’s own', () => {
    expect(TOP_COLOURS.length).toBeGreaterThanOrEqual(6);
    expect(TOP_COLOURS.length).toBeLessThanOrEqual(10);
    expect(new Set(TOP_COLOURS.map(c => c.toLowerCase())).size).toBe(TOP_COLOURS.length);
    TOP_COLOURS.forEach(colour => expect(colour).toMatch(/^#[0-9a-f]{6}$/));
    const own = TOP_ITEMS.map(item => item.colour.toLowerCase()).concat(DEFAULT_TOP_COLOUR.toLowerCase());
    TOP_COLOURS.forEach(colour => expect(own).not.toContain(colour.toLowerCase()));
  });

  it('keeps every colour on offer clearly apart from the others and from every top’s own', () => {
    // Apart by eye, not just by value: a sky blue beside the hoodie's own blue
    // is two swatches that look the same
    const rgb = (hex: string) => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
    const apart = (a: string, b: string) => Math.hypot(...rgb(a).map((v, k) => v - rgb(b)[k]));
    const own = TOP_ITEMS.map(item => item.colour).concat(DEFAULT_TOP_COLOUR);
    TOP_COLOURS.forEach((colour, i) => {
      TOP_COLOURS.slice(i + 1).forEach(other => expect(apart(colour, other)).withContext(`${colour} ${other}`).toBeGreaterThan(55));
      own.forEach(other => expect(apart(colour, other)).withContext(`${colour} ${other}`).toBeGreaterThan(55));
    });
  });

  it('knows each top’s own colour, and the shirt everyone has', () => {
    TOP_ITEMS.filter(item => item.id !== NO_ITEM).forEach(item => expect(ownTopColour({ top: item.id })).toBe(item.colour));
    expect(ownTopColour({ top: NO_ITEM })).toBe(DEFAULT_TOP_COLOUR);
    expect(ownTopColour({ top: 'kilt' })).toBe(DEFAULT_TOP_COLOUR);
  });

  it('wears the colour chosen, or the top’s own when none is, or one not on offer', () => {
    const hoodie = TOP_ITEMS.find(item => item.id === 'hoodie')!;
    expect(topColourOf({ top: 'hoodie', topColour: TOP_COLOURS[2] })).toBe(TOP_COLOURS[2]);
    expect(topColourOf({ top: 'hoodie', topColour: '' })).toBe(hoodie.colour);
    // A hand-edited save: ignored, not drawn
    expect(topColourOf({ top: 'hoodie', topColour: 'url(evil)' })).toBe(hoodie.colour);
    expect(topColourOf({ top: 'hoodie', topColour: '#123456' })).toBe(hoodie.colour);
    // The shirt everyone starts in can be coloured too
    expect(topColourOf({ ...defaultAvatar(), topColour: TOP_COLOURS[0] })).toBe(TOP_COLOURS[0]);
  });
});
