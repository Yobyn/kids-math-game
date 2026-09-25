import { SoundChoice, SoundEvent } from './sound-choice';
import { Note, frequency, notesFor, soundSet } from './sound-sets';

/**
 * Plays the sound sets through the Web Audio API. Fetched after the first
 * screen (see SoundService.preload), never in the first load.
 *
 * Browsers only let a page make sound after the person has touched it. The
 * context is made on the first play or the first touch, whichever comes
 * first, and woken again on any touch after the device has put it to sleep,
 * so a right answer is heard, not swallowed.
 */

/** Everything the game plays goes through this, so no set can be louder than the rest of the device. */
export const MASTER_VOLUME = 0.8;

/** How fast a note comes in: fast enough to be crisp, slow enough not to click. */
export const ATTACK = 0.006;

type ContextMaker = () => AudioContext | null;

function defaultContext(): AudioContext | null {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Maker = window.AudioContext || w.webkitAudioContext;
  return Maker ? new Maker() : null;
}

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlockListener = () => this.wake();

  constructor(private makeContext: ContextMaker = defaultContext) {
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this.unlockListener, { capture: true, passive: true });
      document.addEventListener('keydown', this.unlockListener, { capture: true, passive: true });
    }
  }

  /** Plays one moment of one set. Nothing happens for 'off' or a set that does not exist. */
  play(choice: SoundChoice, event: SoundEvent, step = 0): void {
    if (choice === 'off') {
      return;
    }
    const set = soundSet(choice);
    const context = this.ready();
    if (!set || !context || !this.master) {
      return;
    }
    const start = context.currentTime + 0.01;
    notesFor(set, event, step).forEach(note => this.note(context, this.master!, note, start));
  }

  /** Lets go of the audio device. */
  close(): void {
    document.removeEventListener('pointerdown', this.unlockListener, { capture: true });
    document.removeEventListener('keydown', this.unlockListener, { capture: true });
    this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }

  /**
   * Every touch checks the sound is awake. Not only the first: a phone call
   * or a locked screen puts it back to sleep, and the next right answer
   * should still be heard.
   */
  private wake(): void {
    this.ready();
  }

  private ready(): AudioContext | null {
    if (!this.context) {
      try {
        this.context = this.makeContext();
      } catch {
        this.context = null;
      }
      if (!this.context) {
        return null;
      }
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  /** One note: an oscillator through its own envelope, rising fast and dying away. */
  private note(context: AudioContext, out: AudioNode, note: Note, start: number): void {
    const osc = context.createOscillator();
    const env = context.createGain();
    const at = start + note.t;
    const end = at + note.d;
    osc.type = note.w;
    osc.frequency.setValueAtTime(frequency(note.m), at);
    if (note.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(frequency(note.to), end);
    }
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(note.g, 0.0002), at + ATTACK);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env);
    env.connect(out);
    osc.start(at);
    osc.stop(end + 0.02);
  }
}
