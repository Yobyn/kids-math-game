import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';
import { FIT_ATTRIBUTE, layoutFor } from '../layout/screen-fit';

describe('LayoutService', () => {
  let service: LayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutService);
    // The suite pins a default in test.ts, and other components start the
    // service; this one is about what the service itself writes.
    document.documentElement.removeAttribute(FIT_ATTRIBUTE);
  });

  afterEach(() => {
    service.stop();
    document.documentElement.setAttribute(FIT_ATTRIBUTE, 'stack');
  });

  it('publishes the shape of the window it opened in', () => {
    service.start();

    const expected = layoutFor({ width: window.innerWidth, height: window.innerHeight });
    expect(document.documentElement.getAttribute(FIT_ATTRIBUTE)).toBe(expected);
    expect(service.current()).toBe(expected);
  });

  it('publishes before anything is listening, not after the first resize', () => {
    // A screen that painted stacked and then jumped to landscape would be
    // worse than either
    expect(document.documentElement.getAttribute(FIT_ATTRIBUTE)).toBeNull();

    service.start();

    expect(document.documentElement.getAttribute(FIT_ATTRIBUTE)).toBeTruthy();
  });

  it('re-reads the window when it is resized', () => {
    service.start();
    spyOn(service, 'apply').and.callThrough();

    window.dispatchEvent(new Event('resize'));

    expect(service.apply).toHaveBeenCalled();
  });

  it('listens for a turned device as well as a resize', () => {
    // Some browsers report the OLD size while handling orientationchange,
    // so both are wired and the later one corrects the earlier
    service.start();
    spyOn(service, 'apply').and.callThrough();

    window.dispatchEvent(new Event('orientationchange'));

    expect(service.apply).toHaveBeenCalled();
  });

  it('stops listening when it is told to', () => {
    service.start();
    service.stop();
    spyOn(service, 'apply');

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));

    expect(service.apply).not.toHaveBeenCalled();
  });

  it('only wires the listeners once, however often it is started', () => {
    service.start();
    service.start();
    service.start();
    service.stop();
    spyOn(service, 'apply');

    window.dispatchEvent(new Event('resize'));

    expect(service.apply).not.toHaveBeenCalled();
  });

  it('is happy to be stopped before it was ever started', () => {
    expect(() => service.stop()).not.toThrow();
  });

  it('tells anyone watching when the shape changes, and only then', () => {
    const seen: string[] = [];
    service.changes().subscribe(fit => seen.push(fit));
    service.start();
    service.apply();
    service.apply();

    // One value at subscribe, and nothing repeated for a window that has
    // not changed shape
    expect(seen.length).toBeLessThanOrEqual(2);
    expect(seen[seen.length - 1]).toBe(service.current());
  });
});
