import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarService } from '../services/avatar.service';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { findEvent, nextOpening } from '../events/seasonal-events';
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
  itemsForSlot,
  nextUnlock
} from './avatar-model';
import { BODY_ROW, ChooserRow, SECTIONS, SectionId } from './chooser-sections';
import { CHOOSER_WORDS } from './chooser-words';

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
export class AvatarChooserComponent implements OnInit {
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
    hairColour: HAIR_COLOURS
  };
  level = 1;
  nextReward?: WardrobeItem;
  earnedEvents: string[] = [];

  constructor(
    private avatarService: AvatarService,
    private progressService: ProgressService,
    private router: Router,
    public languageService: LanguageService
  ) {
    languageService.extend(CHOOSER_WORDS);
  }

  ngOnInit() {
    this.avatar = { ...this.avatarService.get() };
    this.level = levelForXp(this.progressService.getXp());
    this.earnedEvents = this.progressService.getEarnedEvents();
    this.nextReward = nextUnlock(this.level);
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

  /** A bare character, so an item's own swatch is not lost under a hat. */
  isEmpty(item: WardrobeItem): boolean {
    return item.id === NO_ITEM;
  }

  /** Saved on every tap: a child should never lose a choice to a missed button. */
  choose(part: keyof Avatar, value: string) {
    this.avatar = { ...this.avatar, [part]: value } as Avatar;
    this.avatarService.save(this.avatar);
  }

  done() {
    this.router.navigate(['/grade']);
  }
}
