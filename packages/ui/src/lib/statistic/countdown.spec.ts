import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesCountdown } from './countdown';
import {
  AndesCountdownTarget,
  formatDuration,
  hasMillisecondToken,
  toIsoDuration,
  toTimestamp,
} from './countdown-format';

const START = new Date('2026-06-01T12:00:00.000Z').getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

@Component({
  imports: [AndesCountdown],
  template: `
    <andes-countdown
      title="Offer ends in"
      [value]="value()"
      [format]="format()"
      [mode]="mode()"
      [autoStart]="autoStart()"
      [interval]="interval()"
      [aria-label]="'Offer timer'"
      (finish)="finishes = finishes + 1"
      (changed)="changes.push($event)"
    />
  `,
})
class HostComponent {
  readonly value = signal<AndesCountdownTarget>(START + 65 * SECOND);
  readonly format = signal('HH:mm:ss');
  readonly mode = signal<'down' | 'up'>('down');
  readonly autoStart = signal(true);
  readonly interval = signal(1000);
  finishes = 0;
  readonly changes: number[] = [];
}

describe('countdown formatting', () => {
  it('pads repeated tokens', () => {
    expect(formatDuration(5 * HOUR + 7 * MINUTE + 9 * SECOND, 'HH:mm:ss')).toBe(
      '05:07:09',
    );
    expect(formatDuration(5 * HOUR + 7 * MINUTE + 9 * SECOND, 'H:m:s')).toBe(
      '5:7:9',
    );
  });

  it('lets the largest unit present absorb everything above it', () => {
    expect(formatDuration(2 * DAY + 3 * HOUR, 'HH:mm:ss')).toBe('51:00:00');
    expect(formatDuration(2 * DAY + 3 * HOUR, 'D HH')).toBe('2 03');
    expect(formatDuration(125 * SECOND, 'm [min] s [s]')).toBe('2 min 5 s');
    expect(formatDuration(125 * SECOND, 's')).toBe('125');
  });

  it('keeps literal text, including non-latin characters', () => {
    expect(formatDuration(DAY + 2 * HOUR, 'D 天 HH')).toBe('1 天 02');
    expect(formatDuration(DAY, '[D] D [days]')).toBe('D 1 days');
  });

  it('renders milliseconds with 1 to 3 digits', () => {
    expect(formatDuration(5 * SECOND + 42, 'ss.SSS')).toBe('05.042');
    expect(formatDuration(5 * SECOND + 42, 'ss.SS')).toBe('05.04');
    expect(formatDuration(5 * SECOND + 999, 's.S')).toBe('5.9');
  });

  it('handles months and years with fixed lengths', () => {
    expect(formatDuration(400 * DAY, 'Y [y] M [m] D [d]')).toBe('1 y 1 m 5 d');
  });

  it('clamps negative and fractional input', () => {
    expect(formatDuration(-500, 'HH:mm:ss')).toBe('00:00:00');
    expect(formatDuration(1999.9, 's')).toBe('1');
  });

  it('detects millisecond tokens outside escapes', () => {
    expect(hasMillisecondToken('ss.SSS')).toBe(true);
    expect(hasMillisecondToken('HH:mm:ss')).toBe(false);
    expect(hasMillisecondToken('HH [Seconds]')).toBe(false);
  });

  it('builds ISO 8601 durations', () => {
    expect(toIsoDuration(0)).toBe('PT0S');
    expect(toIsoDuration(HOUR + 2 * MINUTE + 3 * SECOND)).toBe('PT1H2M3S');
    expect(toIsoDuration(DAY + 500)).toBe('P1DT0.5S');
    expect(toIsoDuration(2 * DAY)).toBe('P2D');
    expect(toIsoDuration(-4)).toBe('PT0S');
  });

  it('converts targets to timestamps', () => {
    expect(toTimestamp(START)).toBe(START);
    expect(toTimestamp(new Date(START))).toBe(START);
    expect(toTimestamp(String(START))).toBe(START);
    expect(toTimestamp('2026-06-01T12:00:00.000Z')).toBe(START);
    expect(toTimestamp(null)).toBeNaN();
    expect(toTimestamp('soon')).toBeNaN();
  });
});

describe('AndesCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  const fixtures: ComponentFixture<unknown>[] = [];

  afterEach(() => {
    fixtures.splice(0).forEach((fixture) => fixture.destroy());
    vi.useRealTimers();
    setVisibility('visible');
  });

  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
  }

  function create(setup?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    fixtures.push(fixture);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const text = () =>
      (fixture.nativeElement.querySelector('time') as HTMLElement).textContent;
    const advance = (ms: number) => {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    };
    return { fixture, host, text, advance };
  }

  function flush(fixture: ComponentFixture<HostComponent>) {
    fixture.detectChanges();
    fixture.detectChanges();
  }

  describe('countdown', () => {
    it('shows the time left in the format', () => {
      const { text } = create();

      expect(text()).toBe('00:01:05');
    });

    it('is a timer with a machine-readable duration', () => {
      const { fixture } = create();
      const time = fixture.nativeElement.querySelector('time') as HTMLElement;

      expect(time.getAttribute('role')).toBe('timer');
      expect(time.getAttribute('datetime')).toBe('PT1M5S');
    });

    it('ticks once a second', () => {
      const { text, advance } = create();

      advance(1000);
      expect(text()).toBe('00:01:04');
      advance(3000);
      expect(text()).toBe('00:01:01');
    });

    it('flips on the second boundary, not on a fixed 1s phase', () => {
      const { text, advance } = create((host) => host.value.set(START + 5500));

      // A countdown rounds up, so 5.5s left reads 6 and drops to 5 once exactly 5s remain.
      expect(text()).toBe('00:00:06');
      advance(499);
      expect(text()).toBe('00:00:06');
      advance(2);
      expect(text()).toBe('00:00:05');
    });

    it('corrects drift from the clock rather than counting ticks', () => {
      const { text, advance, fixture } = create();

      // A throttled timer wakes up 10 seconds late.
      vi.setSystemTime(START + 10 * SECOND);
      advance(1000);

      expect(text()).toBe('00:00:54');
      fixture.detectChanges();
    });

    it('rounds up to the smallest unit shown so it reads 1 until it ends', () => {
      const { host, text, advance } = create((h) => h.value.set(START + 400));

      expect(text()).toBe('00:00:01');
      advance(399);
      expect(text()).toBe('00:00:01');
      advance(1);
      expect(text()).toBe('00:00:00');
      expect(host.finishes).toBe(1);
    });

    it('updates a minutes-only format once a minute', () => {
      const { text, advance } = create((h) => {
        h.format.set('HH:mm');
        h.value.set(START + 3 * MINUTE + 10 * SECOND);
      });

      expect(text()).toBe('00:04');
      advance(10 * SECOND);
      expect(text()).toBe('00:03');
      expect(vi.getTimerCount()).toBe(1);
    });

    it('keeps exactly one timer armed', () => {
      create();

      expect(vi.getTimerCount()).toBe(1);
    });

    it('emits finish once at zero and stops the timer', () => {
      const { host, text, advance } = create();

      advance(64 * SECOND);
      expect(host.finishes).toBe(0);
      advance(2 * SECOND);

      expect(text()).toBe('00:00:00');
      expect(host.finishes).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
      advance(10 * SECOND);
      expect(host.finishes).toBe(1);
    });

    it('announces completion politely', () => {
      const { fixture, advance } = create();
      const status = fixture.nativeElement.querySelector(
        '[role="status"]',
      ) as HTMLElement;

      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toBe('');
      advance(70 * SECOND);

      expect(status.textContent).toBe('Time is up');
    });

    it('does not announce every tick', () => {
      const { fixture, advance } = create();
      const live = fixture.nativeElement.querySelectorAll('[aria-live]');

      advance(5 * SECOND);

      expect(live).toHaveLength(1);
      expect(live[0].getAttribute('role')).toBe('status');
    });

    it('finishes straight away when the target is already past', () => {
      const { host, text } = create((h) => h.value.set(START - 5000));

      expect(text()).toBe('00:00:00');
      expect(host.finishes).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('marks the host as finished', () => {
      const { fixture, advance } = create();
      advance(70 * SECOND);

      expect(
        (
          fixture.nativeElement.querySelector('andes-countdown') as HTMLElement
        ).hasAttribute('data-finished'),
      ).toBe(true);
    });

    it('restarts for a new target and can finish again', () => {
      const { fixture, host, text, advance } = create();
      advance(70 * SECOND);
      expect(host.finishes).toBe(1);

      host.value.set(Date.now() + 3 * SECOND);
      flush(fixture);
      expect(text()).toBe('00:00:03');

      advance(4 * SECOND);
      expect(host.finishes).toBe(2);
    });

    it('survives an invalid target', () => {
      const { host, text } = create((h) => h.value.set('soon'));

      expect(text()).toBe('00:00:00');
      expect(host.finishes).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('emits changed with the displayed duration', () => {
      const { host, advance } = create();

      advance(1000);

      expect(host.changes.at(-1)).toBe(64 * SECOND);
      expect(host.changes.length).toBeGreaterThan(1);
    });

    it('does not leak the host aria-label or title', () => {
      const { fixture } = create();
      const root = fixture.nativeElement.querySelector(
        'andes-countdown',
      ) as HTMLElement;

      expect(root.hasAttribute('aria-label')).toBe(false);
      expect(root.hasAttribute('title')).toBe(false);
    });
  });

  describe('count up', () => {
    it('counts the time since the value', () => {
      const { text, advance } = create((host) => {
        host.mode.set('up');
        host.value.set(START - 90 * SECOND);
      });

      expect(text()).toBe('00:01:30');
      advance(1000);
      expect(text()).toBe('00:01:31');
    });

    it('never emits finish', () => {
      const { host, advance } = create((h) => {
        h.mode.set('up');
        h.value.set(START - 90 * SECOND);
      });

      advance(10 * SECOND);

      expect(host.finishes).toBe(0);
      expect(vi.getTimerCount()).toBe(1);
    });

    it('shows zero for a start in the future', () => {
      const { text } = create((h) => {
        h.mode.set('up');
        h.value.set(START + 10 * SECOND);
      });

      expect(text()).toBe('00:00:00');
    });
  });

  describe('start and stop', () => {
    it('does not tick with autoStart off until started', () => {
      const { fixture, text, advance } = create((h) => h.autoStart.set(false));
      const countdown = fixture.debugElement.children[0]
        .componentInstance as AndesCountdown;

      expect(vi.getTimerCount()).toBe(0);
      advance(3000);
      expect(text()).toBe('00:01:05');

      countdown.start();
      fixture.detectChanges();
      expect(text()).toBe('00:01:02');
      expect(vi.getTimerCount()).toBe(1);
      expect(countdown.running()).toBe(true);
    });

    it('stop freezes the display and clears the timer', () => {
      const { fixture, text, advance } = create();
      const countdown = fixture.debugElement.children[0]
        .componentInstance as AndesCountdown;
      advance(2000);

      countdown.stop();
      advance(10 * SECOND);

      expect(text()).toBe('00:01:03');
      expect(vi.getTimerCount()).toBe(0);
      expect(countdown.running()).toBe(false);
    });

    it('start after stop catches up with the clock', () => {
      const { fixture, text, advance } = create();
      const countdown = fixture.debugElement.children[0]
        .componentInstance as AndesCountdown;
      advance(2000);
      countdown.stop();
      advance(10 * SECOND);

      countdown.start();
      fixture.detectChanges();

      expect(text()).toBe('00:00:53');
    });

    it('stays stopped when the target changes', () => {
      const { fixture, host, text } = create();
      const countdown = fixture.debugElement.children[0]
        .componentInstance as AndesCountdown;
      countdown.stop();

      host.value.set(START + 30 * SECOND);
      flush(fixture);

      expect(text()).toBe('00:00:30');
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('hidden tab', () => {
    it('pauses the timer while hidden and catches up when visible', () => {
      const { fixture, text, advance } = create();

      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(vi.getTimerCount()).toBe(0);

      advance(20 * SECOND);
      expect(text()).toBe('00:01:05');

      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();

      expect(text()).toBe('00:00:45');
      expect(vi.getTimerCount()).toBe(1);
    });

    it('emits finish on return when the target passed while hidden', () => {
      const { fixture, host } = create();
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));

      vi.setSystemTime(START + 5 * MINUTE);
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();

      expect(host.finishes).toBe(1);
    });

    it('does not arm a timer when created in a hidden tab', () => {
      setVisibility('hidden');
      create();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not resume a stopped countdown on visibility change', () => {
      const { fixture } = create();
      const countdown = fixture.debugElement.children[0]
        .componentInstance as AndesCountdown;
      countdown.stop();
      // The framework's own change-detection timers may be pending; only ours must not appear.
      const before = vi.getTimerCount();

      document.dispatchEvent(new Event('visibilitychange'));

      expect(vi.getTimerCount()).toBe(before);
      expect(countdown.running()).toBe(false);
    });
  });

  describe('format and cadence', () => {
    it('re-renders when the format changes', () => {
      const { fixture, host, text } = create();
      host.format.set('m [min] s [s]');
      flush(fixture);

      expect(text()).toBe('1 min 5 s');
    });

    it('ticks fast for millisecond formats', () => {
      const { text, advance } = create((h) => h.format.set('ss.SSS'));

      expect(text()).toBe('65.000');
      advance(16);
      expect(text()).toBe('64.992');
    });

    it('slows millisecond formats down under reduced motion', () => {
      vi.stubGlobal(
        'matchMedia',
        (query: string) =>
          ({
            matches: query.includes('reduce'),
            media: query,
          }) as MediaQueryList,
      );
      const { advance } = create((h) => h.format.set('ss.SSS'));

      advance(500);
      expect(vi.getTimerCount()).toBe(1);
      vi.unstubAllGlobals();
    });

    it('honours a custom interval', () => {
      const { text, advance } = create((h) => {
        h.interval.set(5000);
        h.format.set('mm:ss');
      });

      expect(text()).toBe('01:05');
      advance(1000);
      expect(text()).toBe('01:05');
      advance(4000);
      expect(text()).toBe('01:00');
    });
  });

  describe('cleanup', () => {
    it('clears the timer and listener on destroy', () => {
      const { fixture } = create();
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
      expect(removeSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
    });
  });

  describe('stylesheet contract', () => {
    it('reuses the statistic look', () => {
      const source = readFileSync(
        'packages/ui/src/lib/statistic/countdown.ts',
        'utf8',
      );

      expect(source).toContain("'./statistic.css'");
    });
  });
});
