import { AVATAR_CHOICES, Avatar, ItemSlot } from './avatar-model';
import { SECTIONS, allRows, sectionOfPart, sectionOfSlot } from './chooser-sections';

const SLOTS: ItemSlot[] = ['hat', 'glasses', 'top'];

describe('the character page, in sections', () => {
  it('divides it into three', () => {
    // Eight rows in one column was 1862px at 390 wide — 2.2 screenfuls, and
    // 3.7 with the phone on its side
    expect(SECTIONS.length).toBe(3);
    expect(SECTIONS.map(section => section.id)).toEqual(['face', 'hair', 'wardrobe']);
  });

  it('opens on the face, which is what says who this is', () => {
    expect(SECTIONS[0].id).toBe('face');
  });

  it('keeps every section to a handful of rows', () => {
    SECTIONS.forEach(section => {
      expect(section.rows.length).toBeGreaterThan(0);
      expect(section.rows.length).toBeLessThanOrEqual(5);
    });
  });

  it('puts every part of the character somewhere', () => {
    // The failure this exists for: an axis gets added to the model and
    // nobody can reach it, because no section lists it
    AVATAR_CHOICES.forEach(choice => {
      expect(sectionOfPart(choice.key)).toBeTruthy(`${choice.key} has no section`);
    });
  });

  it('puts every slot somewhere', () => {
    SLOTS.forEach(slot => expect(sectionOfSlot(slot)).toBeTruthy(`${slot} has no section`));
  });

  it('puts nothing in two places at once', () => {
    const rows = allRows();
    const names = rows.map(row => row.part || row.slot);

    expect(new Set(names).size).toBe(names.length);
  });

  it('has nothing in it that is neither a part nor a slot', () => {
    allRows().forEach(row => {
      expect(!!row.part !== !!row.slot).toBe(true, JSON.stringify(row));
    });
  });

  it('gives every row a heading to translate', () => {
    allRows().forEach(row => expect(row.heading).toBeTruthy());
    SECTIONS.forEach(section => expect(section.heading).toBeTruthy());
  });

  it('keeps everything earned in one section and nothing earned anywhere else', () => {
    // Identity is free; only the things you wear are climbed to. Two
    // sections a child can open without ever meeting a lock.
    SECTIONS.forEach(section => {
      const hasSlots = section.rows.some(row => !!row.slot);
      expect(hasSlots).toBe(section.id === 'wardrobe', section.id);
    });
  });

  it('answers nothing for a part that does not exist', () => {
    expect(sectionOfPart('nonsense' as keyof Avatar)).toBeUndefined();
    expect(sectionOfSlot('pockets' as ItemSlot)).toBeUndefined();
  });
});
