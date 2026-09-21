import { LanguageService, SUPPORTED_LANGUAGES } from './language.service';

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
      ['check', 'next', 'correct', 'money-total', 'money-change', 'new-best', 'your-best'];

    SUPPORTED_LANGUAGES.forEach(lang => {
      service.setLanguage(lang);
      keys.forEach(key => {
        expect(service.translate(key)).toBeTruthy();
      });
    });
  });
});
