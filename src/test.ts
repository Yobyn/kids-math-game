// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { ɵflushModuleScopingQueueAsMuchAsPossible as giveModulesTheirScope } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { AvatarStillService } from './app/avatar/avatar-still.service';
import { AvatarStageComponent } from './app/avatar3d/avatar-stage.component';

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    keys(): string[];
    <T>(id: string): T;
  };
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true }},
);

/**
 * Tests assert the STACKED layout unless they say otherwise.
 *
 * The runner's own window is wider than it is tall and only a few hundred
 * pixels high, so the app's real answer for it is the landscape layout — and
 * every geometry test written before that layout existed was silently
 * measuring it. Pinning the default here keeps those tests meaning what they
 * were written to mean; the landscape tests set the attribute themselves and
 * put it back. See src/app/layout/screen-fit.ts.
 */
document.documentElement.setAttribute('data-fit', 'stack');

// Put it back after every spec. Any test that builds AppComponent starts
// LayoutService, which publishes the runner window's real shape and leaves
// it there for whatever runs next — and karma randomises the order, so
// without this the geometry tests pass or fail depending on the draw.
afterEach(() => document.documentElement.setAttribute('data-fit', 'stack'));

/**
 * Pictures of the 3D character are off unless a spec turns them on. Every
 * screen shows the character, and drawing it in 3D for each of hundreds of
 * specs is slow and beside their point; the 2D drawing they were written
 * against still shows. avatar-still.service.spec.ts and avatar.component.spec
 * turn them on and test them.
 */
AvatarStillService.enabledByDefault = false;

/**
 * The same for the 3D character breathing and blinking: a stage that never
 * stops drawing would keep the test browser busy for every spec that opens
 * the dressing-up screen. The stage's own tests turn it on.
 */
AvatarStageComponent.alive = false;

/**
 * The order the tests ran in, so a failure that only happens in some orders
 * can be run again in exactly that order (karma.conf.js, client.jasmine.seed).
 */
jasmine.getEnv().addReporter({
  jasmineDone: result => console.log(`Tests ran in random order, seed ${result.order.seed}`)
});

// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);

/**
 * Every NgModule loaded above waits in a queue to give its components their
 * scope (CommonModule's *ngFor, *ngIf...). The queue is emptied the first
 * time any component compiles — or thrown away by TestBed when the first
 * test in the random order only injected a service and compiled nothing.
 * Then a component created outside TestBed, as the header creates the sound
 * picker from its lazy chunk, has no *ngFor, and its tests fail in some
 * orders only. Give every module its scope now, before any test runs. (The
 * built app is compiled ahead of time and has no such queue.)
 */
giveModulesTheirScope();
