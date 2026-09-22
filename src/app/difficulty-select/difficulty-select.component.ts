import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { Difficulty, lastPlayed, suggestDifficulty, suggestionDirection } from '../levels/difficulty-tuner';

@Component({
  selector: 'app-difficulty-select',
  templateUrl: './difficulty-select.component.html',
  styleUrls: ['./difficulty-select.component.css']
})
export class DifficultySelectComponent implements OnInit {
  difficulties = [
    { 
      level: 'easy',
      name: this.languageService.translate('level') + ' 1',
      description: this.languageService.translate('easy-desc'),
      icon: '🌟'
    },
    {
      level: 'medium',
      name: this.languageService.translate('level') + ' 2',
      description: this.languageService.translate('medium-desc'),
      icon: '🌟🌟'
    },
    {
      level: 'hard',
      name: this.languageService.translate('level') + ' 3',
      description: this.languageService.translate('hard-desc'),
      icon: '🌟🌟🌟'
    }
  ];

  /** What recent rounds suggest, if they suggest anything at all. */
  suggested?: Difficulty;
  suggestionReason: 'harder' | 'easier' = 'harder';

  constructor(
    private router: Router,
    private progressService: ProgressService,
    public languageService: LanguageService
  ) {}

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