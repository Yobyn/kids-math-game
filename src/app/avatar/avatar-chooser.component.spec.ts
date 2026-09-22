import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AvatarChooserComponent } from './avatar-chooser.component';
import { AvatarComponent } from './avatar.component';
import { AvatarService } from '../services/avatar.service';
import { ProgressService } from '../services/progress.service';
import { xpToReach } from '../levels/level-curve';
import {
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_STYLES,
  NO_ITEM,
  SKIN_TONES,
  WARDROBE,
  FULL_VIEW_BOX,
  PORTRAIT_VIEW_BOX,
  findItem
} from './avatar-model';

describe('AvatarChooserComponent', () => {
  let fixture: ComponentFixture<AvatarChooserComponent>;
  let component: AvatarChooserComponent;
  let service: AvatarService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AvatarChooserComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarChooserComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(AvatarService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('never asks a child to earn the way they look', () => {
    // Identity is free from the first visit. Items are earned; skin, hair and
    // eyes never are, so nothing in those rows may ever be locked.
    const identityRows = Array.from(fixture.nativeElement.querySelectorAll('.choice-row'))
      .slice(0, 4) as Element[];
    const identitySwatches = identityRows
      .reduce((all: Element[], row) => all.concat(Array.from(row.querySelectorAll('.swatch'))), []);

    expect(identitySwatches.length).toBe(
      SKIN_TONES.length + HAIR_STYLES.length + HAIR_COLOURS.length + EYE_COLOURS.length
    );
    identitySwatches.forEach(swatch => {
      expect(swatch.hasAttribute('disabled')).toBe(false);
      expect(swatch.classList.contains('locked')).toBe(false);
    });
  });

  it('saves a choice the moment it is made', () => {
    component.choose('skin', SKIN_TONES[5]);

    expect(service.get().skin).toBe(SKIN_TONES[5]);
    expect(component.avatar.skin).toBe(SKIN_TONES[5]);
  });

  it('keeps the rest of the character when one part changes', () => {
    component.choose('skin', SKIN_TONES[4]);
    component.choose('eyeColour', EYE_COLOURS[2]);

    expect(component.avatar.skin).toBe(SKIN_TONES[4]);
    expect(component.avatar.eyeColour).toBe(EYE_COLOURS[2]);
  });

  it('shows which choice is current, by more than colour alone', () => {
    component.choose('skin', SKIN_TONES[3]);
    fixture.detectChanges();

    const chosen = fixture.nativeElement.querySelectorAll('.swatch.chosen');
    const marked = Array.from(chosen).filter((el: any) => el.getAttribute('aria-pressed') === 'true');
    const rows = fixture.nativeElement.querySelectorAll('.choice-row').length;

    // One per row — four of identity, plus a slot for each worn item
    expect(marked.length).toBe(rows);
  });

  it('previews a hair style on the child’s own character, not a stock one', () => {
    component.choose('skin', SKIN_TONES[5]);

    const preview = component.withHair('bun');

    expect(preview.skin).toBe(SKIN_TONES[5]);
    expect(preview.hairStyle).toBe('bun');
    expect(component.avatar.hairStyle).not.toBe('bun');
  });

  it('gives every swatch a finger-sized target', () => {
    const swatch = fixture.nativeElement.querySelector('.swatch');
    const style = getComputedStyle(swatch);

    expect(parseFloat(style.width)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style.height)).toBeGreaterThanOrEqual(44);
  });

  it('sends the child back to playing when they are done', () => {
    spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.done-btn').click();

    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('opens on the character the child already has', () => {
    service.save({ ...service.get(), hairStyle: 'long', hairColour: HAIR_COLOURS[4] });

    const reopened = TestBed.createComponent(AvatarChooserComponent);
    reopened.detectChanges();

    expect(reopened.componentInstance.avatar.hairStyle).toBe('long');
    expect(reopened.componentInstance.avatar.hairColour).toBe(HAIR_COLOURS[4]);
  });
});

describe('AvatarChooserComponent wardrobe', () => {
  let fixture: ComponentFixture<AvatarChooserComponent>;
  let component: AvatarChooserComponent;
  let service: AvatarService;
  let progress: ProgressService;

  function openAtLevel(level: number) {
    progress.addXp(xpToReach(level));
    fixture = TestBed.createComponent(AvatarChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AvatarChooserComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    service = TestBed.inject(AvatarService);
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('shows locked items rather than hiding them', () => {
    openAtLevel(1);

    const locked = fixture.nativeElement.querySelectorAll('.swatch.locked');
    // Everything but the two empty options is still to be won at level 1
    expect(locked.length).toBe(WARDROBE.filter(i => i.id !== NO_ITEM).length);
    expect(locked.length).toBeGreaterThan(0);
  });

  it('writes the price on a locked item, for eyes and for screen readers', () => {
    openAtLevel(1);

    const cap = findItem('hat', 'cap')!;
    const locked = Array.from(fixture.nativeElement.querySelectorAll('.swatch.locked'))
      .find((el: any) => el.getAttribute('aria-label').startsWith('Cap')) as HTMLElement;

    expect(locked.textContent).toContain(String(cap.unlockLevel));
    expect(locked.getAttribute('aria-label')).toBe('Cap — Level 2');
  });

  it('refuses to put on something that has not been earned', () => {
    openAtLevel(1);

    component.wear('hat', findItem('hat', 'crown')!);

    expect(component.avatar.hat).toBe(NO_ITEM);
    expect(service.get().hat).toBe(NO_ITEM);
  });

  it('lets a child wear what they have reached', () => {
    openAtLevel(2);

    component.wear('hat', findItem('hat', 'cap')!);

    expect(component.avatar.hat).toBe('cap');
    expect(service.get().hat).toBe('cap');
  });

  it('unlocks the swatch as soon as the level is reached', () => {
    openAtLevel(2);

    const cap = Array.from(fixture.nativeElement.querySelectorAll('.swatch'))
      .find((el: any) => el.getAttribute('aria-label') === 'Cap') as HTMLElement;

    expect(cap.classList.contains('locked')).toBe(false);
    expect(cap.hasAttribute('disabled')).toBe(false);
  });

  it('previews an item on the child’s own character', () => {
    openAtLevel(4);
    component.choose('skin', SKIN_TONES[5]);

    const preview = component.withItem('hat', findItem('hat', 'beanie')!);

    expect(preview.skin).toBe(SKIN_TONES[5]);
    expect(preview.hat).toBe('beanie');
  });

  it('names the next thing worth climbing for', () => {
    openAtLevel(2);

    expect(component.nextReward!.id).toBe('round-glasses');
    expect(fixture.nativeElement.querySelector('.next-unlock').textContent)
      .toContain('Round glasses');
  });

  it('stops promising once everything is won', () => {
    openAtLevel(20);

    expect(component.nextReward).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.next-unlock')).toBeNull();
  });

  it('shows clothes on a body and faces on a face', () => {
    openAtLevel(9);

    // Found by heading rather than by index: a new identity row used to shift
    // every number here, which is a test breaking for the wrong reason
    const rowFor = (heading: string) =>
      Array.from(fixture.nativeElement.querySelectorAll('.choice-row') as NodeListOf<HTMLElement>)
        .find(row => row.querySelector('h2')!.textContent!.trim()
          === component.languageService.translate(heading as any))!;
    const tops = rowFor('tops');
    const hats = rowFor('hats');

    // A shirt swatch is useless without shoulders; a hat swatch does not
    // want them, because they would shrink the head it sits on
    expect(tops.querySelector('app-avatar svg')!.getAttribute('viewBox'))
      .toBe(FULL_VIEW_BOX);
    expect(hats.querySelector('app-avatar svg')!.getAttribute('viewBox'))
      .toBe(PORTRAIT_VIEW_BOX);
  });

  it('shows the child their whole character on the stage', () => {
    openAtLevel(9);

    expect(fixture.nativeElement.querySelector('.stage app-avatar svg').getAttribute('viewBox'))
      .toBe(FULL_VIEW_BOX);
  });

  it('wears a shirt the child has earned', () => {
    openAtLevel(7);

    component.wear('top', findItem('top', 'star-tee')!);

    expect(component.avatar.top).toBe('star-tee');
    expect(service.get().top).toBe('star-tee');
  });

  it('refuses a shirt above the level, like every other item', () => {
    openAtLevel(5);

    component.wear('top', findItem('top', 'hoodie')!);

    expect(component.avatar.top).toBe(NO_ITEM);
  });

  it('keeps all three slots independent', () => {
    openAtLevel(9);

    component.wear('hat', findItem('hat', 'beanie')!);
    component.wear('glasses', findItem('glasses', 'shades')!);
    component.wear('top', findItem('top', 'hoodie')!);

    expect(component.avatar.hat).toBe('beanie');
    expect(component.avatar.glasses).toBe('shades');
    expect(component.avatar.top).toBe('hoodie');
  });

  it('keeps both slots independent', () => {
    openAtLevel(6);

    component.wear('hat', findItem('hat', 'beanie')!);
    component.wear('glasses', findItem('glasses', 'shades')!);

    expect(component.avatar.hat).toBe('beanie');
    expect(component.avatar.glasses).toBe('shades');
  });
});

describe('AvatarChooserComponent and event items', () => {
  let fixture: ComponentFixture<AvatarChooserComponent>;
  let component: AvatarChooserComponent;
  let progress: ProgressService;

  function open() {
    fixture = TestBed.createComponent(AvatarChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 22));
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AvatarChooserComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('shows an event item a child has not earned, rather than hiding it', () => {
    open();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.swatch'))
      .map((el: any) => el.getAttribute('aria-label'));

    expect(labels.some((label: string) => label && label.startsWith('Bobble hat'))).toBe(true);
  });

  it('tells a child when it comes back, never how long is left', () => {
    open();

    const bobble = Array.from(fixture.nativeElement.querySelectorAll('.swatch'))
      .find((el: any) => (el.getAttribute('aria-label') || '').startsWith('Bobble hat')) as HTMLElement;

    // The winter event is ahead of 22 September, so it returns this December
    expect(bobble.getAttribute('aria-label')).toBe('Bobble hat — back in December');
    expect(bobble.classList.contains('locked')).toBe(true);
  });

  it('marks an event item differently from a level one', () => {
    open();

    const eventLock = fixture.nativeElement.querySelector('.event-lock');
    expect(eventLock).toBeTruthy();
    // A level lock shows a number to reach; an event lock cannot
    expect(eventLock.textContent).not.toMatch(/\d/);
  });

  it('says plainly that nothing is ever gone for good', () => {
    open();

    expect(fixture.nativeElement.querySelector('.event-note').textContent)
      .toContain('come back every year');
  });

  it('refuses to put on an event item that was never earned', () => {
    open();

    component.wear('hat', findItem('hat', 'bobble-hat')!);

    expect(component.avatar.hat).toBe(NO_ITEM);
  });

  it('lets a child wear one they were there for, at any level', () => {
    progress.earnEvent('winter');
    open();

    expect(component.level).toBe(1);
    component.wear('hat', findItem('hat', 'bobble-hat')!);

    expect(component.avatar.hat).toBe('bobble-hat');
  });

  it('never promises an event item as the next level reward', () => {
    progress.addXp(xpToReach(3));
    open();

    if (component.nextReward) {
      expect(component.nextReward.event).toBeUndefined();
    }
  });
});
