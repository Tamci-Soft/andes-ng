import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AndesButton } from '@andes-ng/ui';

@Component({
  imports: [AndesButton],
  selector: 'andes-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
