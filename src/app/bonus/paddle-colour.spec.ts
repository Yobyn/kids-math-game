import { NO_ITEM, defaultAvatar, itemById } from '../avatar/avatar-model';
import { paddleColour } from './paddle-colour';

describe('the child\'s own colour on the bonus game\'s paddle', () => {
  const kid = (top: string, topColour = '') => ({ ...defaultAvatar(), family: 'kid' as const, top, topColour });

  it('is the colour the child picked for their top', () => {
    expect(paddleColour(kid('striped', '#2e7d32'))).toBe('#2e7d32');
  });

  it('is the top\'s own colour when none was picked, or the one picked is not a colour', () => {
    const own = itemById('striped')!.colour;
    expect(paddleColour(kid('striped'))).toBe(own);
    expect(paddleColour(kid('striped', 'red; background: url(x)'))).toBe(own);
  });

  it('is nothing without a top, for another family, or without a character', () => {
    expect(paddleColour(kid(NO_ITEM, '#2e7d32'))).toBeNull();
    expect(paddleColour({ ...kid('striped', '#2e7d32'), family: 'creature' })).toBeNull();
    expect(paddleColour(null)).toBeNull();
  });
});
