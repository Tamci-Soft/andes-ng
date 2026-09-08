import * as testing from './index';

describe('@andes-ng/testing public entry point', () => {
  it('loads and exposes no helpers yet', () => {
    expect(Object.keys(testing)).toHaveLength(0);
  });
});
