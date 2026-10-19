# @andes-ng/testing

Stable test helpers for applications that consume Andes NG. Helpers query Andes public selectors and semantics, never implementation details.

## Helpers

- `getAndesButtonByName(container, name)`: returns the native `<button>` inside the `andes-button` whose text is `name`, or throws if there is none.

```ts
import { getAndesButtonByName } from '@andes-ng/testing';

getAndesButtonByName(fixture.nativeElement, 'Save').click();
```

Harnesses and query helpers are added together with the components they support, so a helper is never published before the contract it queries.
