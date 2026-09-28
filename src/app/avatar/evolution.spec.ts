import { Avatar, defaultAvatar } from './avatar-model';
import { CELEBRATION_MS, FAMILIES_THAT_GROW, evolvedFrom } from './evolution';

function dragon(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'creature', stage, ...extra };
}

describe('evolvedFrom: what the character grew from since the child last looked', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('lasts as long as the stage plays it', () => {
    expect(CELEBRATION_MS).toBe(3000);
    expect(FAMILIES_THAT_GROW).toEqual(['kid', 'creature']);
  });

  it('has nothing to celebrate on the first look, and remembers it', () => {
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
    expect(JSON.parse(localStorage.getItem('evolution-seen:guest')!)).toEqual({ creature: 2 });
  });

  it('says the stage it grew from once, then nothing until it grows again', () => {
    evolvedFrom(dragon(1), 1);
    expect(evolvedFrom(dragon(2), 2)).toBe(1);
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
    // Two stages in one go: from where it was last seen
    localStorage.setItem('evolution-seen:guest', JSON.stringify({ creature: 1 }));
    expect(evolvedFrom(dragon(3), 3)).toBe(1);
    expect(evolvedFrom(dragon(3), 3)).toBeNull();
  });

  it('does not celebrate a stage the child has chosen to leave, but notes that it was reached', () => {
    evolvedFrom(dragon(1), 1);
    expect(evolvedFrom(dragon(1, { stagePinned: true }), 2)).toBeNull();
    expect(JSON.parse(localStorage.getItem('evolution-seen:guest')!)).toEqual({ creature: 2 });
  });

  it('never celebrates going down, or staying put', () => {
    localStorage.setItem('evolution-seen:guest', JSON.stringify({ creature: 3 }));
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
  });

  it('celebrates the kid hero growing into new gear, like a dragon', () => {
    expect(evolvedFrom({ ...defaultAvatar(), family: 'kid', stage: 1 }, 1)).toBeNull();
    expect(evolvedFrom({ ...defaultAvatar(), family: 'kid', stage: 2 }, 2)).toBe(1);
  });

  it('leaves alone a family that looks the same at every stage', () => {
    expect(evolvedFrom({ ...defaultAvatar(), family: 'robot' as any, stage: 1 }, 1)).toBeNull();
    expect(evolvedFrom({ ...defaultAvatar(), family: 'robot' as any, stage: 2 }, 2)).toBeNull();
    expect(localStorage.getItem('evolution-seen:guest')).toBeNull();
  });

  it('keeps each family, and each child, apart', () => {
    localStorage.setItem('evolution-seen:guest', JSON.stringify({ other: 1 }));
    evolvedFrom(dragon(1), 1);
    expect(JSON.parse(localStorage.getItem('evolution-seen:guest')!)).toEqual({ other: 1, creature: 1 });
    localStorage.setItem('username', 'sam');
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
    expect(JSON.parse(localStorage.getItem('evolution-seen:user:sam')!)).toEqual({ creature: 2 });
    localStorage.removeItem('username');
    expect(evolvedFrom(dragon(2), 2)).toBe(1);
  });

  it('starts again from what is there when what was stored is not a record of stages', () => {
    ['not json', '[1,2]', 'null', '7'].forEach(junk => {
      localStorage.setItem('evolution-seen:guest', junk);
      expect(evolvedFrom(dragon(2), 2)).withContext(junk).toBeNull();
      expect(JSON.parse(localStorage.getItem('evolution-seen:guest')!)).withContext(junk).toEqual({ creature: 2 });
    });
    // Only a whole stage counts, not something that would pass for one
    [{ creature: 'one' }, { creature: '1' }, { creature: 1.5 }, { creature: null }].forEach(junk => {
      localStorage.setItem('evolution-seen:guest', JSON.stringify(junk));
      expect(evolvedFrom(dragon(2), 2)).withContext(JSON.stringify(junk)).toBeNull();
    });
  });

  it('celebrates nothing, and does not break, without storage', () => {
    localStorage.setItem('evolution-seen:guest', JSON.stringify({ creature: 1 }));
    spyOn(Storage.prototype, 'setItem').and.throwError('full');
    expect(evolvedFrom(dragon(2), 2)).toBeNull();
  });
});
