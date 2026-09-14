import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'andes-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
