import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-grade-select',
  templateUrl: './grade-select.component.html',
  styleUrls: ['./grade-select.component.css']
})
export class GradeSelectComponent {
  grades = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    name: `${this.languageService.translate('grade')} ${i + 1}`,
    description: `${this.languageService.translate('mathematics-for')} ${i + 1} ${this.languageService.translate('students')}`,
    icon: '📚'
  }));

  constructor(
    private router: Router,
    public languageService: LanguageService
  ) {}

  /** The grown-ups' screen, which decides for itself whether to open. */
  openAdults() {
    this.router.navigate(['/grown-ups']);
  }

  selectGrade(grade: number) {
    localStorage.setItem('grade', grade.toString());
    this.router.navigate(['/difficulty']);
  }
} 