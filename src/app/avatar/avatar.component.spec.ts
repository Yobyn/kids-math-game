import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import { HAIR_PATHS, HAIR_COLOURS, HAIR_STYLES, SKIN_TONES, defaultAvatar } from './avatar-model';

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
