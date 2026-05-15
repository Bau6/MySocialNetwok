import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, X } from 'lucide-react';

interface GlobalAudioPlayerProps {
    visible: boolean;
    url: string | null;
    onClose: () => void;
}

export const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({ visible, url, onClose }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isSeeking, setIsSeeking] = useState(false);

    // Логирование при изменении длительности
    useEffect(() => {
        console.log('[GlobalAudioPlayer] duration updated:', duration);
    }, [duration]);

    useEffect(() => {
        console.log('[GlobalAudioPlayer] visible:', visible, 'url:', url);
        if (visible && url && audioRef.current) {
            console.log('[GlobalAudioPlayer] loading audio...');
            audioRef.current.load();
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[GlobalAudioPlayer] autoplay succeeded');
                        setIsPlaying(true);
                    })
                    .catch(err => console.warn('[GlobalAudioPlayer] autoplay failed:', err));
            }
        }
    }, [visible, url]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    // Fallback: если через 1 секунду duration всё ещё 0, принудительно пытаемся получить её из элемента
    useEffect(() => {
        if (!visible || !url) return;
        const timeout = setTimeout(() => {
            if (audioRef.current && duration === 0 && audioRef.current.duration && isFinite(audioRef.current.duration)) {
                console.log('[GlobalAudioPlayer] fallback: setting duration from element:', audioRef.current.duration);
                setDuration(audioRef.current.duration);
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [visible, url, duration]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => setIsPlaying(true))
                        .catch(err => console.warn('Play failed:', err));
                }
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && !isSeeking) {
            setCurrentTime(audioRef.current.currentTime);
            if (duration === 0 && audioRef.current.duration && isFinite(audioRef.current.duration)) {
                console.log('[GlobalAudioPlayer] timeUpdate setting duration:', audioRef.current.duration);
                setDuration(audioRef.current.duration);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            console.log('[GlobalAudioPlayer] loadedMetadata setting duration:', audioRef.current.duration);
            setDuration(audioRef.current.duration);
        } else {
            console.log('[GlobalAudioPlayer] loadedMetadata but duration invalid:', audioRef.current?.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const formatTime = (sec: number) => {
        if (isNaN(sec) || !isFinite(sec)) return '0:00';
        const mins = Math.floor(sec / 60);
        const remain = Math.floor(sec % 60);
        return `${mins}:${remain < 10 ? '0' : ''}${remain}`;
    };

    if (!visible || !url) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50 flex items-center gap-3">
            <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    onMouseDown={() => setIsSeeking(true)}
                    onMouseUp={() => setIsSeeking(false)}
                    className="flex-1 h-1 bg-gray-200 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-gray-600">{formatTime(duration)}</span>
            </div>
            <div className="flex gap-1">
                {[0.5, 1, 1.5, 2].map(rate => (
                    <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`text-xs px-2 py-1 rounded ${playbackRate === rate ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                    >
                        {rate}x
                    </button>
                ))}
            </div>
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    );
};