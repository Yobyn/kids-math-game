import { CHOOSER_WORDS } from './chooser-words';
import { LanguageService } from '../services/language.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AvatarChooserComponent } from './avatar-chooser.component';
import { AvatarComponent } from './avatar.component';
import { AvatarService } from '../services/avatar.service';
import { ProgressService } from '../services/progress.service';
import { xpToReach } from '../levels/level-curve';
import { SECTIONS, allRows } from './chooser-sections';
import {
  BODY_TYPES,
  EYE_COLOURS,
  EYE_SHAPES,
  FACE_SHAPES,
  HAIR_COLOURS,
  HAIR_STYLES,
  HAIR_TEXTURES,
  MOUTH_SHAPES,
  NO_ITEM,
  SKIN_TONES,
  WARDROBE,
  FULL_VIEW_BOX,
  PORTRAIT_VIEW_BOX,
  findItem,
  levelItems
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

  it('adds its own words to the language service when it opens: they are not in the first load', () => {
    const service = TestBed.inject(LanguageService);
    // The screen is already open here (see beforeEach); a fresh service has none of them
    expect(new LanguageService().translate('turn-left')).toBe('turn-left');
    Object.keys(CHOOSER_WORDS.en).forEach(key => expect(service.translate(key as any)).not.toBe(key));
    expect(service.translate('turn-left')).toBe(CHOOSER_WORDS[service.getLanguage()]['turn-left']);
  });

  it('never asks a child to earn the way they look', () => {
    // Identity is free from the first visit. Items are earned; a face, hair
    // and eyes never are, so nothing in those sections may ever be locked.
    // Checked across BOTH identity sections rather than the first few rows:
    // counting rows broke the moment the page grew sections, and the rule
    // was never about how many rows there were.
    const identitySwatches: Element[] = [];
    (['face', 'hair'] as const).forEach(section => {
      component.show(section);
      fixture.detectChanges();
      Array.from(fixture.nativeElement.querySelectorAll('.section .choice-row .swatch'))
        .forEach((swatch: any) => identitySwatches.push(swatch));
    });
    // Boy or girl, above the sections, is who they are too
    Array.from(fixture.nativeElement.querySelectorAll('.body-row .swatch'))
      .forEach((swatch: any) => identitySwatches.push(swatch));

    expect(identitySwatches.length).toBe(
      BODY_TYPES.length + SKIN_TONES.length + FACE_SHAPES.length + EYE_SHAPES.length + MOUTH_SHAPES.length
      + HAIR_STYLES.length + HAIR_TEXTURES.length + HAIR_COLOURS.length + EYE_COLOURS.length
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
    component.show('hair');
    component.choose('skin', SKIN_TONES[5]);
    const row = component.rows.find(entry => entry.part === 'hairStyle')!;

    const preview = component.withPart(row, 'bun');

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
    // The page is three sections now, and the things you wear are the third
    component.show('wardrobe');
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
    openAtLevel(Math.max(...levelItems().map(item => item.unlockLevel)));

    expect(component.nextReward).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.next-unlock')).toBeNull();
  });

  it('shows clothes on a body and faces on a face', () => {
    openAtLevel(9);

    // Found by heading rather than by index: a new identity row used to shift
    // every number here, which is a test breaking for the wrong reason
    const rowFor = (heading: string) =>
      Array.from(fixture.nativeElement.querySelectorAll('.section .choice-row') as NodeListOf<HTMLElement>)
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

  it('keeps the swatches flat: twenty 3D pictures would be twenty renders for a thumbnail', () => {
    openAtLevel(9);
    (['face', 'hair', 'wardrobe'] as const).forEach(section => {
      component.show(section);
      fixture.detectChanges();
      const swatches = fixture.debugElement.queryAll(By.css('.swatch app-avatar'));
      expect(swatches.length).withContext(section).toBeGreaterThan(3);
      swatches.forEach(swatch => expect((swatch.componentInstance as AvatarComponent).look).withContext(section).toBe('flat'));
    });
  });

  it('offers the pets in a row of their own, each shown by itself, the way up the ladder', () => {
    openAtLevel(17);
    const row = Array.from(fixture.nativeElement.querySelectorAll('.section .choice-row') as NodeListOf<HTMLElement>)
      .find(r => r.querySelector('h2')!.textContent!.trim() === component.languageService.translate('pets' as any))!;
    expect(row).toBeTruthy();
    const swatches = Array.from(row.querySelectorAll('.swatch')) as HTMLButtonElement[];
    expect(swatches.map(s => s.querySelector('.pet-icon')!.textContent!.trim())).toEqual(['○', '🐱', '🐶', '🐲']);
    expect(row.querySelector('app-avatar')).toBeNull();
    // Won up to the puppy; the dragon still to climb for, and says where
    expect(swatches.map(s => s.disabled)).toEqual([false, false, false, true]);
    expect(swatches[3].textContent).toContain('21');
    expect(swatches[2].getAttribute('aria-label')).toBe(component.languageService.translate('item-puppy'));
    swatches[2].click();
    fixture.detectChanges();
    expect(component.avatar.pet).toBe('puppy');
    expect(service.get().pet).toBe('puppy');
  });

  it('shows the child their whole character on the stage, in 3D', () => {
    openAtLevel(9);

    expect(fixture.nativeElement.querySelector('.stage app-avatar-stage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.stage app-avatar')).toBeNull();
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
    // Event items live among the things you wear, which is the third section
    component.show('wardrobe');
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

describe('AvatarChooserComponent: three sections rather than one long scroll', () => {
  let fixture: ComponentFixture<AvatarChooserComponent>;
  let component: AvatarChooserComponent;

  const tabs = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.tab'));
  const headings = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.section .choice-row h2'))
      .map((h: any) => h.textContent.trim());

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AvatarChooserComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(AvatarChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers one tab per section', () => {
    expect(tabs().length).toBe(SECTIONS.length);
  });

  it('opens on the face, which is what says who this is', () => {
    expect(component.open).toBe('face');
    expect(tabs()[0].classList).toContain('open');
  });

  it('shows only the section that is open', () => {
    // The whole point: 1862px of page was eight rows all present at once
    expect(headings().length).toBe(SECTIONS[0].rows.length);

    component.show('hair');
    fixture.detectChanges();

    expect(headings().length).toBe(SECTIONS[1].rows.length);
  });

  it('moves when a tab is tapped', () => {
    tabs()[1].click();
    fixture.detectChanges();

    expect(component.open).toBe('hair');
    expect(headings()).toContain('Hair colour');
  });

  it('tells assistive tech which one is selected', () => {
    component.show('wardrobe');
    fixture.detectChanges();

    const selected = tabs().filter(tab => tab.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent!.trim()).toBe('Things to wear');
  });

  it('never repeats a heading inside one section', () => {
    // "Eyes" appeared twice on the face section — once for the shape and
    // once for the colour — and a child cannot tell two identical rows apart
    (['face', 'hair', 'wardrobe'] as const).forEach(section => {
      component.show(section);
      fixture.detectChanges();
      const shown = headings();
      expect(new Set(shown).size).toBe(shown.length, `${section}: ${shown.join(', ')}`);
    });
  });

  it('reaches every row of the page through some tab', () => {
    const reachable: string[] = [];
    (['face', 'hair', 'wardrobe'] as const).forEach(section => {
      component.show(section);
      fixture.detectChanges();
      headings().forEach(heading => reachable.push(heading));
    });

    expect(reachable.length).toBe(allRows().length);
  });

  it('keeps a tab big enough for a thumb', () => {
    tabs().forEach(tab => {
      const rect = tab.getBoundingClientRect();
      expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
    });
  });

  it('keeps the character on screen while it is being changed', () => {
    // A swatch that you cannot see the effect of is not a choice
    (['face', 'hair', 'wardrobe'] as const).forEach(section => {
      component.show(section);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.stage app-avatar-stage')).toBeTruthy(section);
    });
  });

  it('asks boy or girl above the sections, with a picture and a word each, and changes the figure', () => {
    // Above the tabs, whichever section is open
    component.show('wardrobe');
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.body-row') as HTMLElement;
    expect(row.compareDocumentPosition(fixture.nativeElement.querySelector('.tabs')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const options = Array.from(row.querySelectorAll('.label-swatch')) as HTMLButtonElement[];
    expect(options.map(o => o.getAttribute('data-value'))).toEqual(['boy', 'girl']);
    expect(options[0].textContent).toContain('Boy');
    expect(options[1].textContent).toContain('Girl');
    expect(options[0].textContent).toContain('👦');
    options[1].click();
    fixture.detectChanges();
    expect(component.avatar.bodyType).toBe('girl');
    expect(TestBed.inject(AvatarService).get().bodyType).toBe('girl');
    expect(options[1].getAttribute('aria-pressed')).toBe('true');
    expect(options[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('closes in on the head for the face and hair, and shows the whole figure for clothes', () => {
    const focus = () => fixture.debugElement.query(By.css('.stage app-avatar-stage')).properties.focus;
    component.show('face');
    fixture.detectChanges();
    expect(focus()).toBe('head');
    component.show('hair');
    fixture.detectChanges();
    expect(focus()).toBe('head');
    component.show('wardrobe');
    fixture.detectChanges();
    expect(focus()).toBe('body');
  });

  it('puts the character on the 3D stage, with the choices it is wearing', () => {
    const stage = fixture.debugElement.query(By.css('.stage app-avatar-stage'));
    expect(stage.properties.avatar).toBe(component.avatar);
    expect(stage.properties.label).toBe(component.languageService.translate('your-character'));
    expect(stage.properties.turnLeftLabel).toBe(component.languageService.translate('turn-left'));
    expect(stage.properties.turnRightLabel).toBe(component.languageService.translate('turn-right'));
  });

  it('saves a choice made in any section, straight away', () => {
    component.show('face');
    fixture.detectChanges();
    const row = component.rows.find(entry => entry.part === 'mouthShape')!;

    component.pickPart(row, 'grin');

    expect(component.avatar.mouthShape).toBe('grin');
    expect(TestBed.inject(AvatarService).get().mouthShape).toBe('grin');
  });
});
