import { Component } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { AvatarService } from '../services/avatar.service';
import { Avatar } from '../avatar/avatar-model';
import { OrbitMark, orbitMarks } from './title-orbit';

/** The game's name as it appears on the title screen. */
export const GAME_NAME = 'Math Game';

/**
 * The top of the title screen: the game's name, the child's own character in
 * the ring, and the maths symbols circling it. The first thing a child sees
 * used to be a form headed "Login"; this is what says it is a game.
 */
@Component({
  selector: 'app-title-hero',
  templateUrl: './title-hero.component.html',
  styleUrls: ['./title-hero.component.css']
})
export class TitleHeroComponent {
  readonly name = GAME_NAME;
  readonly marks: OrbitMark[] = orbitMarks();
  /** A returning child sees their own character; a new one sees the default. */
  readonly avatar: Avatar;

  constructor(public languageService: LanguageService, avatarService: AvatarService) {
    this.avatar = avatarService.get();
  }
}
