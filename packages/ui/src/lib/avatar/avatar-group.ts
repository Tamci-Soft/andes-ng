import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'andes-avatar-group',
  imports: [],
  templateUrl: './avatar-group.html',
  styleUrl: './avatar-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-avatar-group',
    '[attr.data-slot]': "'avatar-group'",
  },
})
export class AndesAvatarGroup {}
