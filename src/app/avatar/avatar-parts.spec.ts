import { contrastRatio, relativeLuminance } from '../theme/palette';
import { HAIR_COLOURS, SKIN_TONES, defaultAvatar } from './avatar-model';
import { HATS_OVER_HAIR, HAT_LINE, SMALL_BELOW, avatarLayers, avatarVars, shade } from './avatar-parts';

describe('shading a colour the child chose', () => {
  it('makes it darker', () => {
    [...SKIN_TONES, ...HAIR_COLOURS].forEach(colour => {
      expect(relativeLuminance(shade(colour, 0.3))).toBeLessThan(relativeLuminance(colour), colour);
    });
  });

  it('makes it darker in proportion — a little shade is a little darker', () => {
    const skin = SKIN_TONES[1];
    expect(relativeLuminance(shade(skin, 0.1))).toBeGreaterThan(relativeLuminance(shade(skin, 0.4)));
  });

  it('leans toward the theme\'s violet, not toward grey', () => {
    // Blue channel beats green in the result even from a warm skin tone
    const out = shade('#f0c08a', 0.8);
    expect(parseInt(out.slice(5, 7), 16)).toBeGreaterThan(parseInt(out.slice(3, 5), 16));
  });

  it('is unchanged by no shading, and leaves junk alone rather than inventing a colour', () => {
    expect(shade('#d99e63', 0)).toBe('#d99e63');
    expect(shade('not a colour', 0.3)).toBe('not a colour');
  });

  it('keeps a skin shade close enough to read as the same person', () => {
    // A shadow on a face, not a different face
    SKIN_TONES.forEach(skin => expect(contrastRatio(skin, shade(skin, 0.22))).toBeLessThan(1.8));
  });
});

describe('which parts to draw', () => {
  it('fits every hat line to its face, and a hat that covers the head says so', () => {
    const covered = avatarLayers({ ...defaultAvatar(), faceShape: 'oval', hat: 'cap' }, 'portrait');
    expect(covered.coversHair).toBe(true);
    expect(covered.hatLine).toBe(HAT_LINE.oval);
    expect(HATS_OVER_HAIR).not.toContain('crown');
  });

  it('draws small below the threshold and large at it', () => {
    expect(avatarVars(defaultAvatar(), SMALL_BELOW - 1)).toContain('--detail:none');
    expect(avatarVars(defaultAvatar(), SMALL_BELOW)).toContain('--detail:inline');
  });
});
