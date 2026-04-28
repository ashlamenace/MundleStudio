/**
 * Input handling module
 * Manages keyboard, mouse and touch input
 */

export class Input {
    constructor(canvas) {
        this.canvas = canvas;

        // Keyboard state
        this.keys = {};
        this.keysJustPressed = {};
        this.keysJustReleased = {};

        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            leftDown: false,
            rightDown: false,
            leftJustPressed: false,
            rightJustPressed: false,
            leftJustReleased: false,
            rightJustReleased: false,
            wheel: 0
        };

        // Unified virtual controls for touch/gamepad-like UI.
        this.virtualActions = {};
        this.virtualJustPressed = {};
        this.virtualJustReleased = {};
        this.virtualMovement = { x: 0, y: 0 };
        this.touchMode = false;
        this.pointerAimActive = false;
        this.hasPointerAim = false;

        // Key bindings (AZERTY and QWERTY support)
        this.bindings = {
            moveUp: ['KeyW', 'KeyZ'],
            moveDown: ['KeyS'],
            moveLeft: ['KeyA', 'KeyQ'],
            moveRight: ['KeyD'],
            slot1: ['Digit1'],
            slot2: ['Digit2'],
            slot3: ['Digit3'],
            slot4: ['Digit4'],
            slot5: ['Digit5'],
            buildMenu: ['KeyB'],
            inventory: ['KeyI'],
            interact: ['KeyE'],
            dash: ['ShiftLeft', 'ShiftRight'],
            aoe: ['KeyR'],
            heal: ['KeyF'],
            attack: [],
            cancel: ['Space', 'Escape'],
            pause: ['Escape']
        };

        this._setupEventListeners();
        this._setupMobileControls();
    }

    _setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (this._isEditableTarget(e.target)) return;

            if (!this.keys[e.code]) {
                this.keysJustPressed[e.code] = true;
            }
            this.keys[e.code] = true;

            // Prevent default for game keys
            if (this._isGameKey(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this._isEditableTarget(e.target)) return;

            this.keys[e.code] = false;
            this.keysJustReleased[e.code] = true;
        });

        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this._setPointerScreenPosition(e.clientX, e.clientY, rect);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.button === 0) {
                if (!this.mouse.leftDown) {
                    this.mouse.leftJustPressed = true;
                }
                this.mouse.leftDown = true;
            } else if (e.button === 2) {
                if (!this.mouse.rightDown) {
                    this.mouse.rightJustPressed = true;
                }
                this.mouse.rightDown = true;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.leftDown = false;
                this.mouse.leftJustReleased = true;
            } else if (e.button === 2) {
                this.mouse.rightDown = false;
                this.mouse.rightJustReleased = true;
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.mouse.wheel = Math.sign(e.deltaY);
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') return;
            this.touchMode = true;
            this.pointerAimActive = true;
            this.hasPointerAim = true;
            this.canvas.setPointerCapture?.(e.pointerId);
            this._setPointerScreenPosition(e.clientX, e.clientY);
            this.setVirtualAction('attack', true);
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'mouse' || !this.pointerAimActive) return;
            this.touchMode = true;
            this._setPointerScreenPosition(e.clientX, e.clientY);
            e.preventDefault();
        }, { passive: false });

        const endTouchPointer = (e) => {
            if (e.pointerType === 'mouse') return;
            this.pointerAimActive = false;
            this.setVirtualAction('attack', false);
            e.preventDefault();
        };
        this.canvas.addEventListener('pointerup', endTouchPointer, { passive: false });
        this.canvas.addEventListener('pointercancel', endTouchPointer, { passive: false });

        // Handle window blur
        window.addEventListener('blur', () => {
            this.keys = {};
            this.virtualActions = {};
            this.virtualMovement = { x: 0, y: 0 };
            this.pointerAimActive = false;
            this.mouse.leftDown = false;
            this.mouse.rightDown = false;
        });
    }

    _setPointerScreenPosition(clientX, clientY, rect = this.canvas.getBoundingClientRect()) {
        this.mouse.x = clientX - rect.left;
        this.mouse.y = clientY - rect.top;
        this.hasPointerAim = true;
    }

    _setupMobileControls() {
        const controls = document.getElementById('mobile-controls');
        if (!controls) return;

        const movementPad = document.getElementById('mobile-joystick');
        const knob = document.getElementById('mobile-joystick-knob');
        let joystickPointerId = null;

        const updateJoystick = (e) => {
            if (!movementPad) return;
            const rect = movementPad.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const maxRadius = rect.width * 0.38;
            let dx = e.clientX - cx;
            let dy = e.clientY - cy;
            const dist = Math.hypot(dx, dy);
            if (dist > maxRadius && dist > 0) {
                dx = dx / dist * maxRadius;
                dy = dy / dist * maxRadius;
            }

            const strength = maxRadius > 0 ? Math.min(1, Math.hypot(dx, dy) / maxRadius) : 0;
            this.virtualMovement.x = maxRadius ? (dx / maxRadius) * strength : 0;
            this.virtualMovement.y = maxRadius ? (dy / maxRadius) * strength : 0;

            if (knob) {
                knob.style.transform = `translate(${dx}px, ${dy}px)`;
            }
        };

        const resetJoystick = () => {
            joystickPointerId = null;
            this.virtualMovement.x = 0;
            this.virtualMovement.y = 0;
            if (knob) knob.style.transform = 'translate(0, 0)';
        };

        if (movementPad) {
            movementPad.addEventListener('pointerdown', (e) => {
                this.touchMode = true;
                joystickPointerId = e.pointerId;
                movementPad.setPointerCapture?.(e.pointerId);
                updateJoystick(e);
                e.preventDefault();
            }, { passive: false });
            movementPad.addEventListener('pointermove', (e) => {
                if (e.pointerId !== joystickPointerId) return;
                updateJoystick(e);
                e.preventDefault();
            }, { passive: false });
            movementPad.addEventListener('pointerup', resetJoystick);
            movementPad.addEventListener('pointercancel', resetJoystick);
        }

        controls.querySelectorAll('[data-mobile-action]').forEach((button) => {
            const action = button.dataset.mobileAction;
            const mode = button.dataset.mobileMode || 'hold';
            const press = (e) => {
                this.touchMode = true;
                if (mode === 'tap') {
                    this.pulseAction(action);
                } else {
                    this.setVirtualAction(action, true);
                    button.classList.add('pressed');
                }
                e.preventDefault();
                e.stopPropagation();
            };
            const release = (e) => {
                if (mode !== 'tap') {
                    this.setVirtualAction(action, false);
                    button.classList.remove('pressed');
                }
                e.preventDefault();
                e.stopPropagation();
            };

            button.addEventListener('pointerdown', press, { passive: false });
            button.addEventListener('pointerup', release, { passive: false });
            button.addEventListener('pointercancel', release, { passive: false });
            button.addEventListener('lostpointercapture', release, { passive: false });
        });
    }

    _isGameKey(code) {
        for (const binding of Object.values(this.bindings)) {
            if (binding.includes(code)) return true;
        }
        return false;
    }

    _isEditableTarget(target) {
        if (!(target instanceof Element)) return false;

        return target.matches('input, textarea, select') ||
            target.isContentEditable ||
            !!target.closest('[contenteditable=""], [contenteditable="true"]');
    }

    /**
     * Update mouse world position based on camera
     */
    updateWorldPosition(camera) {
        this.mouse.worldX = this.mouse.x / camera.zoom + camera.x - (this.canvas.width / 2) / camera.zoom;
        this.mouse.worldY = this.mouse.y / camera.zoom + camera.y - (this.canvas.height / 2) / camera.zoom;
    }

    /**
     * Check if a key is currently held down
     */
    isKeyDown(code) {
        if (Array.isArray(code)) {
            return code.some(k => this.keys[k]);
        }
        return this.keys[code] || false;
    }

    /**
     * Check if a bound action is currently held
     */
    isActionDown(action) {
        const codes = this.bindings[action];
        const keyboardDown = codes ? codes.some(code => this.keys[code]) : false;
        return keyboardDown || !!this.virtualActions[action];
    }

    /**
     * Check if a bound action was just pressed
     */
    isActionJustPressed(action) {
        const codes = this.bindings[action];
        const keyboardPressed = codes ? codes.some(code => this.keysJustPressed[code]) : false;
        return keyboardPressed || !!this.virtualJustPressed[action];
    }

    /**
     * Check if a bound action is currently pressed (alias for isActionDown)
     * Also handles mouse-based actions like 'attack'
     */
    isActionPressed(action) {
        // Handle attack action with left mouse button
        if (action === 'attack') {
            return this.mouse.leftDown || !!this.virtualActions.attack;
        }
        return this.isActionDown(action);
    }

    setVirtualAction(action, down) {
        if (down && !this.virtualActions[action]) {
            this.virtualJustPressed[action] = true;
        } else if (!down && this.virtualActions[action]) {
            this.virtualJustReleased[action] = true;
        }
        this.virtualActions[action] = down;
    }

    pulseAction(action) {
        this.virtualJustPressed[action] = true;
        this.virtualActions[action] = false;
    }

    /**
     * Get current mouse position in world coordinates
     */
    getMousePosition() {
        return {
            x: this.mouse.worldX,
            y: this.mouse.worldY
        };
    }

    /**
     * Get movement vector (normalized)
     */
    getMovementVector() {
        let dx = 0;
        let dy = 0;

        if (this.isActionDown('moveUp')) dy -= 1;
        if (this.isActionDown('moveDown')) dy += 1;
        if (this.isActionDown('moveLeft')) dx -= 1;
        if (this.isActionDown('moveRight')) dx += 1;

        dx += this.virtualMovement.x;
        dy += this.virtualMovement.y;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }

    /**
     * Clear frame-specific states (call at end of update)
     */
    endFrame() {
        this.keysJustPressed = {};
        this.keysJustReleased = {};
        this.virtualJustPressed = {};
        this.virtualJustReleased = {};
        this.mouse.leftJustPressed = false;
        this.mouse.rightJustPressed = false;
        this.mouse.leftJustReleased = false;
        this.mouse.rightJustReleased = false;
        this.mouse.wheel = 0;
    }
}

export default Input;
