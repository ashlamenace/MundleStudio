/**
 * Audio System
 * - Prefers external SFX/BGM files for richer game feel
 * - Falls back to procedural Web Audio tones when unavailable
 */

export class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this._proceduralAvailable = true;
        this.volume = 0.4;
        this.sampleMix = 0.75;
        this.musicMix = 0.22;

        // Rate-limiting: avoid same sound spamming
        this._lastPlayed = {};
        this._minInterval = { hit: 50, swing: 80, build: 200, collect: 100, level: 500, boss: 1000 };
        this._sampleDefs = {};
        this.musicTrack = null;

        this._init();
        this._initSampleAudio();
        this._bindUnlockHandlers();
    }

    _init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('[Audio] Web Audio API unavailable:', e);
            this._proceduralAvailable = false;
        }
    }

    _assetUrl(relativePath) {
        return new URL(relativePath, import.meta.url).href;
    }

    _initSampleAudio() {
        if (typeof Audio === 'undefined') return;

        this._sampleDefs = {
            hit: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/hit_physical_1.ogg'), 1.0],
                [this._assetUrl('../../assets/audio/sfx/hit_physical_2.ogg'), 1.0]
            ]),
            swing: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/swing_1.ogg'), 0.9],
                [this._assetUrl('../../assets/audio/sfx/swing_2.ogg'), 0.9]
            ]),
            build: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/build_1.ogg'), 0.85],
                [this._assetUrl('../../assets/audio/sfx/build_2.ogg'), 0.8]
            ]),
            collect: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/collect_1.ogg'), 0.65],
                [this._assetUrl('../../assets/audio/sfx/collect_2.ogg'), 0.65]
            ]),
            level: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/level_up_1.ogg'), 0.8]
            ]),
            boss: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/boss_alert_1.ogg'), 0.9]
            ]),
            explosion: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/explosion_1.ogg'), 0.9]
            ]),
            artifact: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/artifact_1.ogg'), 0.8]
            ]),
            objective: this._makeSampleDefs([
                [this._assetUrl('../../assets/audio/sfx/objective_complete_1.ogg'), 0.75]
            ])
        };

        this.musicTrack = new Audio(this._assetUrl('../../assets/audio/music/bg_crystal_caves_v1_2.mp3'));
        this.musicTrack.preload = 'auto';
        this.musicTrack.loop = true;
        this._updateMusicVolume();
    }

    _makeSampleDefs(entries) {
        return entries.map(([src, gain]) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            return { audio, gain };
        });
    }

    _pickRandom(list) {
        return list[(Math.random() * list.length) | 0];
    }

    _bindUnlockHandlers() {
        if (typeof document === 'undefined') return;
        const unlock = () => this.resume();
        document.addEventListener('pointerdown', unlock, { passive: true });
        document.addEventListener('keydown', unlock, { passive: true });
    }

    _playSample(type, onFailure = null) {
        if (!this.enabled) return false;
        const variants = this._sampleDefs[type];
        if (!variants || variants.length === 0) return false;

        const sample = this._pickRandom(variants);
        const instance = sample.audio.cloneNode();
        instance.volume = Math.max(0, Math.min(1, this.volume * this.sampleMix * sample.gain));
        try {
            const maybePromise = instance.play();
            if (maybePromise?.catch) {
                maybePromise.catch(() => {
                    if (typeof onFailure === 'function') onFailure();
                });
            }
        } catch (e) {
            if (typeof onFailure === 'function') onFailure();
        }
        return true;
    }

    _updateMusicVolume() {
        if (!this.musicTrack) return;
        this.musicTrack.volume = Math.max(0, Math.min(1, this.volume * this.musicMix));
    }

    _ensureMusicPlaying() {
        if (!this.enabled || !this.musicTrack) return;
        if (!this.musicTrack.paused) return;

        const maybePromise = this.musicTrack.play();
        if (maybePromise?.then) {
            maybePromise
                .then(() => {})
                .catch(() => {});
            return;
        }
    }

    /** Resume context after user gesture (browser autoplay policy) */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this._ensureMusicPlaying();
    }

    _canPlay(type) {
        const now = Date.now();
        const last = this._lastPlayed[type] || 0;
        const interval = this._minInterval[type] || 50;
        if (now - last < interval) return false;
        this._lastPlayed[type] = now;
        return true;
    }

    /** Generic oscillator helper */
    _playTone(freq, type, duration, gainValue = 0.3, freqEnd = null) {
        if (!this.enabled || !this.ctx || !this._proceduralAvailable) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            if (freqEnd !== null) {
                osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* ignore */ }
    }

    /** Melee hit sound */
    playHit(damageType = 'physical') {
        if (!this._canPlay('hit')) return;
        this.resume();
        const configs = {
            physical: [180, 'square', 0.08, 0.25, 80],
            fire:     [300, 'sawtooth', 0.12, 0.2, 120],
            frost:    [500, 'sine', 0.1, 0.15, 300],
            lightning:[800, 'square', 0.06, 0.3, 400]
        };

        if (damageType === 'physical') {
            const fallback = () => this._playTone(180, 'square', 0.08, 0.25, 80);
            if (this._playSample('hit', fallback)) return;
        }

        const [freq, type, dur, vol, freqEnd] = configs[damageType] || configs.physical;
        this._playTone(freq, type, dur, vol, freqEnd);
    }

    /** Weapon swing sound */
    playSwing() {
        if (!this._canPlay('swing')) return;
        this.resume();
        if (this._playSample('swing', () => this._playTone(200, 'sawtooth', 0.06, 0.12, 80))) return;
        this._playTone(200, 'sawtooth', 0.06, 0.12, 80);
    }

    /** Building placement sound */
    playBuild() {
        if (!this._canPlay('build')) return;
        this.resume();
        if (this._playSample('build', () => this._playTone(300, 'sine', 0.15, 0.2, 600))) return;
        this._playTone(300, 'sine', 0.15, 0.2, 600);
    }

    /** Resource collection sound */
    playCollect() {
        if (!this._canPlay('collect')) return;
        this.resume();
        if (this._playSample('collect', () => this._playTone(600, 'sine', 0.08, 0.15, 900))) return;
        this._playTone(600, 'sine', 0.08, 0.15, 900);
    }

    /** Level up fanfare */
    playLevelUp() {
        if (!this._canPlay('level')) return;
        this.resume();
        if (this._playSample('level')) return;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 'sine', 0.15, 0.3), i * 100);
        });
    }

    /** Boss arrival sting */
    playBossAlert() {
        if (!this._canPlay('boss')) return;
        this.resume();
        if (this._playSample('boss')) return;
        this._playTone(80, 'sawtooth', 1.0, 0.4, 40);
        setTimeout(() => this._playTone(120, 'square', 0.6, 0.3), 200);
    }

    /** Explosion */
    playExplosion() {
        this.resume();
        if (this._playSample('explosion')) return;
        if (!this.enabled || !this.ctx || !this._proceduralAvailable) return;
        try {
            const bufSize = this.ctx.sampleRate * 0.3;
            const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
            source.connect(gain);
            gain.connect(this.masterGain);
            source.start();
        } catch (e) { /* ignore */ }
    }

    /** Artifact pickup chime */
    playArtifact() {
        this.resume();
        if (this._playSample('artifact')) return;
        if (!this.enabled || !this.ctx || !this._proceduralAvailable) return;
        [880, 1100, 1320, 1760].forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 'sine', 0.2, 0.25), i * 80);
        });
    }

    /** Objective complete */
    playObjectiveComplete() {
        this.resume();
        if (this._playSample('objective')) return;
        if (!this.enabled || !this.ctx || !this._proceduralAvailable) return;
        [440, 550, 660].forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 'sine', 0.2, 0.3), i * 100);
        });
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) this.masterGain.gain.value = this.volume;
        this._updateMusicVolume();
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.volume : 0;
        if (!this.enabled && this.musicTrack && !this.musicTrack.paused) {
            this.musicTrack.pause();
        } else if (this.enabled) {
            this.resume();
        }
        return this.enabled;
    }
}

export default AudioSystem;
