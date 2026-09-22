import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// The service worker is registered by AppComponent, through the injector.
// It used to be registered here with `new PwaService()` — a second instance,
// so the one the app shell reads from never learned anything. That was
// invisible until a real browser ran two real deploys: a new version sat
// waiting and nothing on the page knew.
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
