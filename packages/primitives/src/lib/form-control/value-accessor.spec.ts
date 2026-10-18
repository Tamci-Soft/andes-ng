import {
  createEnvironmentInjector,
  effect,
  EnvironmentInjector,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { provideAndesValueAccessor } from './provide-value-accessor';
import {
  andesShallowArrayEquals,
  AndesValueAccessor,
  AndesValueAccessorOptions,
} from './value-accessor';

function create<T>(
  options: AndesValueAccessorOptions<T>,
  injector: EnvironmentInjector = TestBed.inject(EnvironmentInjector),
): AndesValueAccessor<T> {
  return runInInjectionContext(injector, () => new AndesValueAccessor(options));
}

describe('AndesValueAccessor', () => {
  describe('commit', () => {
    it('updates the signal and notifies the form once, in that order', () => {
      const value = signal('a');
      const accessor = create({ value });
      const seen: string[] = [];
      accessor.registerOnChange(() => seen.push(value()));

      expect(accessor.commit('b')).toBe(true);

      expect(value()).toBe('b');
      expect(seen).toEqual(['b']);
    });

    it('drops a commit that does not change the value', () => {
      const value = signal('a');
      const accessor = create({ value });
      const onChange = vi.fn();
      accessor.registerOnChange(onChange);

      expect(accessor.commit('a')).toBe(false);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('compares with the supplied equality', () => {
      const value = signal<readonly number[]>([1, 2]);
      const accessor = create({ value, equals: andesShallowArrayEquals });
      const onChange = vi.fn();
      accessor.registerOnChange(onChange);

      accessor.commit([1, 2]);
      accessor.commit([1, 2, 3]);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('works before any form registered a callback', () => {
      const value = signal(0);
      const accessor = create({ value });

      expect(() => accessor.commit(1)).not.toThrow();
      expect(value()).toBe(1);
    });

    it('does not subscribe a calling effect to the value', () => {
      const value = signal(0);
      const accessor = create({ value });
      let runs = 0;
      TestBed.runInInjectionContext(() =>
        effect(() => {
          runs++;
          accessor.commit(1);
        }),
      );
      TestBed.tick();

      value.set(2);
      TestBed.tick();

      expect(runs).toBe(1);
    });
  });

  describe('writeValue', () => {
    it('stores the value without notifying the form', () => {
      const value = signal('a');
      const accessor = create({ value });
      const onChange = vi.fn();
      const onTouched = vi.fn();
      accessor.registerOnChange(onChange);
      accessor.registerOnTouched(onTouched);

      accessor.writeValue('b');

      expect(value()).toBe('b');
      expect(onChange).not.toHaveBeenCalled();
      expect(onTouched).not.toHaveBeenCalled();
    });

    it('passes values through and keeps null when there is no empty value', () => {
      const value = signal<string | null>('a');
      const accessor = create({ value });

      accessor.writeValue(null);
      expect(value()).toBeNull();

      accessor.writeValue(undefined);
      expect(value()).toBeUndefined();
    });

    it('replaces null and undefined with the empty value', () => {
      const value = signal<readonly string[]>(['a']);
      const accessor = create({ value, emptyValue: [] });

      accessor.writeValue(null);
      expect(value()).toEqual([]);

      accessor.writeValue(['b']);
      accessor.writeValue(undefined);
      expect(value()).toEqual([]);
    });

    it('keeps falsy values that are not null', () => {
      const value = signal<unknown>('x');
      const accessor = create({ value, emptyValue: 'empty' });

      accessor.writeValue('');
      expect(value()).toBe('');

      accessor.writeValue(0);
      expect(value()).toBe(0);

      accessor.writeValue(false);
      expect(value()).toBe(false);
    });

    it('prefers coerce over the empty value', () => {
      const value = signal('');
      const accessor = create({
        value,
        emptyValue: 'unused',
        coerce: (raw) => (raw === null ? '' : String(raw)),
      });

      accessor.writeValue(null);
      expect(value()).toBe('');

      accessor.writeValue(42);
      expect(value()).toBe('42');
    });

    it('runs onWrite with the stored value, and only for writes', () => {
      const value = signal(0);
      const onWrite = vi.fn();
      const accessor = create({ value, onWrite });

      accessor.commit(1);
      expect(onWrite).not.toHaveBeenCalled();

      accessor.writeValue(2);
      expect(onWrite).toHaveBeenCalledWith(2);
    });
  });

  describe('disabled', () => {
    it('is enabled by default', () => {
      expect(create({ value: signal(0) }).disabled()).toBe(false);
    });

    it('follows the form state', () => {
      const accessor = create({ value: signal(0) });

      accessor.setDisabledState(true);
      expect(accessor.disabled()).toBe(true);

      accessor.setDisabledState(false);
      expect(accessor.disabled()).toBe(false);
    });

    it('is disabled while either the input or the form says so', () => {
      const own = signal(false);
      const accessor = create({ value: signal(0), disabled: own });

      own.set(true);
      expect(accessor.disabled()).toBe(true);

      accessor.setDisabledState(true);
      own.set(false);
      expect(accessor.disabled()).toBe(true);

      accessor.setDisabledState(false);
      expect(accessor.disabled()).toBe(false);
    });
  });

  describe('markTouched', () => {
    it('forwards every call, because blur-updating controls need each one', () => {
      const accessor = create({ value: signal(0) });
      const onTouched = vi.fn();
      accessor.registerOnTouched(onTouched);

      accessor.markTouched();
      accessor.markTouched();

      expect(onTouched).toHaveBeenCalledTimes(2);
    });

    it('runs the touch hook even without a form', () => {
      const onTouch = vi.fn();
      const accessor = create({ value: signal(0), onTouch });

      accessor.markTouched();

      expect(onTouch).toHaveBeenCalledTimes(1);
    });
  });

  describe('status', () => {
    it('is unbound and quiet when no form directive is on the element', () => {
      const { status } = create({ value: signal(0) });
      TestBed.tick();

      expect(status.bound()).toBe(false);
      expect(status.invalid()).toBe(false);
      expect(status.valid()).toBe(false);
      expect(status.touched()).toBe(false);
      expect(status.dirty()).toBe(false);
      expect(status.pending()).toBe(false);
      expect(status.disabled()).toBe(false);
      expect(status.errors()).toBeNull();
      expect(status.showError()).toBe(false);
    });
  });

  describe('teardown', () => {
    it('stops notifying the form once destroyed', () => {
      const injector = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector),
      );
      const value = signal(0);
      const onTouch = vi.fn();
      const accessor = create({ value, onTouch }, injector);
      const onChange = vi.fn();
      const onTouched = vi.fn();
      accessor.registerOnChange(onChange);
      accessor.registerOnTouched(onTouched);

      injector.destroy();
      accessor.commit(1);
      accessor.markTouched();

      expect(onTouch).not.toHaveBeenCalled();
      expect(value()).toBe(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(onTouched).not.toHaveBeenCalled();
    });

    it('ignores callbacks registered after destruction', () => {
      const injector = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector),
      );
      const accessor = create({ value: signal(0) }, injector);
      const onChange = vi.fn();
      const onTouched = vi.fn();

      injector.destroy();
      accessor.registerOnChange(onChange);
      accessor.registerOnTouched(onTouched);
      accessor.commit(1);
      accessor.markTouched();

      expect(onChange).not.toHaveBeenCalled();
      expect(onTouched).not.toHaveBeenCalled();
    });
  });
});

describe('andesShallowArrayEquals', () => {
  it('compares items by identity and order', () => {
    const shared = {};

    expect(andesShallowArrayEquals([1, 2], [1, 2])).toBe(true);
    expect(andesShallowArrayEquals([shared], [shared])).toBe(true);
    expect(andesShallowArrayEquals([{}], [{}])).toBe(false);
    expect(andesShallowArrayEquals([1, 2], [2, 1])).toBe(false);
    expect(andesShallowArrayEquals([1], [1, 2])).toBe(false);
  });

  it('treats null, undefined and an empty array as the same', () => {
    expect(andesShallowArrayEquals(null, [])).toBe(true);
    expect(andesShallowArrayEquals(undefined, null)).toBe(true);
    expect(andesShallowArrayEquals(null, [1])).toBe(false);
  });

  it('short-circuits on the same reference', () => {
    const list = [1];

    expect(andesShallowArrayEquals(list, list)).toBe(true);
  });
});

describe('provideAndesValueAccessor', () => {
  class Accessor {
    writeValue(): void {
      // Not exercised: only the provider shape matters here.
    }
    registerOnChange(): void {
      // Not exercised.
    }
    registerOnTouched(): void {
      // Not exercised.
    }
  }

  it('registers the component itself as a multi accessor', () => {
    TestBed.configureTestingModule({
      providers: [Accessor, provideAndesValueAccessor(() => Accessor)],
    });

    const accessors = TestBed.inject(NG_VALUE_ACCESSOR);

    expect(accessors).toEqual([TestBed.inject(Accessor)]);
    expect(accessors[0]).toBe(TestBed.inject(Accessor));
  });

  it('registers the object a selector picks from the component', () => {
    class Owner {
      readonly accessor = new Accessor();
    }
    TestBed.configureTestingModule({
      providers: [
        Owner,
        provideAndesValueAccessor(
          () => Owner,
          (owner) => owner.accessor as never,
        ),
      ],
    });

    const [registered] = TestBed.inject(NG_VALUE_ACCESSOR);

    expect(registered).toBe(TestBed.inject(Owner).accessor);
  });
});
