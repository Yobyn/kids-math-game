// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

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

// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);
