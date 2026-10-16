/** Desktop menu/pause key bindings (KeyboardEvent.code). Movement and the four actions are in MatchScene.padKey. */
export type KeyIntent =
  | 'selectPass'
  | 'selectShoot'
  | 'retry'
  | 'back';

export const KEY_BINDINGS: Readonly<Record<string, KeyIntent>> = {
  Digit1: 'selectPass',
  Digit2: 'selectShoot',
  KeyR: 'retry',
  Enter: 'retry',
  Escape: 'back',
  Backspace: 'back',
};
