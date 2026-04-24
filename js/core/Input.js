/**
 * Input handling module
 * Manages keyboard and mouse input
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
            cancel: ['Space', 'Escape'],
            pause: ['Escape']
        };

        this._setupEventListeners();
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
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
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

        // Handle window blur
        window.addEventListener('blur', () => {
            this.keys = {};
            this.mouse.leftDown = false;
            this.mouse.rightDown = false;
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
        if (!codes) return false;
        return codes.some(code => this.keys[code]);
    }

    /**
     * Check if a bound action was just pressed
     */
    isActionJustPressed(action) {
        const codes = this.bindings[action];
        if (!codes) return false;
        return codes.some(code => this.keysJustPressed[code]);
    }

    /**
     * Check if a bound action is currently pressed (alias for isActionDown)
     * Also handles mouse-based actions like 'attack'
     */
    isActionPressed(action) {
        // Handle attack action with left mouse button
        if (action === 'attack') {
            return this.mouse.leftDown;
        }
        return this.isActionDown(action);
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
        this.mouse.leftJustPressed = false;
        this.mouse.rightJustPressed = false;
        this.mouse.leftJustReleased = false;
        this.mouse.rightJustReleased = false;
        this.mouse.wheel = 0;
    }
}

export default Input;
