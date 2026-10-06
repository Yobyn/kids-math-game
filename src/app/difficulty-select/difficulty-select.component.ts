import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Language, LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { Difficulty, lastPlayed, suggestDifficulty, suggestionDirection } from '../levels/difficulty-tuner';
import { Climb, climbs } from './climb';
import { SELECT_WORDS } from '../grade-select/select-words';

type ClimbCard = Climb & { name: string; description: string };

@Component({
  selector: 'app-difficulty-select',
  templateUrl: './difficulty-select.component.html',
  styleUrls: ['./difficulty-select.component.css']
})
export class DifficultySelectComponent implements OnInit {
  /** Three climbs, easiest first: see climb.ts for why they are drawn. */
  get difficulties(): ClimbCard[] {
    const language = this.languageService.getLanguage();
    return this.cards[language] || (this.cards[language] = climbs().map(climb => ({
      ...climb,
      name: this.languageService.translate(`climb-${climb.level}` as TranslationKeys),
      description: this.languageService.translate(`${climb.level}-desc` as TranslationKeys)
    })));
  }

  /** The climbs in each language the child has had on screen, so a switch renames them. */
  private readonly cards: { [language in Language]?: ClimbCard[] } = {};

  /** What recent rounds suggest, if they suggest anything at all. */
  suggested?: Difficulty;
  suggestionReason: 'harder' | 'easier' = 'harder';

  constructor(
    private router: Router,
    private progressService: ProgressService,
    public languageService: LanguageService
  ) {
    languageService.extend(SELECT_WORDS);
  }

  ngOnInit() {
    // Redirect to grade selection if no grade is selected
    if (!localStorage.getItem('grade')) {
      this.router.navigate(['/grade']);
      return;
    }

    this.readSuggestion();
  }

  /**
   * A hint on the screen where the child was already choosing, never a choice
   * made for them. Adapting behind a child's back is the thing that makes
   * adaptive systems feel wrong, so this only ever marks a card.
   */
  private readSuggestion() {
    const grade = Number(localStorage.getItem('grade')) || 1;
    const history = this.progressService.getHistory();
    const current = lastPlayed(history, grade);

    if (!current) {
      return;
    }

    this.suggested = suggestDifficulty(history, grade, current);
    if (this.suggested) {
      this.suggestionReason = suggestionDirection(current, this.suggested);
    }
  }

  selectDifficulty(level: string) {
    localStorage.setItem('difficulty', level);
    this.router.navigate(['/questions']);
  }
} 