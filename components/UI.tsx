
import React from 'react';

interface UIProps {
    score: number;
    driftScore: number;
    onReset: () => void;
}

const UI: React.FC<UIProps> = ({ score, driftScore, onReset }) => {
    return (
        <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none">
            <div className="flex justify-between items-start">
                {/* Score */}
                <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg text-white">
                    <h2 className="text-xl font-semibold text-gray-300">Total Score</h2>
                    <p className="text-4xl font-bold tracking-tighter">{Math.floor(score)}</p>
                </div>

                {/* Current Drift Score */}
                {driftScore > 10 && (
                    <div className="text-center">
                        <p className="text-5xl font-bold text-yellow-400 animate-pulse transition-all duration-300">
                            +{Math.floor(driftScore)}
                        </p>
                        <p className="text-xl font-semibold text-yellow-200">Drifting!</p>
                    </div>
                )}

                {/* Reset Button */}
                <button
                    onClick={onReset}
                    className="pointer-events-auto bg-red-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-red-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-400">
                    Reset Car
                </button>
            </div>
        </div>
    );
};

export default UI;
