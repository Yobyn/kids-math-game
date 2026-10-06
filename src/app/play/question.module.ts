import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { QuestionComponent } from '../question/question.component';
import { RoundTrackComponent } from '../question/round-track.component';
import { KeypadComponent } from '../keypad/keypad.component';
import { CoinsComponent } from '../money/coins.component';
import { CoinPickerComponent } from '../money/coin-picker.component';

/**
 * A round: the questions, the keypad, the coins. Fetched on its own so the
 * questions can grow (Yobyn, 2026-10-06: "the level of the questions ... what
 * is actually asked in school") without the first load growing with them;
 * preloaded as soon as the app opens (app-routing.module.ts), so a child
 * never waits for it.
 */
@NgModule({
  declarations: [QuestionComponent, RoundTrackComponent, KeypadComponent, CoinsComponent, CoinPickerComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: QuestionComponent }])]
})
export class QuestionModule { }
