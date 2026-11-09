import { LOGIN_WORDS } from '../login/login-words';
import { SELECT_WORDS } from '../grade-select/select-words';
import { PLAY_WORDS } from '../question/play-words';
import { ITEM_WORDS } from '../avatar/item-words';
import { ADULTS_WORDS } from '../adults/adults-words';
import { SCRAPBOOK_WORDS } from '../scrapbook/scrapbook-words';
import { PROGRESS_WORDS } from '../progress/progress-words';
import { CHOOSER_WORDS } from '../avatar/chooser-words';
import { NO_ITEM, WARDROBE } from '../avatar/avatar-model';
import { LanguageService, SUPPORTED_LANGUAGES, Words } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts in English when nothing is stored', done => {
    new LanguageService().getCurrentLang().subscribe(lang => {
      expect(lang).toBe('en');
      done();
    });
  });

  it('remembers the chosen language for the next visit', () => {
    const service = new LanguageService();
    service.setLanguage('es');

    expect(localStorage.getItem('language')).toBe('es');
    expect(new LanguageService().translate('check')).toBe(service.translate('check'));
  });

  it('restores a stored language on construction', done => {
    localStorage.setItem('language', 'nl');

    new LanguageService().getCurrentLang().subscribe(lang => {
      expect(lang).toBe('nl');
      done();
    });
  });

  it('falls back to English when the stored value is nonsense', done => {
    localStorage.setItem('language', 'klingon');

    new LanguageService().getCurrentLang().subscribe(lang => {
      expect(lang).toBe('en');
      done();
    });
  });

  it('refuses an unsupported language', done => {
    const service = new LanguageService();
    service.setLanguage('fr' as any);

    service.getCurrentLang().subscribe(lang => {
      expect(lang).toBe('en');
      done();
    });
  });

  it('translates every key in every supported language', () => {
    const service = new LanguageService();
    const keys: Array<Parameters<LanguageService['translate']>[0]> =
      ['check', 'next', 'welcome', 'money-total', 'money-change', 'new-best', 'sounds'];

    SUPPORTED_LANGUAGES.forEach(lang => {
      service.setLanguage(lang);
      keys.forEach(key => {
        expect(service.translate(key)).toBeTruthy();
      });
    });
  });

  it('names everything a child can earn, in every language, once a screen that shows it has opened', () => {
    const service = new LanguageService();
    service.extend(ITEM_WORDS);
    SUPPORTED_LANGUAGES.forEach(lang => {
      service.setLanguage(lang);
      WARDROBE.filter(item => item.id !== NO_ITEM).forEach(item => {
        const key = `item-${item.id}` as Parameters<LanguageService['translate']>[0];
        expect(service.translate(key)).withContext(`${lang} ${item.id}`).toBeTruthy();
        expect(service.translate(key)).withContext(`${lang} ${item.id}`).not.toBe(key);
      });
    });
  });
});

describe('LanguageService: a lazy screen\u2019s own words', () => {
  const SCREENS: Array<[string, Words<string>]> = [
    ['adults', ADULTS_WORDS], ['scrapbook', SCRAPBOOK_WORDS], ['progress', PROGRESS_WORDS], ['chooser', CHOOSER_WORDS],
    ['title and sign-up', LOGIN_WORDS], ['grade and difficulty', SELECT_WORDS], ['round and result', PLAY_WORDS],
    ['things to win', ITEM_WORDS]
  ];

  afterEach(() => localStorage.clear());

  it('has every word in every language, for every screen', () => {
    SCREENS.forEach(([screen, words]) => {
      const keys = Object.keys(words.en).sort();
      expect(keys.length).toBeGreaterThan(0);
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(Object.keys(words[lang]).sort()).toEqual(keys, `${screen} ${lang}`);
        keys.forEach(key => expect((words[lang] as any)[key].trim().length).toBeGreaterThan(0, `${screen} ${lang} ${key}`));
      });
    });
  });

  it('keeps a screen\u2019s words out of the first load: none of them is in the service until the screen adds it', () => {
    const service = new LanguageService();
    SCREENS.forEach(([screen, words]) => Object.keys(words.en).forEach(key =>
      expect(service.translate(key as any)).toBe(key, `${screen}: ${key} is in the first load`)));
  });

  it('never gives two screens the same key', () => {
    const seen = new Set<string>();
    SCREENS.forEach(([screen, words]) => Object.keys(words.en).forEach(key => {
      expect(seen.has(key)).toBe(false, `${screen}: ${key}`);
      seen.add(key);
    }));
  });

  it('speaks a screen\u2019s words once the screen has added them, in the language chosen', () => {
    const service = new LanguageService();
    service.extend(PROGRESS_WORDS);
    SUPPORTED_LANGUAGES.forEach(lang => {
      service.setLanguage(lang);
      expect(service.translate('your-best')).toBe(PROGRESS_WORDS[lang]['your-best']);
    });
    // Adding them again changes nothing
    service.extend(PROGRESS_WORDS);
    expect(service.translate('your-best')).toBe(PROGRESS_WORDS.es['your-best']);
  });

  it('still prefers the first-load words, which a screen cannot overwrite', () => {
    const service = new LanguageService();
    const before = service.translate('logout');
    expect(before).not.toBe('logout');
    service.extend({ en: { logout: 'nope' }, nl: { logout: 'nee' }, es: { logout: 'no' } });
    expect(service.translate('logout')).toBe(before);
  });
});

describe('the way back and the way on, in the grade screen\'s own words (2026-11-08)', () => {
  // "Back to Grade Selection" and "Opnieuw Spelen" capitalised mid-phrase, and "Terug naar groep
  // selectie" split a Dutch word in two; the grade screen asks "Pick your grade", "Kies je groep"
  const said = (language: 'en' | 'nl' | 'es') => {
    const service = new LanguageService();
    service.extend(PLAY_WORDS);
    service.setLanguage(language);
    return { back: service.translate('back'), again: service.translate('play-again') };
  };

  it('names the grade screen the way back goes to, as its heading does', () => {
    expect(said('en').back).toBe('Pick another grade');
    expect(said('nl').back).toBe('Kies een andere groep');
    expect(said('es').back).toBe('Elige otro curso');
  });

  it('writes "play again" as a phrase, not a title', () => {
    expect(said('en').again).toBe('Play again');
    expect(said('nl').again).toBe('Opnieuw spelen');
    expect(said('es').again).toBe('Jugar de nuevo');
  });
});

describe('the title screen\'s welcome in Dutch (2026-11-09)', () => {
  it('asks to do rekenen, as groep 3 to 8 call it, in Dutch rather than English put into Dutch', () => {
    // was "Laten we wat wiskunde leren!", "let's learn some math" word for word
    const service = new LanguageService();
    service.setLanguage('nl');
    expect(service.translate('lets-learn')).toBe('Laten we gaan rekenen!');
  });
});
