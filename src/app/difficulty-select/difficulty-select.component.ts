import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-difficulty-select',
  templateUrl: './difficulty-select.component.html',
  styleUrls: ['./difficulty-select.component.css']
})
export class DifficultySelectComponent {
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

  constructor(
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    // Redirect to grade selection if no grade is selected
    if (!localStorage.getItem('grade')) {
      this.router.navigate(['/grade']);
    }
  }

  selectDifficulty(level: string) {
    localStorage.setItem('difficulty', level);
    this.router.navigate(['/questions']);
  }
} 