import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParticlesComponent } from './particles.component';

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

  it('stops animating once destroyed', () => {
    fixture.detectChanges();
    expect(component.animating).toBe(true);

    fixture.destroy();

    expect(component.animating).toBe(false);
  });
});
