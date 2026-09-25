import { ATTACK, MASTER_VOLUME, SoundEngine } from './sound-engine';
import { frequency, notesFor, soundSet } from './sound-sets';

/** A stand-in for the Web Audio API that writes down what it was asked to do. */
class FakeParam {
  value = 0;
  calls: Array<[string, number, number]> = [];
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['ramp', v, t]); }
}
class FakeNode {
  connected: any[] = [];
  connect(to: any) { this.connected.push(to); }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  started: number | null = null;
  stopped: number | null = null;
  start(t: number) { this.started = t; }
  stop(t: number) { this.stopped = t; }
}
class FakeContext {
  state = 'suspended';
  currentTime = 5;
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  resumed = 0;
  closed = false;
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  resume() { this.resumed++; this.state = 'running'; return Promise.resolve(); }
  close() { this.closed = true; return Promise.resolve(); }
}

describe('SoundEngine', () => {
  let context: FakeContext;
  let made: number;
  let engine: SoundEngine;

  beforeEach(() => {
    context = new FakeContext();
    made = 0;
    engine = new SoundEngine(() => { made++; return context as unknown as AudioContext; });
  });

  afterEach(() => engine.close());

  it('plays one oscillator for every note of the sound', () => {
    engine.play('chimes', 'correct');
    expect(context.oscillators.length).toBe(soundSet('chimes')!.sounds.correct.length);
  });

  it('plays each note at its pitch, in its wave, at its time', () => {
    engine.play('marimba', 'tryAgain');
    const notes = soundSet('marimba')!.sounds.tryAgain;
    context.oscillators.forEach((osc, i) => {
      const note = notes[i];
      const at = 5 + 0.01 + note.t;
      expect(osc.type).toBe(note.w);
      expect(osc.frequency.calls[0]).toEqual(['set', frequency(note.m), at]);
      expect(osc.started).toBeCloseTo(at, 9);
      expect(osc.stopped!).toBeGreaterThan(at + note.d);
    });
  });

  it('slides a note that slides, to the pitch it slides to, by the time it ends', () => {
    engine.play('bubbles', 'tryAgain');
    const note = soundSet('bubbles')!.sounds.tryAgain[0];
    const osc = context.oscillators[0];
    expect(osc.frequency.calls[1]).toEqual(['ramp', frequency(note.to!), 5.01 + note.t + note.d]);
  });

  it('shapes each note: a quick rise to its loudness, then a fade to nothing', () => {
    engine.play('retro', 'correct');
    const notes = soundSet('retro')!.sounds.correct;
    // The first gain is the master; each note has its own after that
    notes.forEach((note, i) => {
      const env = context.gains[i + 1].gain.calls;
      const at = 5.01 + note.t;
      expect(env[0]).toEqual(['set', 0.0001, at]);
      expect(env[1][1]).toBeCloseTo(note.g, 9);
      expect(env[1][2]).toBeCloseTo(at + ATTACK, 9);
      expect(env[2]).toEqual(['ramp', 0.0001, at + note.d]);
    });
  });

  it('sends everything through one master volume to the speakers', () => {
    engine.play('space', 'tap');
    const master = context.gains[0];
    expect(master.gain.value).toBe(MASTER_VOLUME);
    expect(master.connected).toEqual([context.destination]);
    expect(context.gains[1].connected).toEqual([master]);
    expect(context.oscillators[0].connected).toEqual([context.gains[1]]);
  });

  it('plays each star a step higher', () => {
    engine.play('chimes', 'star', 2);
    const notes = notesFor(soundSet('chimes')!, 'star', 2);
    expect(context.oscillators[0].frequency.calls[0][1]).toBeCloseTo(frequency(notes[0].m), 9);
  });

  it('plays nothing for no sound, or for a set that does not exist', () => {
    engine.play('off', 'correct');
    engine.play('kazoo' as any, 'correct');
    expect(context.oscillators.length).toBe(0);
    expect(made).toBe(1); // asked once for the unknown set, never for 'off'
  });

  it('makes one audio context however many sounds it plays, and wakes it if the browser put it to sleep', () => {
    engine.play('chimes', 'tap');
    engine.play('chimes', 'tap');
    expect(made).toBe(1);
    expect(context.resumed).toBe(1);
  });

  it('wakes the sound on the first touch, so the first right answer is heard', () => {
    document.dispatchEvent(new Event('pointerdown'));
    expect(made).toBe(1);
    expect(context.resumed).toBe(1);
    // Awake: another touch leaves it alone
    document.dispatchEvent(new Event('pointerdown'));
    expect(context.resumed).toBe(1);
  });

  it('wakes it again on the next touch or key after the device puts it to sleep', () => {
    document.dispatchEvent(new Event('pointerdown'));
    context.state = 'suspended'; // a phone call, a locked screen
    document.dispatchEvent(new Event('keydown'));
    expect(context.resumed).toBe(2);
    expect(made).toBe(1);
  });

  it('stops listening once closed', () => {
    engine.close();
    document.dispatchEvent(new Event('pointerdown'));
    expect(made).toBe(0);
  });

  it('stays quiet without breaking where there is no Web Audio', () => {
    const silent = new SoundEngine(() => null);
    expect(() => silent.play('chimes', 'correct')).not.toThrow();
    const broken = new SoundEngine(() => { throw new Error('no audio'); });
    expect(() => broken.play('chimes', 'correct')).not.toThrow();
    silent.close();
    broken.close();
  });

  it('lets go of the audio device when closed', () => {
    engine.play('chimes', 'tap');
    engine.close();
    expect(context.closed).toBe(true);
  });
});
