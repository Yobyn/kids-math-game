import { SoundEvent, SoundSetId } from './sound-choice';

/**
 * The game's sounds, written as notes rather than recorded as files: five
 * sets a child picks between, each with a sound for every moment the game
 * makes one. Made in the browser by the Web Audio API (sound-engine.ts), so
 * a set costs a few lines instead of an MP3, works offline, and can be
 * tested — every rule below about length and loudness is checked.
 *
 * Two rules shape every set:
 * - Trying again is never a buzzer. It is quieter than a right answer and
 *   falls gently; the moment after a wrong answer is for having another go,
 *   not for being told off.
 * - A key press is the quietest thing in the set. It happens dozens of
 *   times a round.
 *
 * DOM-free: this is data and arithmetic.
 */

export type Wave = 'sine' | 'triangle' | 'square';

export interface Note {
  /** Pitch as a MIDI note number (60 is middle C). */
  m: number;
  /** Start, in seconds from the sound's start. */
  t: number;
  /** How long it rings, in seconds. */
  d: number;
  w: Wave;
  /** Peak loudness, 0-1, before the master volume. */
  g: number;
  /** A pitch to slide to over the note, for bloops and swoops. */
  to?: number;
}

export interface SoundSet {
  id: SoundSetId;
  /** What the picker shows for it. */
  icon: string;
  sounds: { [event in SoundEvent]: Note[] };
}

/** A note's frequency in Hz. */
export function frequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A bell: the note, plus a quiet partial an octave and a fifth above that fades sooner. */
function bell(m: number, t: number, d: number, g: number): Note[] {
  return [{ m, t, d, w: 'sine', g }, { m: m + 19, t, d: d * 0.5, w: 'sine', g: g * 0.25 }];
}

/** Bells one after another, `gap` apart, starting at `from`. */
function bells(ms: number[], gap: number, d: number, g: number, from = 0): Note[] {
  return ms.reduce((notes: Note[], m, i) => notes.concat(bell(m, from + i * gap, d, g)), []);
}

/** The same notes again, later and quieter: an echo, for space. */
function echo(notes: Note[], after: number, gain: number): Note[] {
  return notes.map(n => ({ ...n, t: n.t + after, g: n.g * gain }));
}

function tone(w: Wave, m: number, t: number, d: number, g: number, to?: number): Note {
  return to === undefined ? { m, t, d, w, g } : { m, t, d, w, g, to };
}

export const SOUND_SETS: SoundSet[] = [
  {
    id: 'chimes',
    icon: '🔔',
    sounds: {
      correct: [...bell(84, 0, 0.45, 0.11), ...bell(88, 0.07, 0.45, 0.11), ...bell(91, 0.14, 0.5, 0.11),
        tone('sine', 96, 0.21, 0.3, 0.07)],
      tryAgain: [...bell(76, 0, 0.25, 0.1), ...bell(72, 0.16, 0.35, 0.09)],
      tap: [tone('sine', 93, 0, 0.05, 0.04)],
      star: bell(79, 0, 0.5, 0.2),
      roundDone: [
        ...bells([72, 76, 79, 84, 88], 0.09, 0.45, 0.07),
        ...bells([84, 88, 91], 0, 0.9, 0.05, 0.5)
      ]
    }
  },
  {
    id: 'marimba',
    icon: '🎵',
    sounds: {
      correct: [tone('triangle', 79, 0, 0.3, 0.16), tone('triangle', 84, 0.08, 0.3, 0.16), tone('triangle', 88, 0.16, 0.35, 0.16)],
      tryAgain: [tone('triangle', 74, 0, 0.25, 0.15), tone('triangle', 71, 0.14, 0.3, 0.13)],
      tap: [tone('triangle', 84, 0, 0.04, 0.06)],
      star: [tone('triangle', 76, 0, 0.35, 0.24)],
      roundDone: [72, 76, 79, 84, 79, 84, 88].map((m, i) => tone('triangle', m, i * 0.1, i === 6 ? 0.5 : 0.3, 0.15))
    }
  },
  {
    id: 'retro',
    icon: '👾',
    sounds: {
      // A coin: two quick notes, the second held
      correct: [tone('square', 83, 0, 0.08, 0.08), tone('square', 88, 0.08, 0.3, 0.08)],
      // Low and short, sliding down: a shrug, not a buzzer
      tryAgain: [tone('square', 67, 0, 0.25, 0.045, 62)],
      tap: [tone('square', 96, 0, 0.03, 0.03)],
      star: [tone('square', 88, 0, 0.15, 0.07)],
      roundDone: [
        ...[72, 76, 79, 84].map((m, i) => tone('square', m, i * 0.1, 0.09, 0.07)),
        tone('square', 79, 0.45, 0.15, 0.07), tone('square', 84, 0.6, 0.45, 0.07)
      ]
    }
  },
  {
    id: 'bubbles',
    icon: '🫧',
    sounds: {
      correct: [tone('sine', 60, 0, 0.12, 0.24, 72), tone('sine', 64, 0.1, 0.12, 0.24, 76), tone('sine', 67, 0.2, 0.15, 0.24, 79)],
      tryAgain: [tone('sine', 62, 0, 0.22, 0.15, 55)],
      tap: [tone('sine', 72, 0, 0.05, 0.07, 79)],
      star: [tone('sine', 67, 0, 0.15, 0.22, 79)],
      roundDone: [60, 64, 67, 72, 76, 79].map((m, i) => tone('sine', m, i * 0.08, 0.12, 0.18, m + 12))
    }
  },
  {
    id: 'space',
    icon: '🚀',
    sounds: {
      correct: [tone('sine', 60, 0, 0.25, 0.12, 84), tone('sine', 88, 0.22, 0.5, 0.17), ...echo([tone('sine', 88, 0.22, 0.4, 0.17)], 0.2, 0.4)],
      tryAgain: [tone('sine', 72, 0, 0.35, 0.1, 60)],
      tap: [tone('sine', 84, 0, 0.04, 0.05)],
      star: [tone('triangle', 76, 0, 0.4, 0.18), ...echo([tone('triangle', 76, 0, 0.3, 0.18)], 0.18, 0.4)],
      roundDone: [
        tone('sine', 48, 0, 0.5, 0.09, 72),
        ...[72, 76, 79, 84].map((m, i) => tone('triangle', m, 0.3 + i * 0.1, 0.6, 0.09)),
        ...echo([72, 76, 79, 84].map((m, i) => tone('triangle', m, 0.3 + i * 0.1, 0.4, 0.09)), 0.2, 0.35)
      ]
    }
  }
];

/** A set by id, or undefined for one that does not exist. */
export function soundSet(id: string): SoundSet | undefined {
  return SOUND_SETS.find(set => set.id === id);
}

/**
 * The notes for an event. Stars climb: the second star is a major third
 * above the first and the third a fifth, so three stars in a row sound like
 * getting somewhere.
 */
export function notesFor(set: SoundSet, event: SoundEvent, step = 0): Note[] {
  const notes = set.sounds[event];
  if (event !== 'star') {
    return notes;
  }
  const lift = [0, 4, 7][Math.max(0, Math.min(2, Math.floor(step)))];
  return notes.map(n => ({ ...n, m: n.m + lift, ...(n.to === undefined ? {} : { to: n.to + lift }) }));
}

/** When the last note of a sound has finished, in seconds. */
export function length(notes: Note[]): number {
  return notes.reduce((end, n) => Math.max(end, n.t + n.d), 0);
}

/**
 * The loudest moment of a sound: the notes ringing at once, added up at
 * their peaks. An overestimate, since each note fades — which is the safe
 * direction for a rule about how loud a sound may get.
 */
export function peak(notes: Note[]): number {
  let loudest = 0;
  for (const n of notes) {
    const at = n.t;
    const together = notes.filter(o => o.t <= at && o.t + o.d > at).reduce((sum, o) => sum + o.g, 0);
    loudest = Math.max(loudest, together);
  }
  return loudest;
}
