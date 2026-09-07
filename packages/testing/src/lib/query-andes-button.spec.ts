import { queryAndesButton } from './query-andes-button';

describe('queryAndesButton', () => {
  it('finds the native Andes button without exposing Brain selectors', () => {
    const host = document.createElement('div');
    host.innerHTML = '<button andesButton>Guardar</button>';

    expect(queryAndesButton(host)?.textContent).toBe('Guardar');
  });
});
