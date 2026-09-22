import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoinsComponent } from './coins.component';

describe('CoinsComponent', () => {
  let fixture: ComponentFixture<CoinsComponent>;
  let component: CoinsComponent;

  const pieces = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.piece'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [CoinsComponent] }).compileComponents();
    fixture = TestBed.createComponent(CoinsComponent);
    component = fixture.componentInstance;
  });

  it('shows nothing when there is nothing on the table', () => {
    component.pieces = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.coins')).toBeNull();
  });

  it('draws one piece for each one in the pile, including repeats', () => {
    component.pieces = [50, 20, 20, 5];
    fixture.detectChanges();

    expect(pieces().length).toBe(4);
  });

  it('writes the value on the face, which is what a child reads', () => {
    component.pieces = [200, 50, 5];
    fixture.detectChanges();

    expect(pieces().map(piece => piece.textContent!.trim())).toEqual(['€2', '50c', '5c']);
  });

  it('writes those faces in the notation the band uses', () => {
    component.pieces = [200];
    component.decimal = true;
    fixture.detectChanges();

    expect(pieces()[0].textContent!.trim()).toBe('€2');
  });

  it('colours them the way the real pieces are coloured', () => {
    component.pieces = [2, 20, 100, 500];
    fixture.detectChanges();

    const classes = pieces().map(piece => piece.className);
    expect(classes[0]).toContain('copper');
    expect(classes[1]).toContain('gold');
    expect(classes[2]).toContain('silver-centre');
    expect(classes[3]).toContain('note');
  });

  it('draws a €1 and a €2 the way round they really are', () => {
    // A €1 is a silver centre inside a gold ring; a €2 is the reverse
    component.pieces = [100, 200];
    fixture.detectChanges();

    expect(pieces()[0].className).toContain('silver-centre');
    expect(pieces()[1].className).toContain('gold-centre');
    expect(pieces()[0].className).not.toContain('gold-centre');
  });

  it('draws every coin the same size', () => {
    // Children read value off size, and the real euro set does not even
    // agree with that — a 5c coin is physically larger than a 10c. Colour
    // and the printed value are what separate them here.
    component.pieces = [1, 5, 10, 50, 100, 200];
    fixture.detectChanges();

    const widths = pieces().map(piece => piece.getBoundingClientRect().width);
    widths.forEach(width => expect(width).toBe(widths[0]));
  });

  it('keeps the text dark on a light face, like every reading surface here', () => {
    component.pieces = [1, 10, 100, 500];
    fixture.detectChanges();

    pieces().forEach(piece => {
      const colour = getComputedStyle(piece).color.match(/\d+/g)!.map(Number);
      const luminance = (0.2126 * colour[0] + 0.7152 * colour[1] + 0.0722 * colour[2]) / 255;
      expect(luminance).toBeLessThan(0.4);
    });
  });
});
