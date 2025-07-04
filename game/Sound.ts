import * as Tone from 'tone';

export class Sound {
    private isStarted: boolean = false;
    private music: any;
    private engine: any;
    private skid: any;

    constructor() {
        // Initialization will happen on first user interaction in startMusic()
    }

    private async init() {
        if (this.isStarted) return;
        await Tone.start();
        this.isStarted = true;
        console.log("Audio context started.");

        // Background Music
        const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'fmsquare' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 1 },
        }).toDestination();

        const pattern = new Tone.Pattern((time, note) => {
            synth.triggerAttackRelease(note, '8n', time);
        }, ["C3", "E3", "G3", "B3", "C4", "B3", "G3", "E3"], "upDown");
        pattern.interval = '4n';
        this.music = pattern;
        
        // Engine Sound
        this.engine = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.05, decay: 0.1, sustain: 1, release: 0.2 },
        }).toDestination();
        this.engine.volume.value = -25;
        this.engine.triggerAttack();

        // Skid Sound
        this.skid = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 },
            volume: -10
        }).toDestination();
    }

    public async startMusic() {
        await this.init();
        if (this.music && Tone.Transport.state !== 'started') {
            Tone.Transport.start();
            this.music.start(0);
        }
    }

    public updateEngineSound(speed: number) {
        if (!this.engine) return;
        const minFreq = 200;
        const maxFreq = 1200;
        const pitch = minFreq + (speed / 50) * (maxFreq - minFreq);
        this.engine.envelope.attack = Math.max(0.01, 1 - speed / 30);
        this.engine.noise.playbackRate = Math.max(0.5, Math.min(2.5, speed/15));
    }

    public playSkidSound() {
        if(this.skid) {
            this.skid.triggerAttack();
        }
    }

    public stopSkidSound() {
        if(this.skid) {
            this.skid.triggerRelease();
        }
    }

    public stopAll() {
        if (this.isStarted) {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            this.engine?.dispose();
            this.skid?.dispose();
            this.music?.dispose();
        }
    }
}