import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { lastGrade } from '../levels/difficulty-tuner';

@Component({
  selector: 'app-grade-select',
  templateUrl: './grade-select.component.html',
  styleUrls: ['./grade-select.component.css']
})
export class GradeSelectComponent implements OnInit {
  grades = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    name: `${this.languageService.translate('grade')} ${i + 1}`,
    description: `${this.languageService.translate('mathematics-for')} ${i + 1} ${this.languageService.translate('students')}`,
    icon: '📚'
  }));

  /**
   * The grade the child last played, offered back to them. Ten cards is a
   * lot to put in front of a child who has already answered this question —
   * guidance on children's interfaces lands on three to five options a
   * screen — and on a phone it used to be three screenfuls of scrolling.
   * The full list stays right below it: this offers, it does not decide.
   */
  carryOnGrade?: number;

  constructor(
    private router: Router,
    private progressService: ProgressService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.carryOnGrade = lastGrade(this.progressService.getHistory());
  }

  get carryOnLabel(): string {
    return this.languageService.translate('carry-on')
      .replace('{grade}', `${this.languageService.translate('grade')} ${this.carryOnGrade}`);
  }

  /** The grown-ups' screen, which decides for itself whether to open. */
  openAdults() {
    this.router.navigate(['/grown-ups']);
  }

  selectGrade(grade: number) {
    localStorage.setItem('grade', grade.toString());
    this.router.navigate(['/difficulty']);
  }
}
