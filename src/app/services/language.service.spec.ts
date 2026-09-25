import { ADULTS_WORDS } from '../adults/adults-words';
import { SCRAPBOOK_WORDS } from '../scrapbook/scrapbook-words';
import { PROGRESS_WORDS } from '../progress/progress-words';
import { CHOOSER_WORDS } from '../avatar/chooser-words';
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
      ['check', 'next', 'correct', 'money-total', 'money-change', 'new-best', 'sounds'];

    SUPPORTED_LANGUAGES.forEach(lang => {
      service.setLanguage(lang);
      keys.forEach(key => {
        expect(service.translate(key)).toBeTruthy();
      });
    });
  });
});

describe('LanguageService: a lazy screen\u2019s own words', () => {
  const SCREENS: Array<[string, Words<string>]> = [
    ['adults', ADULTS_WORDS], ['scrapbook', SCRAPBOOK_WORDS], ['progress', PROGRESS_WORDS], ['chooser', CHOOSER_WORDS]
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
    const before = service.translate('check');
    service.extend({ en: { check: 'nope' }, nl: { check: 'nee' }, es: { check: 'no' } });
    expect(service.translate('check')).toBe(before);
  });
});
