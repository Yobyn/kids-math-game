import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarService } from '../services/avatar.service';
import { LanguageService } from '../services/language.service';
import {
  Avatar,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_STYLES,
  HairStyle,
  SKIN_TONES
} from './avatar-model';

/**
 * Where a child makes the character theirs. Every choice here is free and
 * always has been: research on children's avatars finds that the act of
 * customising is what builds identification with the character, and that skin
 * tone, hair and eyes are what they reach for first. Putting any of that
 * behind a level would mean a child has to earn the right to look like
 * themselves. Clothes are what levels will unlock.
 */
@Component({
  selector: 'app-avatar-chooser',
  templateUrl: './avatar-chooser.component.html',
  styleUrls: ['./avatar-chooser.component.css']
})
export class AvatarChooserComponent implements OnInit {
  avatar!: Avatar;
  skinTones = SKIN_TONES;
  hairStyles = HAIR_STYLES;
  hairColours = HAIR_COLOURS;
  eyeColours = EYE_COLOURS;

  constructor(
    private avatarService: AvatarService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.avatar = { ...this.avatarService.get() };
  }

  /** Saved on every tap: a child should never lose a choice to a missed button. */
  choose(part: keyof Avatar, value: string) {
    this.avatar = { ...this.avatar, [part]: value } as Avatar;
    this.avatarService.save(this.avatar);
  }

  /** The character as it would look with this hair, for the style swatches. */
  withHair(style: HairStyle): Avatar {
    return { ...this.avatar, hairStyle: style };
  }

  done() {
    this.router.navigate(['/grade']);
  }
}
