import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { lastGrade } from '../levels/difficulty-tuner';
import { suggestGrade } from '../levels/grade-tuner';
import { AvatarService } from '../services/avatar.service';
import { Avatar } from '../avatar/avatar-model';
import {
  QUESTIONS_IN_ROUND,
  RESUME_CHOICE_KEY,
  SavedRound,
  isResumable,
  resumeQuestionNumber
} from '../question/round-state';
import { SavedResult, isUnseen } from '../result/result-state';
import { stepColour } from '../theme/palette';

/** Ten year groups, the ring walked from one end to the other. */
const GRADE_COUNT = 10;

@Component({
  selector: 'app-grade-select',
  templateUrl: './grade-select.component.html',
  styleUrls: ['./grade-select.component.css']
})
export class GradeSelectComponent implements OnInit {
  /**
   * Each grade takes its colour from the particle ring (theme/palette.ts),
   * so the ten read as one journey from the field's blue to its magenta.
   *
   * The description used to be built as "Mathematics for" + the number +
   * "students", which rendered "Maths for 1 students" — counting children
   * instead of naming a year group, and wrong in all three languages.
   */
  grades = Array.from({ length: GRADE_COUNT }, (_, i) => ({
    level: i + 1,
    name: `${this.languageService.translate('grade')} ${i + 1}`,
    description: `${this.languageService.translate('maths-for-grade')} ${i + 1}`,
    colour: stepColour(i + 1, GRADE_COUNT)
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

  /**
   * A round the child was part way through when something took the screen
   * away. This is where they land when the app is opened again, so this is
   * where the offer has to be: walking them back through grade and difficulty
   * would start a new round without ever saying so.
   */
  unfinished: SavedRound | null = null;
  /** The question they had got to, for saying it rather than implying it. */
  unfinishedAt = 0;

  /**
   * A round that FINISHED and whose result the child never got to see,
   * because something took the screen away between the last answer and the
   * celebration. Offered here for the same reason the unfinished round is:
   * this is where a child lands when the app is opened again.
   * Only ever offered UNSEEN — a result already read is a screen they have
   * finished with, and putting it back would be the game deciding otherwise.
   */
  unseenResult: SavedResult | null = null;

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

    const saved = this.progressService.readRound();
    if (isResumable(saved, Date.now(), QUESTIONS_IN_ROUND)) {
      this.unfinished = saved;
      this.unfinishedAt = resumeQuestionNumber(saved, QUESTIONS_IN_ROUND);
    }

    const result = this.progressService.readResult();
    if (isUnseen(result, Date.now())) {
      this.unseenResult = result;
    }
  }

  /** How the round they never saw went, in the words the offer uses. */
  get unseenResultLine(): string {
    return this.languageService.translate('see-result-line')
      .replace('{correct}', String(this.unseenResult ? this.unseenResult.correctAnswers : 0))
      .replace('{total}', String(this.unseenResult ? this.unseenResult.total : 0));
  }

  /**
   * Go and look at it. Nothing is awarded by doing so — the round was banked
   * when it finished — so this only ever opens a screen.
   */
  seeResult() {
    this.router.navigate(['/result']);
  }

  /** What they were part way through, in words they can check against. */
  get unfinishedLine(): string {
    return this.languageService.translate('resume-progress')
      .replace('{number}', String(this.unfinishedAt))
      .replace('{total}', String(QUESTIONS_IN_ROUND));
  }

  /**
   * Back into the round they left. The grade and difficulty are put back
   * from the round itself, because the result screen clears both and the
   * question screen turns a child away without them.
   */
  carryOnRound() {
    const round = this.unfinished;
    if (!round) {
      return;
    }
    try {
      localStorage.setItem('grade', String(round.grade));
      localStorage.setItem('difficulty', round.difficulty);
      localStorage.setItem(RESUME_CHOICE_KEY, 'resume');
    } catch {
      // Without storage the question screen simply asks again, which is fine
    }
    this.router.navigate(['/questions']);
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
    // Picking a grade is choosing to start something new, so whatever was
    // half-finished is let go here rather than ambushing them at the next
    // screen with a round they have just decided against.
    this.progressService.clearRound();
    this.unfinished = null;
    // Starting something new is an answer to the old round's offer too. The
    // result stays readable at /result until it ages out; what goes is the
    // offer, because a child who has chosen a grade has moved on.
    this.progressService.markResultSeen();
    this.unseenResult = null;
    localStorage.setItem('grade', grade.toString());
    this.router.navigate(['/difficulty']);
  }
}
