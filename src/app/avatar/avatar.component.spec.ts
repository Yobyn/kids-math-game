import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import {
  DEFAULT_TOP_COLOUR,
  FULL_VIEW_BOX,
  HAIR_PATHS,
  HAIR_COLOURS,
  HAIR_STYLES,
  NO_ITEM,
  PORTRAIT_VIEW_BOX,
  SKIN_TONES,
  defaultAvatar,
  findItem
} from './avatar-model';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('paints the face in the chosen skin tone', () => {
    component.avatar = { ...defaultAvatar(), skin: SKIN_TONES[5] };
    fixture.detectChanges();

    const face = fixture.nativeElement.querySelector('.face');
    expect(face.getAttribute('fill')).toBe(SKIN_TONES[5]);
  });

  it('paints the ears to match the face, not some fixed tone', () => {
    component.avatar = { ...defaultAvatar(), skin: SKIN_TONES[0] };
    fixture.detectChanges();

    const fills = Array.from(fixture.nativeElement.querySelectorAll('.ear, .face'))
      .map((el: any) => el.getAttribute('fill'));

    expect(new Set(fills).size).toBe(1);
  });

  it('draws the hair shape the child picked', () => {
    component.avatar = { ...defaultAvatar(), hairStyle: 'curly' };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hair').getAttribute('d'))
      .toBe(HAIR_PATHS.curly);
  });

  it('changes the drawing when the style changes', () => {
    component.avatar = { ...defaultAvatar(), hairStyle: 'short' };
    fixture.detectChanges();
    const before = fixture.nativeElement.querySelector('.hair').getAttribute('d');

    component.avatar = { ...component.avatar, hairStyle: 'bun' };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hair').getAttribute('d')).not.toBe(before);
  });

  it('keeps hair colour and eye colour on their own parts', () => {
    component.avatar = { ...defaultAvatar(), hairColour: HAIR_COLOURS[5] };
    fixture.detectChanges();

    const hair = fixture.nativeElement.querySelector('.hair').getAttribute('fill');
    const eye = fixture.nativeElement.querySelector('.eye').getAttribute('fill');

    expect(hair).toBe(HAIR_COLOURS[5]);
    expect(eye).toBe(component.avatar.eyeColour);
  });

  it('draws at whatever size it is asked for, from one set of artwork', () => {
    component.size = 180;
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('180');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('covers the crown with hair, in every style', () => {
    // The face is drawn first, so hair that starts too low leaves a bare dome
    // of scalp poking out above the fringe. Measured, not eyeballed.
    HAIR_STYLES.forEach(style => {
      component.avatar = { ...defaultAvatar(), hairStyle: style };
      fixture.detectChanges();

      const hair = fixture.nativeElement.querySelector('.hair').getBBox();
      const face = fixture.nativeElement.querySelector('.face').getBBox();

      expect(hair.y).toBeLessThan(face.y);
    });
  });

  it('keeps every style inside the canvas it is drawn in', () => {
    HAIR_STYLES.forEach(style => {
      component.avatar = { ...defaultAvatar(), hairStyle: style };
      fixture.detectChanges();

      const hair = fixture.nativeElement.querySelector('.hair').getBBox();

      expect(hair.x).toBeGreaterThanOrEqual(0);
      expect(hair.y).toBeGreaterThanOrEqual(0);
      expect(hair.x + hair.width).toBeLessThanOrEqual(100);
      expect(hair.y + hair.height).toBeLessThanOrEqual(100);
    });
  });

  it('gives each style a visibly different silhouette', () => {
    const shapes = HAIR_STYLES.map(style => {
      component.avatar = { ...defaultAvatar(), hairStyle: style };
      fixture.detectChanges();
      const box = fixture.nativeElement.querySelector('.hair').getBBox();
      return `${Math.round(box.width)}x${Math.round(box.height)}`;
    });

    // Not a strict requirement that all four differ in size, but at least
    // three distinct silhouettes or the choice is not really a choice
    expect(new Set(shapes).size).toBeGreaterThanOrEqual(3);
  });

  it('is announced as a picture rather than read out as shapes', () => {
    const svg = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('AvatarComponent framing', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the head alone by default', () => {
    // The default is what the header uses, inside a circular clip
    const svg = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('viewBox')).toBe(PORTRAIT_VIEW_BOX);
    expect(fixture.nativeElement.querySelector('.torso')).toBeNull();
    expect(fixture.nativeElement.querySelector('.neck')).toBeNull();
  });

  it('reaches the shoulders when asked to', () => {
    component.framing = 'full';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg').getAttribute('viewBox')).toBe(FULL_VIEW_BOX);
    expect(fixture.nativeElement.querySelector('.torso')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.neck')).toBeTruthy();
  });

  it('keeps the head the same size in both framings', () => {
    // The whole reason for two framings: a torso must not shrink the face
    component.framing = 'portrait';
    fixture.detectChanges();
    const portrait = fixture.nativeElement.querySelector('.face').getBBox();

    component.framing = 'full';
    fixture.detectChanges();
    const full = fixture.nativeElement.querySelector('.face').getBBox();

    expect(full.width).toBe(portrait.width);
    expect(full.y).toBe(portrait.y);
  });

  it('grows taller rather than wider for the extra body', () => {
    component.size = 100;
    component.framing = 'full';
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(Number(svg.getAttribute('width'))).toBe(100);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(100);
  });

  it('keeps the whole body inside the canvas it draws in', () => {
    component.framing = 'full';
    fixture.detectChanges();

    const [, , boxWidth, boxHeight] = FULL_VIEW_BOX.split(' ').map(Number);
    ['.torso', '.neck', '.face'].forEach(selector => {
      const box = fixture.nativeElement.querySelector(selector).getBBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(boxWidth);
      expect(box.y + box.height).toBeLessThanOrEqual(boxHeight);
    });
  });

  it('tucks the neck behind the chin rather than beside it', () => {
    component.framing = 'full';
    fixture.detectChanges();

    const neck = fixture.nativeElement.querySelector('.neck').getBBox();
    const face = fixture.nativeElement.querySelector('.face').getBBox();

    expect(neck.width).toBeLessThan(face.width);
    expect(neck.y).toBeLessThan(face.y + face.height);
  });

  it('dresses the shirt in the colour of the top being worn', () => {
    component.avatar = { ...defaultAvatar(), top: 'star-tee' };
    component.framing = 'full';
    fixture.detectChanges();

    const shirt = fixture.nativeElement.querySelector('.torso').getAttribute('fill');
    expect(shirt).toBe(findItem('top', 'star-tee')!.colour);
  });

  it('still wears a shirt when nothing has been earned', () => {
    // A bare chest is not a sensible default for a character
    component.avatar = { ...defaultAvatar(), top: NO_ITEM };
    component.framing = 'full';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.torso').getAttribute('fill'))
      .toBe(DEFAULT_TOP_COLOUR);
    expect(fixture.nativeElement.querySelector('.top-decoration')).toBeNull();
  });

  it('draws a top’s decoration over its shirt, in its own colour', () => {
    const striped = findItem('top', 'striped')!;
    component.avatar = { ...defaultAvatar(), top: 'striped' };
    component.framing = 'full';
    fixture.detectChanges();

    const decoration = fixture.nativeElement.querySelector('.top-decoration');
    expect(decoration.getAttribute('d')).toBe(striped.path);
    expect(decoration.getAttribute('fill')).toBe(striped.decorationColour);
    expect(decoration.getAttribute('fill')).not.toBe(striped.colour);
  });

  it('shows no clothes at all in the portrait framing', () => {
    // Nothing to see below the chin, so nothing is drawn there
    component.avatar = { ...defaultAvatar(), top: 'hoodie' };
    component.framing = 'portrait';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.torso')).toBeNull();
    expect(fixture.nativeElement.querySelector('.top-decoration')).toBeNull();
  });
});
