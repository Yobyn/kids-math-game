import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { lastGrade } from '../levels/difficulty-tuner';
import { suggestGrade } from '../levels/grade-tuner';
import { AvatarService } from '../services/avatar.service';
import { Avatar } from '../avatar/avatar-model';

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

  /**
   * The grade to try next, when several rounds at the top rung of this one
   * have gone well. Marked, never chosen for them — the same rule the
   * difficulty screen follows.
   */
  suggestedGrade?: number;

  /** Drawn on the way in, so the button looks like the thing it opens. */
  avatar!: Avatar;

  constructor(
    private router: Router,
    private progressService: ProgressService,
    private avatarService: AvatarService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.avatar = this.avatarService.get();
    const history = this.progressService.getHistory();
    this.carryOnGrade = lastGrade(history);
    if (this.carryOnGrade) {
      this.suggestedGrade = suggestGrade(history, this.carryOnGrade);
    }
  }

  get carryOnLabel(): string {
    return this.languageService.translate('carry-on')
      .replace('{grade}', `${this.languageService.translate('grade')} ${this.carryOnGrade}`);
  }

  openCharacter() {
    this.router.navigate(['/avatar']);
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
