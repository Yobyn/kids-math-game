import { AVATAR_CHOICES, Avatar, ITEM_SLOTS, ItemSlot } from './avatar-model';
import {
  BODY_ROW, EARNED_SECTIONS, SECTIONS, allRows, sectionOfPart, sectionOfSlot } from './chooser-sections';

const SLOTS: ItemSlot[] = ITEM_SLOTS;

describe('the character page, in sections', () => {
  it('divides it into four', () => {
    // Eight rows in one column was 1862px at 390 wide — 2.2 screenfuls, and
    // 3.7 with the phone on its side
    expect(SECTIONS.length).toBe(4);
    expect(SECTIONS.map(section => section.id)).toEqual(['face', 'hair', 'wardrobe', 'extras']);
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
      // Boy or girl is the one part asked above the sections
      const reachable = !!sectionOfPart(choice.key) || BODY_ROW.part === choice.key;
      expect(reachable).toBe(true, `${choice.key} has no section`);
    });
    expect(sectionOfPart('bodyType')).toBeUndefined();
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

  it('keeps everything earned in its own sections and nothing earned anywhere else', () => {
    // Identity is free; only the things you wear and have are climbed to.
    // Two sections a child can open without ever meeting a lock.
    SECTIONS.forEach(section => {
      const hasSlots = section.rows.some(row => !!row.slot);
      expect(hasSlots).toBe(EARNED_SECTIONS.indexOf(section.id) >= 0, section.id);
      // The one free row among them colours something worn there
      if (hasSlots) {
        section.rows.filter(row => !row.slot).forEach(row => expect(row.part).toBe('topColour', section.id));
      }
    });
    expect(sectionOfPart('topColour')).toBe('wardrobe');
    // What is worn together, and what the character has besides
    expect(sectionOfSlot('shoes')).toBe('wardrobe');
    expect(sectionOfSlot('back')).toBe('extras');
    expect(sectionOfSlot('pet')).toBe('extras');
  });

  it('answers nothing for a part that does not exist', () => {
    expect(sectionOfPart('nonsense' as keyof Avatar)).toBeUndefined();
    expect(sectionOfSlot('pockets' as ItemSlot)).toBeUndefined();
  });
});
