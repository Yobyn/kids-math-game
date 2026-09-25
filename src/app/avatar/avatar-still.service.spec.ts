import { TestBed } from '@angular/core/testing';
import { Avatar, defaultAvatar } from './avatar-model';
import { keepStill } from './still-queue';
import {
  AvatarStillService,
  MAX_STORED_STILLS,
  STILL_STORE_KEY,
  STILL_VERSION,
  StillMaker,
  stillBox,
  stillKey
} from './avatar-still.service';

/** Any hat will do as a name: the stand-in renderer only writes it down. */
function withHat(hat: string): Avatar {
  return { ...defaultAvatar(), hat } as Avatar;
}

describe('stillBox and stillKey', () => {
  it('makes a full still taller than wide, and a portrait square', () => {
    expect(stillBox('portrait', 100, 1)).toEqual([100, 100]);
    expect(stillBox('full', 100, 1)).toEqual([100, 132]);
  });

  it('draws for sharp screens, but never more than twice over', () => {
    expect(stillBox('portrait', 50, 2)).toEqual([100, 100]);
    expect(stillBox('portrait', 50, 3)).toEqual([100, 100]);
    expect(stillBox('portrait', 50, 0.5)).toEqual([50, 50]);
    expect(stillBox('portrait', 50, 0)).toEqual([50, 50]);
  });

  it('gives the same character the same key whatever order its fields were set in', () => {
    const a = defaultAvatar();
    const reversed = Object.keys(a).reverse().reduce((out, key) => ({ ...out, [key]: (a as any)[key] }), {}) as typeof a;
    expect(stillKey(reversed, 'portrait', 10, 10)).toBe(stillKey(a, 'portrait', 10, 10));
  });

  it('tells apart characters, framings, sizes and versions of the look', () => {
    const a = defaultAvatar();
    const key = stillKey(a, 'portrait', 10, 10);
    expect(stillKey({ ...a, hat: 'cap' }, 'portrait', 10, 10)).not.toBe(key);
    expect(stillKey(a, 'full', 10, 10)).not.toBe(key);
    expect(stillKey(a, 'portrait', 20, 10)).not.toBe(key);
    expect(stillKey(a, 'portrait', 10, 20)).not.toBe(key);
    expect(key.startsWith(`${STILL_VERSION}|`)).toBeTrue();
  });
});

describe('AvatarStillService', () => {
  let service: AvatarStillService;
  let drawn: string[];
  let maker: StillMaker;

  beforeEach(() => {
    localStorage.removeItem(STILL_STORE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarStillService);
    service.enabled = true;
    drawn = [];
    maker = {
      render: (avatar, framing, width, height) => {
        drawn.push(`${avatar.hat}:${framing}:${width}x${height}`);
        return `data:image/png;base64,${avatar.hat}-${framing}`;
      }
    };
    service.loader = () => Promise.resolve(maker);
  });

  afterEach(() => localStorage.removeItem(STILL_STORE_KEY));

  function stored(): { [key: string]: string } {
    return JSON.parse(localStorage.getItem(STILL_STORE_KEY) || '{}');
  }

  it('is off by default in the unit tests of other screens', () => {
    expect(AvatarStillService.enabledByDefault).toBeFalse();
  });

  it('makes a still, and keeps it for next time', async () => {
    const avatar = withHat('cap');
    expect(service.cached(avatar, 'portrait', 40)).toBeNull();
    const url = await service.still(avatar, 'portrait', 40);
    expect(url).toBe('data:image/png;base64,cap-portrait');
    expect(service.cached(avatar, 'portrait', 40)).toBe(url);
    expect(Object.values(stored())).toEqual([url!]);
  });

  it('shows a kept still without fetching the renderer at all', async () => {
    const avatar = defaultAvatar();
    localStorage.setItem(STILL_STORE_KEY, JSON.stringify({ [service.keyFor(avatar, 'full', 40)]: 'data:kept' }));
    const loader = spyOn(service, 'loader').and.callThrough();
    expect(service.cached(avatar, 'full', 40)).toBe('data:kept');
    expect(await service.still(avatar, 'full', 40)).toBe('data:kept');
    expect(loader).not.toHaveBeenCalled();
  });

  it('draws the same character once, however often it is asked for', async () => {
    const avatar = defaultAvatar();
    const [a, b] = await Promise.all([service.still(avatar, 'portrait', 40), service.still({ ...avatar }, 'portrait', 40)]);
    expect(a).toBe(b);
    expect(drawn.length).toBe(1);
  });

  it('fetches the renderer once for all its pictures', async () => {
    const loader = spyOn(service, 'loader').and.callThrough();
    await Promise.all(['cap', 'beanie', 'crown'].map(hat => service.still(withHat(hat), 'portrait', 40)));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(drawn.length).toBe(3);
  });

  it('keeps the 2D drawing when the code that makes pictures cannot be fetched', async () => {
    service.queueLoader = () => Promise.reject(new Error('offline'));
    const loader = spyOn(service, 'loader').and.callThrough();
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it('answers null where there is no WebGL, and does not ask again this visit', async () => {
    const loader = spyOn(service, 'loader').and.returnValue(Promise.resolve(null));
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(stored()).toEqual({});
  });

  it('answers null when the renderer cannot be fetched, or fails to draw', async () => {
    service.loader = () => Promise.reject(new Error('offline'));
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();

    const fresh = new AvatarStillService();
    fresh.enabled = true;
    fresh.loader = () => Promise.resolve({ render: () => { throw new Error('lost context'); } });
    expect(await fresh.still(defaultAvatar(), 'portrait', 40)).toBeNull();
  });

  it('keeps going after a still that could not be made', async () => {
    let fail = true;
    service.loader = () => Promise.resolve({
      render: (avatar, framing) => {
        if (fail) {
          fail = false;
          throw new Error('once');
        }
        return `data:${avatar.hat}-${framing}`;
      }
    });
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(await service.still(withHat('cap'), 'portrait', 40)).toBe('data:cap-portrait');
  });

  it('does nothing at all when turned off', async () => {
    service.enabled = false;
    const loader = spyOn(service, 'loader').and.callThrough();
    localStorage.setItem(STILL_STORE_KEY, JSON.stringify({ [service.keyFor(defaultAvatar(), 'portrait', 40)]: 'data:kept' }));
    expect(service.cached(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(await service.still(defaultAvatar(), 'portrait', 40)).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it(`keeps only the ${MAX_STORED_STILLS} newest stills`, async () => {
    const hats = Array.from({ length: MAX_STORED_STILLS + 3 }, (_, i) => `hat${i}`);
    for (const hat of hats) {
      await service.still(withHat(hat), 'portrait', 40);
    }
    const kept = Object.values(stored());
    expect(kept.length).toBe(MAX_STORED_STILLS);
    expect(kept).toEqual(hats.slice(3).map(hat => `data:image/png;base64,${hat}-portrait`));
  });

  it('keeps fewer stills when the browser is short of room, never failing', async () => {
    for (const hat of ['a', 'b', 'c']) {
      await service.still(withHat(hat), 'portrait', 40);
    }
    const setItem = localStorage.setItem.bind(localStorage);
    let refusals = 2;
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      if (refusals-- > 0) {
        throw new Error('QuotaExceededError');
      }
      setItem(key, value);
    });
    expect(await service.still(withHat('d'), 'portrait', 40)).toBe('data:image/png;base64,d-portrait');
    expect(Object.values(stored())).toEqual(['data:image/png;base64,c-portrait', 'data:image/png;base64,d-portrait']);
  });

  it('starts afresh over a store it cannot read, and keeps the new picture', async () => {
    for (const junk of ['not json', '[1,2]', 'null']) {
      localStorage.setItem(STILL_STORE_KEY, junk);
      expect(service.cached(withHat(junk), 'portrait', 40)).toBeNull();
      const url = await service.still(withHat(junk), 'portrait', 40);
      expect(service.cached(withHat(junk), 'portrait', 40)).toBe(url);
      expect(Object.values(stored())).toEqual([url!]);
    }
  });
});

describe('keepStill', () => {
  beforeEach(() => localStorage.removeItem(STILL_STORE_KEY));
  afterEach(() => localStorage.removeItem(STILL_STORE_KEY));

  it('counts a picture kept again as the newest, so it is the last to go', () => {
    keepStill('a', 'data:a');
    keepStill('b', 'data:b');
    keepStill('a', 'data:a2');
    expect(Object.keys(JSON.parse(localStorage.getItem(STILL_STORE_KEY)!))).toEqual(['b', 'a']);
    for (let i = 0; i < MAX_STORED_STILLS - 1; i++) {
      keepStill(`n${i}`, 'data:n');
    }
    const kept = JSON.parse(localStorage.getItem(STILL_STORE_KEY)!);
    expect(kept.a).toBe('data:a2');
    expect(kept.b).toBeUndefined();
  });
});
