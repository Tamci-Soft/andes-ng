import { getAndesButtonByName } from './index';

describe('getAndesButtonByName', () => {
  function renderButtons(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
      <andes-button><button>Save</button></andes-button>
      <andes-button><button>Cancel</button></andes-button>
    `;
    return container;
  }

  it('finds the native button matching the accessible name', () => {
    const button = getAndesButtonByName(renderButtons(), 'Cancel');

    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent?.trim()).toBe('Cancel');
  });

  it('throws when no matching button exists', () => {
    expect(() => getAndesButtonByName(renderButtons(), 'Delete')).toThrow(
      'No andes-button found with accessible name "Delete"',
    );
  });
});
