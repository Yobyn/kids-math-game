import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { Keepsake, scrapbookOf } from './scrapbook';
import { Avatar, WardrobeItem, findItem } from '../avatar/avatar-model';
import { AvatarService } from '../services/avatar.service';
import { SCRAPBOOK_WORDS } from './scrapbook-words';

/**
 * What the child has done, in the order it happened.
 *
 * There is nothing to complete here and no count of what is left — see the
 * note in scrapbook.ts. It is a record, not a checklist.
 */
@Component({
  selector: 'app-scrapbook',
  templateUrl: './scrapbook.component.html',
  styleUrls: ['./scrapbook.component.css']
})
export class ScrapbookComponent implements OnInit {
  entries: Keepsake[] = [];
  private avatar!: Avatar;

  constructor(
    private progressService: ProgressService,
    private avatarService: AvatarService,
    private router: Router,
    public languageService: LanguageService
  ) {
    languageService.extend(SCRAPBOOK_WORDS);
  }

  ngOnInit() {
    this.avatar = this.avatarService.get();
    this.entries = scrapbookOf({
      events: this.progressService.getEventRecord(),
      items: this.progressService.getKeepsakes(),
      history: this.progressService.getHistory()
    });
  }

  get isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /** The item an entry is about, so its own picture can be drawn. */
  item(entry: Keepsake): WardrobeItem | undefined {
    return entry.kind === 'item' ? findItem2(entry.id) : undefined;
  }

  /**
   * The child's own character wearing the thing they won, rather than the
   * item floating on its own — it is their record, so it is them in it.
   */
  avatarWearing(entry: Keepsake): Avatar {
    const item = this.item(entry);
    return item ? ({ ...this.avatar, [item.slot]: item.id } as Avatar) : this.avatar;
  }

  /** Clothes need the shoulders; hats and glasses do not. */
  framingFor(entry: Keepsake): 'portrait' | 'full' {
    const item = this.item(entry);
    return item && item.slot === 'top' ? 'full' : 'portrait';
  }

  /** A mark for the entries that are not a thing you can wear. */
  mark(entry: Keepsake): string {
    if (entry.kind === 'best') {
      return '\u2b50';
    }
    return entry.kind === 'first' ? '\u{1f3c1}' : '\u{1f381}';
  }

  /** What the entry says, in the child's language. */
  title(entry: Keepsake): string {
    switch (entry.kind) {
      case 'event':
        return this.languageService.translate(('event-' + entry.id) as TranslationKeys);
      case 'item':
        return this.languageService.translate(('item-' + entry.id) as TranslationKeys);
      case 'best':
        return this.languageService.translate('book-best')
          .replace('{percent}', String(entry.value || 0));
      default:
        return this.languageService.translate('book-first');
    }
  }

  /**
   * One line about what kind of thing it was, for the entries that ARE a
   * thing. A best round is not something you won, and the first line of a
   * book is not either — both read as nonsense with "You won this" under
   * them, which is exactly how they read until a browser showed it.
   */
  note(entry: Keepsake): string {
    if (entry.kind === 'event') {
      return this.languageService.translate('book-from-event');
    }
    return entry.kind === 'item' ? this.languageService.translate('book-won') : '';
  }

  /**
   * The day, or a plain admission that it was never written down. A made-up
   * date in a book of what really happened is worse than an honest gap.
   */
  when(entry: Keepsake): string {
    if (!entry.date) {
      return this.languageService.translate('book-long-ago');
    }
    return new Date(entry.date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  back() {
    this.router.navigate(['/progress']);
  }
}

/** Looks an item up in whichever slot it lives in. */
function findItem2(id: string): WardrobeItem | undefined {
  return findItem('hat', id) || findItem('glasses', id) || findItem('top', id);
}
