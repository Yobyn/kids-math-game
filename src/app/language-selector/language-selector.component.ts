import { Component } from '@angular/core';
import { LanguageService, Language } from '../services/language.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css']
})
export class LanguageSelectorComponent {
  languages: { code: Language; name: string; flag: string; }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
  ];

  constructor(public languageService: LanguageService) {}

  switchLanguage(langCode: Language) {
    this.languageService.setLanguage(langCode);
  }
} 