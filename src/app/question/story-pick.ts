/**
 * Which story a sum is told as (teaching/school/story.ts): kept with the
 * question, so a saved round and a replay tell the same story again. It
 * lives apart, and small, because a saved round (in the first load) has to
 * read it back; the stories themselves come with the round's chunk.
 */
export interface StoryPick {
  /** The story's template, e.g. 'plus-boom'. */
  id: string;
  /** The names in it, as places in the story's list of names. */
  who: number;
  other: number;
}

/** A story kept in a saved round, or undefined when what is there is not one. */
export function readStory(raw: any): StoryPick | undefined {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !/^[a-z]+(-[a-z]+)*$/.test(raw.id)) {
    return undefined;
  }
  const place = (value: any) => (Number.isInteger(value) && value >= 0 && value < 100 ? value : null);
  const who = place(raw.who);
  const other = place(raw.other);
  return who === null || other === null ? undefined : { id: raw.id, who, other };
}
