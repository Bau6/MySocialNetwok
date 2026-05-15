import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
    visible: boolean;
    url: string | null;
    circle?: boolean;
    onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ visible, url, circle, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const handleTimeUpdate = () => {
        if (videoRef.current && !isSeeking) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current && isFinite(videoRef.current.duration)) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };

    const formatTime = (sec: number) => {
        if (isNaN(sec)) return '0:00';
        const mins = Math.floor(sec / 60);
        const remain = Math.floor(sec % 60);
        return `${mins}:${remain < 10 ? '0' : ''}${remain}`;
    };

    if (!visible || !url) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center" onClick={onClose}>
            <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300">
                    <X className="w-8 h-8" />
                </button>
                <div className={circle ? "rounded-full overflow-hidden" : "rounded-lg overflow-hidden"}>
                    <video
                        ref={videoRef}
                        src={url}
                        controls={false}
                        autoPlay
                        className="w-full h-auto"
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                    />
                </div>
                <div className="mt-4 flex items-center gap-2 bg-black bg-opacity-50 rounded-lg p-2">
                    <span className="text-white text-sm">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.01}
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseDown={() => setIsSeeking(true)}
                        onMouseUp={() => setIsSeeking(false)}
                        className="flex-1 h-1 bg-gray-400 rounded-lg cursor-pointer"
                    />
                    <span className="text-white text-sm">{formatTime(duration)}</span>
                    <div className="flex gap-1 ml-2">
                        {[0.5, 1, 1.5, 2].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`text-xs px-2 py-1 rounded ${playbackRate === rate ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};