import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesUploadBase } from './upload-base';
import { AndesUploadIcon } from './upload-icon';

/**
 * Click-to-select upload. Project the trigger (a button, an icon...) as content; the real,
 * visually hidden file input stays focusable behind it and is the control's single tab stop.
 * Works with Forms (the value is the file list) and inside `andes-form-field`.
 */
@Component({
  selector: 'andes-upload',
  exportAs: 'andesUpload',
  imports: [NgTemplateOutlet, AndesUploadIcon],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesUpload),
      multi: true,
    },
  ],
})
export class AndesUpload extends AndesUploadBase {}

/**
 * The same control with a drag-and-drop area as its trigger: an icon, a title and a hint
 * (`dropIcon`, `dropTitle`, `dropHint`), highlighted while files are dragged over it. Content
 * projected into it shows under the hint.
 */
@Component({
  selector: 'andes-upload-dragger',
  exportAs: 'andesUploadDragger',
  imports: [NgTemplateOutlet, AndesUploadIcon],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesUploadDragger),
      multi: true,
    },
  ],
})
export class AndesUploadDragger extends AndesUploadBase {
  protected override readonly dragMode = true;
}
