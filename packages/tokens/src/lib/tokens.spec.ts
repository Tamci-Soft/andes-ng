import { ANDES_THEME_ATTRIBUTE, ANDES_TOKEN_PREFIX } from '../index';

describe('Andes design tokens', () => {
  it('uses stable, namespaced public identifiers', () => {
    expect(ANDES_TOKEN_PREFIX).toBe('--andes-');
    expect(ANDES_THEME_ATTRIBUTE).toBe('data-andes-theme');
  });
});
