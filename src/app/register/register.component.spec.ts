import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule, RouterTestingModule],
      declarations: [RegisterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('gives every target on the screen room for a child’s finger', () => {
    // The sign-up button came to 42px and the way back to signing in was a
    // 17px line of text — both under the 48px these screens hold to
    const targets = ['button[type="submit"]', '.login-link a'];
    targets.forEach(selector => {
      const target: HTMLElement = fixture.nativeElement.querySelector(selector);
      expect(target).withContext(selector).toBeTruthy();
      expect(target.getBoundingClientRect().height)
        .withContext(selector).toBeGreaterThanOrEqual(48);
    });
  });

  it('still asks for a name and a password before it will send anything', () => {
    const component = fixture.componentInstance;
    component.register();

    expect(component.error).toBeTruthy();
  });
});
