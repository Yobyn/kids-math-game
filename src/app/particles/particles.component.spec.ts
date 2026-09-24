import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParticlesComponent } from './particles.component';
import { FieldPulseService } from '../services/field-pulse.service';

describe('ParticlesComponent', () => {
  let fixture: ComponentFixture<ParticlesComponent>;
  let component: ParticlesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ParticlesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ParticlesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('fills the field and animates on a normal device', () => {
    fixture.detectChanges();

    expect(component.particles.length).toBeGreaterThan(500);
    expect(component.animating).toBe(true);
  });

  it('draws a still frame under reduced motion rather than nothing', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    const still = TestBed.createComponent(ParticlesComponent);
    still.detectChanges();

    expect(still.componentInstance.particles.length).toBeGreaterThan(0);
    expect(still.componentInstance.animating).toBe(false);
    still.destroy();
  });

  it('sizes the canvas to the window', () => {
    fixture.detectChanges();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');

    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  it('moves the field on when advanced', () => {
    fixture.detectChanges();
    const before = component.particles[0];
    const angleBefore = before.angle;

    component.advance(1);

    expect(component.particles[0].angle).not.toBe(angleBefore);
  });

  it('never swallows a tap meant for the game', () => {
    fixture.detectChanges();
    expect(getComputedStyle(fixture.nativeElement).pointerEvents).toBe('none');
  });

  it('hides the canvas from screen readers', () => {
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });

  it('surges when the game reports something worth noticing', () => {
    fixture.detectChanges();
    expect(component.energy).toBe(0);

    TestBed.inject(FieldPulseService).pulse(0.5);

    expect(component.energy).toBe(0.5);
  });

  it('lets the surge fade rather than holding it', () => {
    fixture.detectChanges();
    TestBed.inject(FieldPulseService).pulse(1);

    component.energy = 1;
    // One frame at 160ms should halve it
    component['tick'](performance.now() + 160);

    expect(component.energy).toBeLessThan(1);
  });

  it('does not surge for a tap: the full-field swell stays for what earns it', () => {
    fixture.detectChanges();
    TestBed.inject(FieldPulseService).tap(100, 100);

    expect(component.energy).toBe(0);
  });

  it('ignores surges under reduced motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const still = TestBed.createComponent(ParticlesComponent);
    still.detectChanges();

    TestBed.inject(FieldPulseService).pulse(1);

    expect(still.componentInstance.energy).toBe(0);
    still.destroy();
  });

  it('stops listening for surges once destroyed', () => {
    fixture.detectChanges();
    fixture.destroy();

    TestBed.inject(FieldPulseService).pulse(1);

    expect(component.energy).toBe(0);
  });

  it('stops animating once destroyed', () => {
    fixture.detectChanges();
    expect(component.animating).toBe(true);

    fixture.destroy();

    expect(component.animating).toBe(false);
  });
});
