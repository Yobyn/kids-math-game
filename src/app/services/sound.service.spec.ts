import { SoundService } from './sound.service';

describe('SoundService', () => {
  let service: SoundService;

  beforeEach(() => {
    localStorage.clear();
    service = new SoundService();
  });

  afterEach(() => localStorage.clear());

  it('is enabled by default', () => {
    expect(service.enabledValue).toBe(true);
  });

  it('publishes the current state to subscribers', () => {
    const seen: boolean[] = [];
    service.isEnabled().subscribe(enabled => seen.push(enabled));

    service.toggle();

    expect(seen).toEqual([true, false]);
  });

  it('stores the choice in localStorage', () => {
    service.toggle();
    expect(localStorage.getItem('soundEnabled')).toBe('false');

    service.toggle();
    expect(localStorage.getItem('soundEnabled')).toBe('true');
  });

  it('reads a stored opt-out on construction', () => {
    localStorage.setItem('soundEnabled', 'false');
    expect(new SoundService().enabledValue).toBe(false);
  });

  it('does not vibrate while muted', () => {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    const original = nav.vibrate;
    const calls: Array<number | number[]> = [];
    nav.vibrate = (pattern: number | number[]) => {
      calls.push(pattern);
      return true;
    };

    service.toggle(); // mute
    calls.length = 0; // ignore the confirmation buzz from toggling
    service.vibrate(50);

    expect(calls.length).toBe(0);

    service.toggle(); // unmute
    calls.length = 0;
    service.vibrate(50);
    expect(calls).toEqual([50]);

    nav.vibrate = original;
  });
});
