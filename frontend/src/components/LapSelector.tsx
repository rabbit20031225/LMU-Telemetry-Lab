
import React from 'react';
import type { Lap } from '../types';
import clsx from 'clsx';

interface LapSelectorProps {
    laps: Lap[];
    selectedLap: number | null;
    referenceLap: number | null;
    onSelectLap: (lapIdx: number) => void;
    onSelectRefLap: (lapIdx: number) => void;
}

export const LapSelector: React.FC<LapSelectorProps> = ({
    laps, selectedLap, referenceLap, onSelectLap, onSelectRefLap
}) => {
    return (
        <div className="bg-gray-900 text-white p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Laps</h2>
            <div className="space-y-1">
                {laps.map((lap) => (
                    <div
                        key={lap.lap}
                        className={clsx(
                            "flex justify-between items-center p-2 rounded cursor-pointer text-sm",
                            selectedLap === lap.lap ? "bg-blue-600 font-bold" : "hover:bg-gray-800",
                            referenceLap === lap.lap && selectedLap !== lap.lap ? "bg-gray-700 border border-dotted border-white" : ""
                        )}
                        onClick={() => onSelectLap(lap.lap)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onSelectRefLap(lap.lap);
                        }}
                        title="Left click to select Main, Right click to select Ref"
                    >
                        <span className={clsx("w-8 text-center", lap.isValid ? "text-green-400" : "text-red-400")}>
                            {lap.lap}
                        </span>
                        <span className="flex-1 text-right font-mono">
                            {lap.duration > 0 ? lap.duration.toFixed(3) : "-"}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-4 text-xs text-gray-400">
                <p>Left Click: Select Lap</p>
                <p>Right Click: Set Reference</p>
            </div>
        </div>
    );
};
