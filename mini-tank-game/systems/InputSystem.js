export class InputSystem {
  constructor() {
    this.keys  = {};
    this._just = {}; // tracks single-frame presses

    this._onKeyDown = (e) => {
      if (!this.keys[e.code]) this._just[e.code] = true; // only on initial press
      this.keys[e.code] = true;
      const blocked = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (blocked.includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  isDown(code)    { return !!this.keys[code]; }

  // Returns true only on the first frame the key is pressed
  isPressed(code) { return !!this._just[code]; }

  // Programmatically press/release a key (used by touch controls)
  press(code)   { if (!this.keys[code]) this._just[code] = true; this.keys[code] = true; }
  release(code) { this.keys[code] = false; }

  // Call once per frame after all input is consumed
  flush() { this._just = {}; }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
