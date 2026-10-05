import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarService } from '../services/avatar.service';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { TOP_COLOURS, ownTopColour } from './top-colours';

/** What each family looks like on its swatch. */
const FAMILY_ICONS: { [family in Family]: string } = { kid: '🧒', creature: '🐲', robot: '🤖', animal: '🐻', space: '👽', pizza: '🍕' };
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { CELEBRATION_MS, evolvedFrom } from './evolution';

import { levelForXp } from '../levels/level-curve';
import {
  BODY_TYPES,
  Avatar,
  EYE_COLOURS,
  EYE_SHAPES,
  FACE_SHAPES,
  HAIR_COLOURS,
  HAIR_STYLES,
  HAIR_TEXTURES,
  ItemSlot,
  MOUTH_SHAPES,
  NO_ITEM,
  SKIN_TONES,
  WardrobeItem,
  isUnlocked,
  FAMILIES,
  Family,
  TIER_STARTS,
  stageForLevel
} from './avatar-model';
import { BODY_ROW, ChooserRow, EARNED_SECTIONS, SECTIONS, SectionId } from './chooser-sections';
import { ICON_SLOTS, itemIcon } from './item-icons';
import { CHOOSER_WORDS } from './chooser-words';
import { findEvent, nextOpening } from '../events/next-opening';
import { itemsForSlot, nextUnlock } from './wardrobe-lookups';

const LABEL_ICONS: { [value: string]: string } = { boy: '👦', girl: '👧' };

/**
 * Where a child makes the character theirs. Every choice here is free and
 * always has been: research on children's avatars finds that the act of
 * customising is what builds identification with the character, and that skin
 * tone, hair and eyes are what they reach for first. Putting any of that
 * behind a level would mean a child has to earn the right to look like
 * themselves. Clothes are what levels will unlock.
 */
@Component({
  selector: 'app-avatar-chooser',
  templateUrl: './avatar-chooser.component.html',
  styleUrls: ['./avatar-chooser.component.css']
})
export class AvatarChooserComponent implements OnInit, OnDestroy {
  avatar!: Avatar;
  readonly sections = SECTIONS;
  /** The section on screen. The face first: it is what says who this is. */
  open: SectionId = 'face';

  /** What each row of choices offers, looked up by the part it changes. */
  private readonly options: { [part: string]: string[] } = {
    bodyType: BODY_TYPES,
    skin: SKIN_TONES,
    faceShape: FACE_SHAPES,
    eyeShape: EYE_SHAPES,
    eyeColour: EYE_COLOURS,
    mouthShape: MOUTH_SHAPES,
    hairStyle: HAIR_STYLES,
    hairTexture: HAIR_TEXTURES,
    hairColour: HAIR_COLOURS,
    // '' is the top's own colour, first
    topColour: ['', ...TOP_COLOURS]
  };
  level = 1;
  nextReward?: WardrobeItem;
  earnedEvents: string[] = [];
  /** The stage the character grew from since the child last looked: the stage plays the evolution from it. */
  evolveFrom: number | null = null;
  /** Whether the words and sparkles of an evolution are up. */
  celebrating = false;
  private celebration?: ReturnType<typeof setTimeout>;

  constructor(
    private avatarService: AvatarService,
    private progressService: ProgressService,
    private router: Router,
    public languageService: LanguageService,
    private soundService: SoundService
  ) {
    languageService.extend(CHOOSER_WORDS);
  }

  ngOnInit() {
    // As the child is now: a level gained since it was last read can mean a new stage
    this.avatarService.refresh();
    this.avatar = { ...this.avatarService.get() };
    this.level = levelForXp(this.progressService.getXp());
    this.earnedEvents = this.progressService.getEarnedEvents();
    this.nextReward = nextUnlock(this.level);
    // Grown since last time: once, now, about three seconds of it
    this.evolveFrom = evolvedFrom(this.avatar, stageForLevel(this.level));
    if (this.evolveFrom !== null) {
      this.celebrating = true;
      this.soundService.playRoundDone();
      this.celebration = setTimeout(() => (this.celebrating = false), CELEBRATION_MS);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.celebration);
  }

  /**
   * Locked items are shown rather than hidden. A goal you can see is what
   * makes the next level worth climbing to; a goal you cannot see is not a
   * goal at all.
   */
  canWear(item: WardrobeItem): boolean {
    return isUnlocked(item, this.level, this.earnedEvents);
  }

  /**
   * What a locked event item says: when it comes back, never how long is
   * left. A child who missed one has lost nothing, and should not be told
   * otherwise.
   */
  returnsOn(item: WardrobeItem): string {
    const event = item.event ? findEvent(item.event) : undefined;
    if (!event) {
      return '';
    }
    return nextOpening(event, new Date())
      .toLocaleDateString(undefined, { month: 'long' });
  }

  /** The section a child is looking at. */
  show(id: SectionId) {
    this.open = id;
  }

  /** Whether the section open is one with things to earn: the whole character is shown, and what comes next. */
  get earned(): boolean {
    return EARNED_SECTIONS.indexOf(this.open) >= 0;
  }

  get rows(): ChooserRow[] {
    const section = SECTIONS.find(entry => entry.id === this.open);
    return section ? section.rows : [];
  }

  /** The choices in a row: colours and shapes for a part, items for a slot. */
  choicesFor(row: ChooserRow): string[] {
    return row.part ? this.options[row.part] || [] : [];
  }

  itemsFor(row: ChooserRow): WardrobeItem[] {
    return row.slot ? itemsForSlot(row.slot) : [];
  }

  /** A colour swatch's colour: the value, or for a top's own colour (''), that colour. */
  swatchColour(value: string): string {
    return value || ownTopColour(this.avatar);
  }

  /** What a colour swatch says to a screen reader: the row, and for '' that it is the top's own. */
  swatchLabel(row: ChooserRow, value: string): string {
    const heading = this.languageService.translate(row.heading);
    return value ? heading : `${heading} — ${this.languageService.translate('own-colour' as TranslationKeys)}`;
  }

  /** True where the swatch shows a colour rather than drawing a character. */
  isColour(row: ChooserRow): boolean {
    return !row.shape;
  }

  chosen(row: ChooserRow, value: string): boolean {
    return !!row.part && this.avatar[row.part] === value;
  }

  /** The character as it would look with this one part changed. */
  withPart(row: ChooserRow, value: string): Avatar {
    return row.part ? ({ ...this.avatar, [row.part]: value } as Avatar) : this.avatar;
  }

  readonly bodyRow = BODY_ROW;

  /** The picture beside a word-only choice. */
  labelIcon(value: string): string {
    return LABEL_ICONS[value] || '';
  }

  /** Hair texture only reads at all on the head, so its swatches show one. */
  framingForRow(row: ChooserRow): 'portrait' | 'full' {
    return row.slot === 'top' ? 'full' : 'portrait';
  }

  pickPart(row: ChooserRow, value: string) {
    if (row.part) {
      this.choose(row.part, value);
    }
  }

  wearing(slot: ItemSlot): string {
    return this.avatar[slot];
  }

  /** Clothes need the shoulders to be visible; hats and glasses do not. */
  framingFor(slot: ItemSlot): 'portrait' | 'full' {
    return slot === 'top' ? 'full' : 'portrait';
  }

  wear(slot: ItemSlot, item: WardrobeItem) {
    if (!this.canWear(item)) {
      return;
    }
    this.choose(slot, item.id);
  }

  /** The character as it would look wearing this, for the swatches. */
  withItem(slot: ItemSlot, item: WardrobeItem): Avatar {
    return { ...this.avatar, [slot]: item.id } as Avatar;
  }

  itemName(item: WardrobeItem): string {
    return this.languageService.translate(('item-' + item.id) as TranslationKeys);
  }

  /** What a locked swatch tells a screen reader: the item, and its price. */
  itemLabel(item: WardrobeItem): string {
    if (this.canWear(item)) {
      return this.itemName(item);
    }
    if (item.event) {
      return `${this.itemName(item)} — ${this.languageService.translate('back-in')} ${this.returnsOn(item)}`;
    }
    return `${this.itemName(item)} — ${this.languageService.translate('level')} ${item.unlockLevel}`;
  }

  /** Whether a row's swatches are the things themselves: pets, and what goes on the back (see ITEM_ICONS). */
  iconRow(row: ChooserRow): boolean {
    return !!row.slot && ICON_SLOTS.indexOf(row.slot) >= 0;
  }

  /** Such a swatch: the thing by itself. */
  icon(item: WardrobeItem): string {
    return itemIcon(item);
  }

  /** A bare character, so an item's own swatch is not lost under a hat. */
  isEmpty(item: WardrobeItem): boolean {
    return item.id === NO_ITEM;
  }

  readonly families = FAMILIES;
  readonly stages = [1, 2, 3];

  /** The kid hero has a face, hair and a wardrobe to choose; the other families grow instead. */
  get isKid(): boolean {
    return this.avatar.family === 'kid';
  }

  familyIcon(family: Family): string {
    return FAMILY_ICONS[family];
  }

  /** A family picked is seen as it is now: nothing to celebrate the next time. */
  pickFamily(family: Family) {
    this.choose('family', family);
    evolvedFrom(this.avatar, stageForLevel(this.level));
  }

  /** Whether the child has climbed far enough for this stage. */
  stageReached(stage: number): boolean {
    return stage <= stageForLevel(this.level);
  }

  /** The level a stage is reached at: the start of its tier (tier 3 for stage 2, tier 4 for stage 3). */
  stageLevel(stage: number): number {
    return stage === 1 ? 1 : TIER_STARTS[stage];
  }

  /**
   * Any stage reached can be picked: the newest follows the child as they
   * climb, an earlier one stays until they choose again. One not reached is
   * never kept (normaliseAvatar), and its button is disabled anyway.
   */
  pickStage(stage: number) {
    this.avatarService.save({ ...this.avatar, stage, stagePinned: stage < stageForLevel(this.level) });
    this.avatar = { ...this.avatarService.get() };
  }

  /** Saved on every tap: a child should never lose a choice to a missed button. */
  choose(part: keyof Avatar, value: string) {
    this.avatarService.save({ ...this.avatar, [part]: value } as Avatar);
    // As saved: a new family starts at the stage the child has reached
    this.avatar = { ...this.avatarService.get() };
  }

  done() {
    this.router.navigate(['/grade']);
  }
}
