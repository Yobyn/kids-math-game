import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AvatarChooserComponent } from './avatar-chooser.component';
import { AvatarComponent } from './avatar.component';
import { AvatarService } from '../services/avatar.service';
import { EYE_COLOURS, HAIR_COLOURS, HAIR_STYLES, SKIN_TONES } from './avatar-model';

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

  it('offers every choice without asking a child to earn any of them', () => {
    const swatches = fixture.nativeElement.querySelectorAll('.swatch');

    // Identity is free from the first visit: nothing here is locked
    expect(swatches.length).toBe(
      SKIN_TONES.length + HAIR_STYLES.length + HAIR_COLOURS.length + EYE_COLOURS.length
    );
    expect(fixture.nativeElement.querySelector('[disabled]')).toBeNull();
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

    // One per row, and each carries a state a screen reader can read
    expect(marked.length).toBe(4);
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
