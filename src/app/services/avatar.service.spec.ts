import { TestBed } from '@angular/core/testing';
import { AvatarService } from './avatar.service';
import { EYE_COLOURS, HAIR_COLOURS, HATCHLINGS, NO_ITEM, SKIN_TONES, defaultAvatar, hatchlingFor } from '../avatar/avatar-model';
import { GUEST_OWNER, ProgressService } from './progress.service';
import { xpToReach } from '../levels/level-curve';

describe('AvatarService', () => {
  let service: AvatarService;

  function fresh(): AvatarService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(AvatarService);
  }

  beforeEach(() => {
    localStorage.clear();
    service = fresh();
  });

  afterEach(() => localStorage.clear());

  it('gives a child a character before they have chosen anything', () => {
    expect(service.get()).toEqual({ ...defaultAvatar(), hatchling: service.get().hatchling });
    expect(service.hasChosen()).toBe(false);
  });

  describe('the pet the kid hero\u2019s egg hatches into', () => {
    it('is picked for every child, before they have chosen anything', () => {
      expect(HATCHLINGS).toContain(service.get().hatchling);
    });

    it('is the same pet every time the child comes back, and kept once saved', () => {
      const first = service.get().hatchling;
      expect(fresh().get().hatchling).toBe(first);
      service.save({ ...service.get(), hairStyle: 'curly' });
      expect(JSON.parse(localStorage.getItem('avatar:guest')!).hatchling).toBe(first);
      expect(fresh().get().hatchling).toBe(first);
    });

    it('keeps a pet already picked, whoever is playing', () => {
      const other = HATCHLINGS.find(id => id !== service.get().hatchling)!;
      localStorage.setItem('avatar:guest', JSON.stringify({ ...defaultAvatar(), hatchling: other }));
      expect(fresh().get().hatchling).toBe(other);
    });

    it('is random from child to child: every pet comes out of somebody\u2019s egg', () => {
      const picked = new Set<string>();
      for (let i = 0; i < 60; i++) {
        picked.add(hatchlingFor('account:player' + i));
      }
      expect(Array.from(picked).sort()).toEqual(HATCHLINGS.slice().sort());
    });
  });

  it('grows a character with the child, one never chosen too', () => {
    TestBed.inject(ProgressService).addXp(xpToReach(15));
    expect(fresh().get().stage).toBe(3);
    service = fresh();
    service.save({ ...service.get(), family: 'creature' });
    expect(fresh().get().stage).toBe(3);
  });

  it('remembers a choice for the next visit', () => {
    service.save({ ...service.get(), skin: SKIN_TONES[5] });

    expect(fresh().get().skin).toBe(SKIN_TONES[5]);
  });

  it('tells the rest of the app when the character changes', () => {
    const seen: string[] = [];
    service.changes().subscribe(avatar => seen.push(avatar.skin));

    service.save({ ...service.get(), skin: SKIN_TONES[0] });

    expect(seen.length).toBe(2);
    expect(seen[1]).toBe(SKIN_TONES[0]);
  });

  it('refuses to store a choice that was never offered', () => {
    service.save({ ...service.get(), skin: '#ff0000' } as any);

    expect(service.get().skin).not.toBe('#ff0000');
    expect(SKIN_TONES).toContain(service.get().skin);
  });

  it('keeps two children on one tablet looking like themselves', () => {
    service.save({ ...service.get(), hairColour: HAIR_COLOURS[5] });

    localStorage.setItem('username', 'ada');
    const ada = fresh();
    expect(ada.get().hairColour).not.toBe(HAIR_COLOURS[5]);
    ada.save({ ...ada.get(), hairColour: HAIR_COLOURS[0] });

    localStorage.removeItem('username');
    expect(fresh().get().hairColour).toBe(HAIR_COLOURS[5]);
  });

  it('reads a corrupt store as a character never chosen', () => {
    localStorage.setItem('avatar:guest', 'not json');

    expect(fresh().get()).toEqual({ ...defaultAvatar(), hatchling: hatchlingFor(GUEST_OWNER) });
    expect(fresh().hasChosen()).toBe(false);
  });

  it('still draws a character when storage refuses to save', () => {
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    expect(() => service.save({ ...service.get(), eyeColour: EYE_COLOURS[2] })).not.toThrow();
    expect(service.get().eyeColour).toBe(EYE_COLOURS[2]);
  });

  describe('signing up', () => {
    it('carries the character a guest made into their new account', () => {
      service.save({ ...service.get(), skin: SKIN_TONES[4], hairColour: HAIR_COLOURS[5] });

      service.adoptGuestAvatar('ada');

      localStorage.setItem('username', 'ada');
      const ada = fresh();
      expect(ada.get().skin).toBe(SKIN_TONES[4]);
      expect(ada.get().hairColour).toBe(HAIR_COLOURS[5]);
    });

    it('leaves nothing behind for the next guest on the device', () => {
      service.save({ ...service.get(), skin: SKIN_TONES[4] });

      service.adoptGuestAvatar('ada');

      expect(localStorage.getItem('avatar:guest')).toBeNull();
      expect(fresh().get()).toEqual({ ...defaultAvatar(), hatchling: hatchlingFor(GUEST_OWNER) });
    });

    it('does not overwrite a character the account already had', () => {
      localStorage.setItem('username', 'ada');
      fresh().save({ ...defaultAvatar(), skin: SKIN_TONES[0] });

      localStorage.removeItem('username');
      const guest = fresh();
      guest.save({ ...defaultAvatar(), skin: SKIN_TONES[5] });
      guest.adoptGuestAvatar('ada');

      localStorage.setItem('username', 'ada');
      expect(fresh().get().skin).toBe(SKIN_TONES[0]);
    });

    it('does nothing when the guest never chose', () => {
      service.adoptGuestAvatar('ada');

      localStorage.setItem('username', 'ada');
      expect(fresh().hasChosen()).toBe(false);
    });
  });
});

describe('AvatarService and what has been earned', () => {
  let service: AvatarService;
  let progress: ProgressService;

  function fresh(): AvatarService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    progress = TestBed.inject(ProgressService);
    return TestBed.inject(AvatarService);
  }

  beforeEach(() => {
    localStorage.clear();
    service = fresh();
  });

  afterEach(() => localStorage.clear());

  it('will not save an item the child has not earned', () => {
    service.save({ ...service.get(), hat: 'crown' });

    expect(service.get().hat).toBe(NO_ITEM);
  });

  it('saves one they have', () => {
    progress.addXp(xpToReach(2));
    service = fresh();

    service.save({ ...service.get(), hat: 'cap' });

    expect(service.get().hat).toBe('cap');
    expect(fresh().get().hat).toBe('cap');
  });

  it('takes a hat back off if the level it needed is gone', () => {
    // Progress cleared but the character left behind — the crown is not theirs
    localStorage.setItem('avatar:guest', JSON.stringify({ hat: 'crown' }));

    expect(fresh().get().hat).toBe(NO_ITEM);
  });

  it('carries earned items into the account on signup', () => {
    progress.addXp(xpToReach(4));
    service = fresh();
    service.save({ ...service.get(), hat: 'beanie' });

    // The order AuthService uses, and it matters: the experience has to land
    // in the account first, or the beanie is taken off for not being earned
    // by an account that has not yet inherited the level that won it.
    localStorage.setItem('username', 'ada');
    progress.adoptGuestProgress('ada');
    service.adoptGuestAvatar('ada');

    expect(fresh().get().hat).toBe('beanie');
  });

  it('takes the item off if the experience did not come with it', () => {
    progress.addXp(xpToReach(4));
    service = fresh();
    service.save({ ...service.get(), hat: 'beanie' });

    // Avatar moved across without the progress: nothing was earned here
    service.adoptGuestAvatar('ada');
    localStorage.setItem('username', 'ada');

    expect(fresh().get().hat).toBe(NO_ITEM);
  });
});
