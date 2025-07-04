
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Game } from './game/Game';
import { Sound } from './game/Sound';
import UI from './components/UI';
import { Controls, TouchControls } from './types';

// Helper component for on-screen touch controls
const MobileControls: React.FC<{ onControlChange: (control: keyof Controls, value: boolean) => void }> = ({ onControlChange }) => {
    const handleTouch = (control: keyof Controls, value: boolean) => (event: React.TouchEvent) => {
        event.preventDefault();
        onControlChange(control, value);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden z-20">
            <div className="flex justify-between items-end">
                {/* Movement Controls */}
                <div className="grid grid-cols-3 gap-4 w-48">
                    {/* Empty top-left */}
                    <div />
                    {/* Forward */}
                    <div className="bg-gray-700/50 rounded-full aspect-square flex justify-center items-center" onTouchStart={handleTouch('forward', true)} onTouchEnd={handleTouch('forward', false)}>
                        <svg className="w-1/2 h-1/2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>
                    </div>
                    {/* Empty top-right */}
                    <div />

                    {/* Left */}
                     <div className="bg-gray-700/50 rounded-full aspect-square flex justify-center items-center" onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}>
                        <svg className="w-1/2 h-1/2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                    </div>
                     {/* Empty middle */}
                    <div />
                    {/* Right */}
                    <div className="bg-gray-700/50 rounded-full aspect-square flex justify-center items-center" onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}>
                        <svg className="w-1/2 h-1/2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                    </div>

                    {/* Empty bottom-left */}
                    <div />
                    {/* Backward */}
                    <div className="bg-gray-700/50 rounded-full aspect-square flex justify-center items-center" onTouchStart={handleTouch('backward', true)} onTouchEnd={handleTouch('backward', false)}>
                        <svg className="w-1/2 h-1/2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </div>
                    {/* Empty bottom-right */}
                    <div />
                </div>


                {/* Handbrake */}
                <div className="w-32 h-32 bg-red-500/50 rounded-full flex justify-center items-center text-white font-bold text-lg" onTouchStart={handleTouch('handbrake', true)} onTouchEnd={handleTouch('handbrake', false)}>
                    <span>BRAKE</span>
                </div>
            </div>
        </div>
    );
};


const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="absolute inset-0 z-30 bg-gray-900/80 backdrop-blur-sm flex flex-col justify-center items-center text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4">3D Drift King</h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8">Use WASD or Arrow Keys to drive. Spacebar for handbrake. Drag mouse to rotate camera.</p>
        <button 
            onClick={onStart} 
            className="px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400">
            Start Drifting
        </button>
    </div>
);

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const soundRef = useRef<Sound | null>(null);

    const [score, setScore] = useState(0);
    const [driftScore, setDriftScore] = useState(0);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true); // Assume assets are "loaded" since they are from CDN
    }, []);

    const handleStart = useCallback(() => {
        if (!canvasRef.current || !isLoaded) return;

        // Initialize sound on user interaction
        soundRef.current = new Sound();
        
        // Initialize game
        gameRef.current = new Game(
            canvasRef.current, 
            setScore, 
            setDriftScore, 
            soundRef.current
        );
        gameRef.current.init();

        setIsGameStarted(true);
        soundRef.current.startMusic();
    }, [isLoaded]);

    const handleReset = useCallback(() => {
        gameRef.current?.resetCar();
        setScore(0);
    }, []);

    const handleControlChange = useCallback((control: keyof Controls, value: boolean) => {
        gameRef.current?.updateControl(control, value);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            let control: keyof Controls | null = null;
            switch(event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    control = 'forward';
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    control = 'backward';
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    control = 'left';
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    control = 'right';
                    break;
                case 'Space':
                    control = 'handbrake';
                    break;
            }
            if (control) gameRef.current?.updateControl(control, true);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            let control: keyof Controls | null = null;
            switch(event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    control = 'forward';
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    control = 'backward';
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    control = 'left';
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    control = 'right';
                    break;
                case 'Space':
                    control = 'handbrake';
                    break;
            }
             if (control) gameRef.current?.updateControl(control, false);
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            gameRef.current?.destroy();
            soundRef.current?.stopAll();
        };
    }, []);

    return (
        <div className="w-full h-full bg-gray-800">
            <canvas ref={canvasRef} className="w-full h-full" />
            {!isGameStarted && isLoaded && <StartScreen onStart={handleStart} />}
            {isGameStarted && (
                <>
                    <UI score={score} driftScore={driftScore} onReset={handleReset} />
                    <MobileControls onControlChange={handleControlChange} />
                </>
            )}
        </div>
    );
};

export default App;
