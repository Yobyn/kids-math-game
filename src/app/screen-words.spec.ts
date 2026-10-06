import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { LanguageService, SUPPORTED_LANGUAGES, Words } from './services/language.service';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { GradeSelectComponent } from './grade-select/grade-select.component';
import { DifficultySelectComponent } from './difficulty-select/difficulty-select.component';
import { QuestionComponent } from './question/question.component';
import { RoundTrackComponent } from './question/round-track.component';
import { CoinPickerComponent } from './money/coin-picker.component';
import { ResultComponent } from './result/result.component';
import { ProgressComponent } from './progress/progress.component';
import { ScrapbookComponent } from './scrapbook/scrapbook.component';
import { AvatarChooserComponent } from './avatar/avatar-chooser.component';
import { LOGIN_WORDS } from './login/login-words';
import { SELECT_WORDS } from './grade-select/select-words';
import { PLAY_WORDS } from './question/play-words';
import { ITEM_WORDS } from './avatar/item-words';

/**
 * Every screen fetched on its own brings the words it shows, and hands them
 * to the language service as it opens (app-routing.module.ts). A screen that
 * forgot would show "play-as-guest" where "Play as guest" should be, and
 * nothing else would notice: the first load no longer has those words.
 */
describe('a screen fetched on its own brings its own words', () => {
  const SCREENS: Array<[string, Type<unknown>, Array<Words<string>>]> = [
    ['title', LoginComponent, [LOGIN_WORDS]],
    ['sign-up', RegisterComponent, [LOGIN_WORDS]],
    ['grade', GradeSelectComponent, [SELECT_WORDS]],
    ['difficulty', DifficultySelectComponent, [SELECT_WORDS]],
    ['round', QuestionComponent, [PLAY_WORDS]],
    ['round track', RoundTrackComponent, [PLAY_WORDS]],
    ['coin tray', CoinPickerComponent, [PLAY_WORDS]],
    ['result', ResultComponent, [PLAY_WORDS, ITEM_WORDS]],
    ['progress', ProgressComponent, [ITEM_WORDS]],
    ['scrapbook', ScrapbookComponent, [ITEM_WORDS]],
    ['dressing up', AvatarChooserComponent, [ITEM_WORDS]]
  ];

  afterEach(() => localStorage.clear());

  SCREENS.forEach(([name, screen, wordSets]) => {
    it(`the ${name} screen adds its words as it opens, in every language`, async () => {
      localStorage.clear();
      localStorage.setItem('guest', 'true');
      await TestBed.configureTestingModule({
        // The sign-up form needs forms, as its own module gives it
        imports: [RouterTestingModule, HttpClientTestingModule, FormsModule],
        declarations: [screen],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const service = TestBed.inject(LanguageService);
      const keys = wordSets.map(words => Object.keys(words.en)).reduce((all, list) => all.concat(list), [] as string[]);
      // Not there before: the first load does not carry them
      keys.forEach(key => expect(service.translate(key as any)).withContext(`${name}: ${key} before`).toBe(key));

      TestBed.createComponent(screen);

      SUPPORTED_LANGUAGES.forEach(lang => {
        service.setLanguage(lang);
        wordSets.forEach(words => Object.keys(words.en).forEach(key =>
          expect(service.translate(key as any)).withContext(`${name} ${lang}: ${key}`).toBe((words[lang] as any)[key])));
      });
    });
  });

  it('names the grade and difficulty cards in words, never in keys, though the cards are built as the screen is', async () => {
    localStorage.setItem('guest', 'true');
    localStorage.setItem('grade', '3');
    localStorage.setItem('language', 'en');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [GradeSelectComponent, DifficultySelectComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    const grades = TestBed.createComponent(GradeSelectComponent).componentInstance.grades;
    expect(grades[0].description).toBe(`${SELECT_WORDS.en['maths-for-grade']} 1`);
    const climbs = TestBed.createComponent(DifficultySelectComponent).componentInstance.difficulties;
    expect(climbs.map(climb => climb.name)).toEqual([SELECT_WORDS.en['climb-easy'], SELECT_WORDS.en['climb-medium'], SELECT_WORDS.en['climb-hard']]);
    expect(climbs.map(climb => climb.description)).toEqual([SELECT_WORDS.en['easy-desc'], SELECT_WORDS.en['medium-desc'], SELECT_WORDS.en['hard-desc']]);
  });
});
