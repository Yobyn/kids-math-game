import {
  DELETE_KEY,
  KEYPAD_KEYS,
  MAX_DIGITS,
  applyKey,
  digitsIn,
  keyFace,
  keyLabel,
  placeholderFor
} from './answer-entry';

/** Every key pressed in turn, starting from an empty box. */
function type(keys: string): string {
  return keys.split('').reduce((answer, key) => applyKey(answer, key), '');
}

describe('the keys there are', () => {
  it('has the ten digits, a minus and a delete', () => {
    expect(KEYPAD_KEYS.length).toBe(12);
    for (let digit = 0; digit <= 9; digit++) {
      expect(KEYPAD_KEYS).toContain(String(digit));
    }
    expect(KEYPAD_KEYS).toContain('-');
    expect(KEYPAD_KEYS).toContain(DELETE_KEY);
  });

  it('draws the delete key rather than spelling it, and says it out loud', () => {
    expect(keyFace(DELETE_KEY)).not.toBe(DELETE_KEY);
    expect(keyLabel(DELETE_KEY)).toBe('delete');
    // "⌫" is not a word, so the label has to be one
    expect(keyLabel(DELETE_KEY)).toMatch(/[a-z]/);
  });

  it('draws every other key as itself', () => {
    KEYPAD_KEYS.filter(key => key !== DELETE_KEY).forEach(key => {
      expect(keyFace(key)).toBe(key);
      expect(keyLabel(key)).toBe(key);
    });
  });
});

describe('typing an answer', () => {
  it('appends digits in order', () => {
    expect(type('42')).toBe('42');
  });

  it('deletes the last character', () => {
    expect(applyKey('42', DELETE_KEY)).toBe('4');
  });

  it('deletes nothing from an empty box rather than breaking', () => {
    expect(applyKey('', DELETE_KEY)).toBe('');
  });

  it('toggles the minus rather than inserting it twice', () => {
    expect(applyKey('7', '-')).toBe('-7');
    expect(applyKey('-7', '-')).toBe('7');
  });

  it('puts the minus at the front however late it is pressed', () => {
    // A minus is only meaningful there, and a child who typed one in the
    // middle has made a mistake the game should not have allowed
    expect(type('123-')).toBe('-123');
  });

  it('stops at six digits so the answer stays readable', () => {
    expect(type('1234567890')).toBe('123456');
    expect(digitsIn(type('1234567890'))).toBe(MAX_DIGITS);
  });

  it('does not count the minus against the digit limit', () => {
    const negative = applyKey(type('123456'), '-');

    expect(negative).toBe('-123456');
    expect(digitsIn(negative)).toBe(MAX_DIGITS);
  });

  it('survives a box that is not a string', () => {
    expect(applyKey(null as any, '4')).toBe('4');
    expect(applyKey(undefined as any, '4')).toBe('4');
    expect(applyKey(42 as any, '1')).toBe('421');
  });
});

describe('every key, from every state of the box', () => {
  const states = ['', '4', '-4', '123456', '-123456', '0'];

  it('never produces something that is not a number a child could mean', () => {
    states.forEach(start => {
      KEYPAD_KEYS.forEach(key => {
        const after = applyKey(start, key);
        expect(after).toMatch(/^-?\d*$/);
      });
    });
  });

  it('never grows past the limit, whichever key is pressed', () => {
    states.forEach(start => {
      KEYPAD_KEYS.forEach(key => {
        expect(digitsIn(applyKey(start, key))).toBeLessThanOrEqual(MAX_DIGITS);
      });
    });
  });

  it('never puts a minus anywhere but the front', () => {
    states.forEach(start => {
      KEYPAD_KEYS.forEach(key => {
        expect(applyKey(start, key).slice(1)).not.toContain('-');
      });
    });
  });

  it('can always be undone back to empty', () => {
    // A child who mis-typed must be able to get back to nothing
    states.forEach(start => {
      let answer = start;
      for (let press = 0; press < 20 && answer !== ''; press++) {
        answer = applyKey(answer, DELETE_KEY);
      }
      expect(answer).toBe('');
    });
  });

  it('types every number a round can ask for', () => {
    // Sweeping real answers rather than a couple of remembered ones
    for (let value = 0; value <= 1000; value++) {
      expect(type(String(value))).toBe(String(value));
    }
  });
});

describe('the prompt in an empty box', () => {
  it('shows a question mark when there is nothing typed', () => {
    expect(placeholderFor('')).toBe('?');
    expect(placeholderFor(null as any)).toBe('?');
  });

  it('gets out of the way once there is', () => {
    expect(placeholderFor('4')).toBe('');
    expect(placeholderFor('-')).toBe('');
  });
});
