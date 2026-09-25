import { SoundService, SoundPlayer } from './sound.service';
import { SoundChoice, SoundEvent } from '../sound/sound-choice';

/** Records what would have been played, instead of fetching the engine. */
class FakePlayer implements SoundPlayer {
  played: Array<[SoundChoice, SoundEvent, number]> = [];
  play(choice: SoundChoice, event: SoundEvent, step = 0) {
    this.played.push([choice, event, step]);
  }
}

describe('SoundService', () => {
  let service: SoundService;
  let player: FakePlayer;
  let loads: number;

  function withFakePlayer(s: SoundService) {
    s.loader = () => {
      loads++;
      return Promise.resolve(player);
    };
    return s;
  }

  /** Lets the engine promise settle. */
  const settle = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(() => {
    localStorage.clear();
    player = new FakePlayer();
    loads = 0;
    service = withFakePlayer(new SoundService());
  });

  afterEach(() => localStorage.clear());

  it('starts on the chimes, with sound on', () => {
    expect(service.choiceValue).toBe('chimes');
    expect(service.enabledValue).toBe(true);
  });

  it('keeps sound off for a child who had switched it off with the old switch', () => {
    localStorage.setItem('soundEnabled', 'false');
    expect(new SoundService().choiceValue).toBe('off');
  });

  it('reads a stored choice, and ignores one it does not know', () => {
    localStorage.setItem('soundSet', 'bubbles');
    expect(new SoundService().choiceValue).toBe('bubbles');
    localStorage.setItem('soundSet', 'kazoo');
    expect(new SoundService().choiceValue).toBe('chimes');
  });

  it('remembers what is picked, and publishes it', async () => {
    const seen: SoundChoice[] = [];
    const enabled: boolean[] = [];
    service.choice$().subscribe(choice => seen.push(choice));
    service.isEnabled().subscribe(on => enabled.push(on));

    service.choose('space');
    service.choose('off');

    expect(seen).toEqual(['chimes', 'space', 'off']);
    expect(enabled).toEqual([true, true, false]);
    expect(localStorage.getItem('soundSet')).toBe('off');
    expect(new SoundService().choiceValue).toBe('off');
  });

  it('plays a set when it is picked, so picking is listening', async () => {
    service.choose('marimba');
    await settle();
    expect(player.played).toEqual([['marimba', 'correct', 0]]);
  });

  it('plays nothing when "no sound" is picked', async () => {
    service.choose('off');
    await settle();
    expect(player.played).toEqual([]);
  });

  it('plays each moment of the game in the chosen set', async () => {
    service.choose('retro');
    await settle();
    player.played = [];

    service.playSuccess();
    service.playError();
    service.playTap();
    service.playStar(2);
    service.playRoundDone();
    await settle();

    expect(player.played).toEqual([
      ['retro', 'correct', 0], ['retro', 'tryAgain', 0], ['retro', 'tap', 0], ['retro', 'star', 2], ['retro', 'roundDone', 0]
    ]);
  });

  it('makes no sound, and does not even fetch the sounds, when there is no sound', async () => {
    localStorage.setItem('soundSet', 'off');
    const quiet = withFakePlayer(new SoundService());
    quiet.playSuccess();
    quiet.playTap();
    await settle();
    expect(player.played).toEqual([]);
    expect(loads).toBe(0);
  });

  it('fetches the sounds once, however many are played', async () => {
    service.playSuccess();
    service.playSuccess();
    await service.preload();
    await settle();
    expect(loads).toBe(1);
    expect(player.played.length).toBe(2);
  });

  it('stays quiet rather than breaking when the sounds cannot be fetched, and tries again next time', async () => {
    let fail = true;
    service.loader = () => {
      loads++;
      return fail ? Promise.reject(new Error('offline')) : Promise.resolve(player);
    };
    expect(await service.preload()).toBe(false);
    fail = false;
    service.playSuccess();
    await settle();
    expect(loads).toBe(2);
    expect(player.played).toEqual([['chimes', 'correct', 0]]);
  });

  it('does not vibrate while there is no sound', () => {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    const original = nav.vibrate;
    const calls: Array<number | number[]> = [];
    nav.vibrate = (pattern: number | number[]) => {
      calls.push(pattern);
      return true;
    };

    service.choose('off');
    calls.length = 0;
    service.vibrate(50);
    expect(calls.length).toBe(0);

    service.choose('bubbles');
    expect(calls).toEqual([15]); // the tap of picking is felt
    calls.length = 0;
    service.vibrate(50);
    expect(calls).toEqual([50]);

    nav.vibrate = original;
  });
});
