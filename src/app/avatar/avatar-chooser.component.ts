import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarService } from '../services/avatar.service';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { levelForXp } from '../levels/level-curve';
import {
  Avatar,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_STYLES,
  HairStyle,
  ItemSlot,
  NO_ITEM,
  SKIN_TONES,
  WardrobeItem,
  isUnlocked,
  itemsForSlot,
  nextUnlock
} from './avatar-model';

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
  skinTones = SKIN_TONES;
  hairStyles = HAIR_STYLES;
  hairColours = HAIR_COLOURS;
  eyeColours = EYE_COLOURS;
  /** The earned rows, kept as data so the template stays typed. */
  wardrobe: { slot: ItemSlot; heading: TranslationKeys; items: WardrobeItem[] }[] = [
    { slot: 'hat', heading: 'hats', items: itemsForSlot('hat') },
    { slot: 'glasses', heading: 'glasses', items: itemsForSlot('glasses') },
    { slot: 'top', heading: 'tops', items: itemsForSlot('top') }
  ];
  level = 1;
  nextReward?: WardrobeItem;

  constructor(
    private avatarService: AvatarService,
    private progressService: ProgressService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.avatar = { ...this.avatarService.get() };
    this.level = levelForXp(this.progressService.getXp());
    this.nextReward = nextUnlock(this.level);
  }

  /**
   * Locked items are shown rather than hidden. A goal you can see is what
   * makes the next level worth climbing to; a goal you cannot see is not a
   * goal at all.
   */
  canWear(item: WardrobeItem): boolean {
    return isUnlocked(item, this.level);
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

  /** The character as it would look with this hair, for the style swatches. */
  withHair(style: HairStyle): Avatar {
    return { ...this.avatar, hairStyle: style };
  }

  done() {
    this.router.navigate(['/grade']);
  }
}
