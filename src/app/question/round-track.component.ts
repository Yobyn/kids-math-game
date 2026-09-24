import { Component, Input } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { Pip, currentStep, roundPips } from './round-track';

/**
 * The strip above the question: a pip for every question in the round, lit
 * in the ring's colours as the child goes through them, with the score and
 * any streak beside it. The rules are in round-track.ts.
 */
@Component({
  selector: 'app-round-track',
  templateUrl: './round-track.component.html',
  styleUrls: ['./round-track.component.css']
})
export class RoundTrackComponent {
  @Input() answered = 0;
  @Input() total = 10;
  @Input() score = 0;
  @Input() streak = 0;

  constructor(public languageService: LanguageService) {}

  get pips(): Pip[] {
    return roundPips(this.answered, this.total);
  }

  /** Read aloud rather than shown: where the child is, in words. */
  get label(): string {
    const t = (key: 'question' | 'of') => this.languageService.translate(key);
    return `${t('question')} ${currentStep(this.answered, this.total)} ${t('of')} ${this.total}`;
  }

  byStep(_: number, pip: Pip): number {
    return pip.step;
  }
}
