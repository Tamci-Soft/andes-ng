import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AndesButton } from './button';

@Component({
  imports: [AndesButton],
  template: `
    <button andesButton variant="secondary" size="sm" disabled>Guardar</button>
  `,
})
class TestHost {}

describe('AndesButton', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
  });

  it('keeps native button semantics and exposes only Andes variants', () => {
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('Guardar');
    expect(button.disabled).toBe(true);
    expect(button.dataset['variant']).toBe('secondary');
    expect(button.dataset['size']).toBe('sm');
    expect(button.hasAttribute('brnButton')).toBe(false);
  });
});
