import {
  AfterViewInit, Component, ElementRef, EventEmitter, HostListener, OnDestroy, Output, QueryList, ViewChildren
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Language, LanguageService } from '../services/language.service';
import { SoundService } from '../services/sound.service';
import { SOUND_SET_IDS, SoundChoice } from './sound-choice';
import { SOUND_SETS } from './sound-sets';

/**
 * The picker's own words. They live here, in the picker's lazy chunk, and
 * not in the language service, because everything in the language service
 * is in the first load and this panel is not.
 */
export const PICKER_WORDS: { [lang in Language]: { [key: string]: string } } = {
  en: {
    title: 'Pick your sounds', hint: 'Tap one to hear it', close: 'Close',
    chimes: 'Chimes', marimba: 'Marimba', retro: 'Retro', bubbles: 'Bubbles', space: 'Space', off: 'No sound'
  },
  nl: {
    title: 'Kies je geluiden', hint: 'Tik erop om het te horen', close: 'Sluiten',
    chimes: 'Belletjes', marimba: 'Marimba', retro: 'Retro', bubbles: 'Bubbels', space: 'Ruimte', off: 'Geen geluid'
  },
  es: {
    title: 'Elige tus sonidos', hint: 'Tócalo para escucharlo', close: 'Cerrar',
    chimes: 'Campanitas', marimba: 'Marimba', retro: 'Retro', bubbles: 'Burbujas', space: 'Espacio', off: 'Sin sonido'
  }
};

export interface PickerOption {
  choice: SoundChoice;
  icon: string;
}

/** Every set, in order, then none. */
export const PICKER_OPTIONS: PickerOption[] = [
  ...SOUND_SET_IDS.map(id => ({ choice: id as SoundChoice, icon: SOUND_SETS.find(set => set.id === id)!.icon })),
  { choice: 'off', icon: '🔇' }
];

/**
 * A panel over whatever screen the child is on, opened from the sound button
 * in the header. It does not take the child anywhere: a round in progress is
 * still there, untouched, when it closes. Tapping a set picks it and plays
 * it, so choosing is listening.
 */
@Component({
  selector: 'app-sound-picker',
  templateUrl: './sound-picker.component.html',
  styleUrls: ['./sound-picker.component.css']
})
export class SoundPickerComponent implements AfterViewInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @ViewChildren('option') optionButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly options = PICKER_OPTIONS;
  chosen: SoundChoice;
  /** The option that has just been tapped, for its little bounce. */
  played: SoundChoice | null = null;
  private subscription: Subscription;

  constructor(private sound: SoundService, private language: LanguageService) {
    this.chosen = sound.choiceValue;
    this.subscription = sound.choice$().subscribe(choice => this.chosen = choice);
  }

  ngAfterViewInit() {
    // Focus lands on what is picked now, so a keyboard starts from there
    const index = this.options.findIndex(option => option.choice === this.chosen);
    this.optionButtons.toArray()[Math.max(index, 0)]?.nativeElement.focus();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  words(key: string): string {
    const table = PICKER_WORDS[this.language.getLanguage()] || PICKER_WORDS.en;
    return table[key] || PICKER_WORDS.en[key];
  }

  pick(choice: SoundChoice) {
    this.sound.choose(choice);
    this.played = null;
    // Next frame, so picking the same one twice bounces twice
    requestAnimationFrame(() => this.played = choice);
  }

  @HostListener('document:keydown.escape')
  close() {
    this.closed.emit();
  }

  /** Arrow keys move round the options, as in any group of choices. */
  move(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const buttons = this.optionButtons.toArray();
    buttons[(index + step + buttons.length) % buttons.length].nativeElement.focus();
  }
}
