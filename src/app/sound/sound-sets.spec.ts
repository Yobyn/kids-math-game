import { SOUND_SET_IDS, SoundEvent } from './sound-choice';
import { Note, SOUND_SETS, frequency, length, notesFor, peak, soundSet } from './sound-sets';

const EVENTS: SoundEvent[] = ['correct', 'tryAgain', 'tap', 'star', 'roundDone'];

/**
 * Where a sound ends up: the lowest pitch among the notes that start last
 * (a bell's quiet partial above its note is not where the tune goes).
 */
function lastPitch(notes: Note[]): number {
  const lastStart = Math.max(...notes.map(n => n.t));
  return Math.min(...notes.filter(n => n.t === lastStart).map(n => n.to ?? n.m));
}

describe('sound sets', () => {
  it('has a set for every choice the picker offers, and no others', () => {
    expect(SOUND_SETS.map(set => set.id)).toEqual([...SOUND_SET_IDS]);
    SOUND_SET_IDS.forEach(id => expect(soundSet(id)).toBeTruthy(id));
    expect(soundSet('off')).toBeUndefined();
  });

  it('gives every set a sound for every moment, and an icon', () => {
    SOUND_SETS.forEach(set => {
      expect(set.icon.length).toBeGreaterThan(0);
      EVENTS.forEach(event => expect(set.sounds[event].length).toBeGreaterThan(0, `${set.id} ${event}`));
    });
  });

  it('keeps every sound short enough not to hold the game up', () => {
    const longest: { [event in SoundEvent]: number } = { tap: 0.08, tryAgain: 0.8, correct: 1, star: 0.8, roundDone: 2 };
    SOUND_SETS.forEach(set => EVENTS.forEach(event =>
      expect(length(set.sounds[event])).toBeLessThanOrEqual(longest[event], `${set.id} ${event}`)));
  });

  it('never gets loud: no moment of any sound adds up past half volume', () => {
    SOUND_SETS.forEach(set => EVENTS.forEach(event => {
      expect(peak(set.sounds[event])).toBeLessThanOrEqual(0.5, `${set.id} ${event}`);
      set.sounds[event].forEach(n => expect(n.g).toBeGreaterThan(0));
    }));
  });

  it('makes trying again gentler than getting it right, in every set', () => {
    SOUND_SETS.forEach(set => {
      const again = set.sounds.tryAgain;
      const right = set.sounds.correct;
      expect(peak(again)).toBeLessThanOrEqual(peak(right) * 0.75, set.id);
      // It falls, like a shrug — never climbs like a siren or holds like a buzzer
      expect(lastPitch(again)).toBeLessThan(again[0].m, set.id);
      expect(length(again)).toBeLessThan(length(right) + 0.05, set.id);
    });
  });

  it('makes a key press the quietest and shortest sound in every set', () => {
    SOUND_SETS.forEach(set => EVENTS.filter(e => e !== 'tap').forEach(event => {
      expect(peak(set.sounds.tap)).toBeLessThan(peak(set.sounds[event]), `${set.id} ${event}`);
      expect(length(set.sounds.tap)).toBeLessThan(length(set.sounds[event]), `${set.id} ${event}`);
    }));
  });

  it('uses no harsh waves: square only for the retro set, and quietly', () => {
    SOUND_SETS.forEach(set => EVENTS.forEach(event => set.sounds[event].forEach(n => {
      expect(['sine', 'triangle', 'square']).toContain(n.w);
      if (n.w === 'square') {
        expect(set.id).toBe('retro');
        expect(n.g).toBeLessThanOrEqual(0.1);
      }
    })));
  });

  it('stays in a range small ears find pleasant', () => {
    SOUND_SETS.forEach(set => EVENTS.forEach(event => set.sounds[event].forEach(n => {
      [n.m, n.to ?? n.m].forEach(m => {
        expect(frequency(m)).toBeGreaterThan(120);
        expect(frequency(m)).toBeLessThan(5000);
      });
      expect(n.t).toBeGreaterThanOrEqual(0);
      expect(n.d).toBeGreaterThan(0);
    })));
  });

  it('makes a right answer end higher than it starts, in every set', () => {
    SOUND_SETS.forEach(set => {
      const right = set.sounds.correct;
      expect(lastPitch(right)).toBeGreaterThan(right[0].m, set.id);
    });
  });

  it('gives each set its own sound', () => {
    const correct = SOUND_SETS.map(set => JSON.stringify(set.sounds.correct));
    expect(new Set(correct).size).toBe(SOUND_SETS.length);
  });

  it('lifts each star a step above the last: a third, then a fifth', () => {
    SOUND_SETS.forEach(set => {
      const [first, second, third] = [0, 1, 2].map(step => notesFor(set, 'star', step));
      first.forEach((n, i) => {
        expect(second[i].m - n.m).toBe(4);
        expect(third[i].m - n.m).toBe(7);
        if (n.to !== undefined) {
          expect(third[i].to! - n.to).toBe(7);
        } else {
          expect(third[i].to).toBeUndefined();
        }
      });
      // Out-of-range steps stay on the scale rather than going silent or wild
      expect(notesFor(set, 'star', 9)).toEqual(third);
      expect(notesFor(set, 'star', -3)).toEqual(first);
      expect(notesFor(set, 'star', 1.7)).toEqual(second);
    });
  });

  it('leaves every other moment as it is, whatever the step', () => {
    const set = SOUND_SETS[0];
    expect(notesFor(set, 'correct', 2)).toBe(set.sounds.correct);
  });

  it('measures pitch, length and loudness', () => {
    expect(frequency(69)).toBeCloseTo(440, 9);
    expect(frequency(81)).toBeCloseTo(880, 9);
    expect(frequency(60)).toBeCloseTo(261.63, 1);
    const notes: Note[] = [
      { m: 60, t: 0, d: 0.5, w: 'sine', g: 0.2 },
      { m: 64, t: 0.2, d: 0.5, w: 'sine', g: 0.1 },
      { m: 67, t: 0.6, d: 0.2, w: 'sine', g: 0.05 }
    ];
    expect(length(notes)).toBeCloseTo(0.8, 9);
    expect(peak(notes)).toBeCloseTo(0.3, 9);
    expect(length([])).toBe(0);
    expect(peak([])).toBe(0);
  });
});
