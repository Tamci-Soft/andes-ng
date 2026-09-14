import * as ui from './index';

describe('@andes-ng/ui public entry point', () => {
  it('loads and exposes no components yet', () => {
    expect(Object.keys(ui)).toHaveLength(0);
  });
});
