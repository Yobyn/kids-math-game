import { RoundResult } from '../services/progress.service';
import {
  Keepsake,
  dayOf,
  readEarnedEvents,
  readEarnedItems,
  scrapbookOf
} from './scrapbook';

function round(date: string, percentage: number): RoundResult {
  return { date, correctAnswers: 8, total: 10, percentage, score: 12, grade: 3 };
}

const kinds = (entries: Keepsake[]) => entries.map(entry => entry.kind);
const ids = (entries: Keepsake[]) => entries.map(entry => entry.id);

describe('the book of what happened', () => {
  it('is empty before a child has done anything', () => {
    expect(scrapbookOf({ events: [], items: [], history: [] })).toEqual([]);
    expect(scrapbookOf(null)).toEqual([]);
    expect(scrapbookOf(undefined)).toEqual([]);
  });

  it('remembers an event the child was here for', () => {
    const book = scrapbookOf({
      events: [{ id: 'winter', date: '2026-12-20T10:00:00.000Z' }],
      items: [], history: []
    });

    expect(kinds(book)).toEqual(['event']);
    expect(book[0].date).toBe('2026-12-20');
  });

  it('remembers an item, and which one', () => {
    const book = scrapbookOf({
      events: [],
      items: [{ id: 'crown', date: '2026-09-01T09:00:00.000Z' }],
      history: []
    });

    expect(kinds(book)).toEqual(['item']);
    expect(book[0].id).toBe('crown');
  });

  it('puts the newest thing first', () => {
    const book = scrapbookOf({
      events: [{ id: 'winter', date: '2026-01-02T10:00:00.000Z' }],
      items: [
        { id: 'cap', date: '2026-03-01T10:00:00.000Z' },
        { id: 'crown', date: '2026-08-01T10:00:00.000Z' }
      ],
      history: []
    });

    expect(ids(book)).toEqual(['crown', 'cap', 'winter']);
  });

  it('marks the earliest round it still has, and the best one', () => {
    const book = scrapbookOf({
      events: [], items: [],
      history: [round('2026-05-01T10:00:00.000Z', 60),
                round('2026-02-01T10:00:00.000Z', 90),
                round('2026-06-01T10:00:00.000Z', 70)]
    });

    expect(kinds(book).sort()).toEqual(['best', 'first']);
    const best = book.find(entry => entry.kind === 'best')!;
    expect(best.value).toBe(90);
    expect(best.date).toBe('2026-02-01');
    expect(book.find(entry => entry.kind === 'first')!.date).toBe('2026-02-01');
  });

  it('says nothing about a first or best round before any have been played', () => {
    const book = scrapbookOf({ events: [], items: [], history: [] });

    expect(book.length).toBe(0);
  });

  describe('the dates that were never written down', () => {
    it('keeps the entry and admits it does not know when', () => {
      // A made-up date in a book of what really happened is worse than a gap
      const book = scrapbookOf({
        events: [{ id: 'winter' }], items: [], history: []
      });

      expect(book.length).toBe(1);
      expect(book[0].date).toBeNull();
    });

    it('puts the undated ones last, after everything it can date', () => {
      const book = scrapbookOf({
        events: [{ id: 'winter' }],
        items: [{ id: 'cap', date: '2020-01-01T10:00:00.000Z' }],
        history: []
      });

      expect(ids(book)).toEqual(['cap', 'winter']);
    });

    it('reads a date it cannot parse as no date at all', () => {
      expect(dayOf('not a date')).toBeNull();
      expect(dayOf('')).toBeNull();
      expect(dayOf(null)).toBeNull();
      expect(dayOf(undefined)).toBeNull();
      expect(dayOf(42 as any)).toBeNull();
    });

    it('keeps just the day, so two things on one day sit together', () => {
      expect(dayOf('2026-09-22T23:11:00.000Z')).toBe('2026-09-22');
    });
  });

  it('drops an entry with no id rather than showing a blank', () => {
    const book = scrapbookOf({
      events: [{ id: '' }, null as any],
      items: [undefined as any],
      history: []
    });

    expect(book).toEqual([]);
  });

  it('survives a history full of nonsense', () => {
    const book = scrapbookOf({
      events: [], items: [],
      history: [null as any, { date: 'rubbish' } as any, undefined as any]
    });

    expect(book).toEqual([]);
  });

  it('never counts what is left, because there is nothing to complete', () => {
    const book = scrapbookOf({
      events: [{ id: 'winter' }],
      items: [{ id: 'cap', date: '2026-01-01T00:00:00.000Z' }],
      history: [round('2026-01-01T10:00:00.000Z', 50)]
    });

    book.forEach(entry => {
      expect(entry.kind).not.toBe('remaining');
      // Nothing in an entry says how many there are in all
      expect(Object.keys(entry).sort()).toContain('kind');
    });
  });
});

describe('reading what was stored before dates existed', () => {
  it('reads a bare id as something that happened, with no date', () => {
    // Events used to be a plain list of strings
    expect(readEarnedEvents(['winter', 'spring'])).toEqual([
      { id: 'winter' }, { id: 'spring' }
    ]);
  });

  it('reads the new shape with its date', () => {
    expect(readEarnedEvents([{ id: 'winter', date: '2026-01-01T00:00:00.000Z' }]))
      .toEqual([{ id: 'winter', date: '2026-01-01T00:00:00.000Z' }]);
  });

  it('reads a mixture of both, which is what an upgrade leaves behind', () => {
    const read = readEarnedEvents(['winter', { id: 'spring', date: '2026-03-21T00:00:00.000Z' }]);

    expect(read).toEqual([{ id: 'winter' }, { id: 'spring', date: '2026-03-21T00:00:00.000Z' }]);
  });

  it('never lists the same thing twice', () => {
    const read = readEarnedEvents(['winter', { id: 'winter', date: '2026-01-01T00:00:00.000Z' }]);

    expect(read.length).toBe(1);
    // The first one wins, so a re-earn cannot rewrite history
    expect(read[0]).toEqual({ id: 'winter' });
  });

  it('drops everything that is not an entry at all', () => {
    expect(readEarnedEvents([null, undefined, 42, {}, { date: 'x' }, ''] as any))
      .toEqual([]);
  });

  it('reads a store that is not a list as nothing', () => {
    expect(readEarnedEvents('winter' as any)).toEqual([]);
    expect(readEarnedItems(null as any)).toEqual([]);
    expect(readEarnedItems({ id: 'cap' } as any)).toEqual([]);
  });

  it('keeps a date that is not a string out of the record', () => {
    expect(readEarnedItems([{ id: 'cap', date: 12345 }] as any)).toEqual([{ id: 'cap' }]);
  });
});
