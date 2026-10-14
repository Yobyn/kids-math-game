import { Component, Input } from '@angular/core';
import { BonusGame } from './bonus-games';

/**
 * A small moving picture of how a bonus game is played, on its start card
 * (Yobyn, 2026-10-13: the games' "look and feel"): words alone ask a child
 * to read before they play. Drawn, not an image, in the theme's colours; it
 * holds still under reduced motion. Only a picture: the card's words say the
 * same for a screen reader, so it is hidden from one.
 */
@Component({
  selector: 'app-how-to-play',
  templateUrl: './how-to-play.component.html',
  styleUrls: ['./how-to-play.component.css']
})
export class HowToPlayComponent {
  @Input() game: BonusGame = 'pong';
}
