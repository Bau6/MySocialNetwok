import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Send, Loader2, Square } from 'lucide-react';
import { MediaRecorderService } from '../../services/recording';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
    recipientUsername: string;
    recipientPublicKey: string;
    myPublicKey: string;
    onSent?: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
                                                                recipientUsername,
                                                                recipientPublicKey,
                                                                myPublicKey,
                                                                onSent
                                                            }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sending, setSending] = useState(false);
    const [duration, setDuration] = useState(0);
    const recorderRef = useRef<MediaRecorderService | null>(null);
    const timerRef = useRef<NodeJS.Timeout>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationIdRef = useRef<number>();
    const mediaStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        recorderRef.current = new MediaRecorderService();
        return () => {
            if (recorderRef.current && recorderRef.current.isRecording()) {
                recorderRef.current.stopRecording().catch(console.error);
            }
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    const startVisualization = () => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserRef.current) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        canvas.width = 400;
        canvas.height = 60;
        const draw = () => {
            if (!analyserRef.current || !ctx) return;
            animationIdRef.current = requestAnimationFrame(draw);
            analyserRef.current.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 3;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = `rgba(99, 102, 241, ${0.5 + barHeight / canvas.height})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
                x += barWidth;
            }
        };
        draw();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioContextRef.current = new AudioContext();
            await audioContextRef.current.resume();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);
            startVisualization();

            await recorderRef.current?.startRecording('audio');
            setIsRecording(true);
            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev + 1 >= 60) {
                        stopAndSend();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            toast.error('Не удалось получить доступ к микрофону');
            handleClose();
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        clearInterval(timerRef.current);
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        if (audioContextRef.current) await audioContextRef.current.close();
        setIsRecording(false);
    };

    const sendRecording = async () => {
        if (!recorderRef.current) return;
        setSending(true);
        try {
            const blob = await recorderRef.current.stopRecording();
            if (!blob) throw new Error('No blob');
            const fileKey = await cryptoService.generateFileKey();
            const encryptedBlob = await cryptoService.encryptBlob(blob, fileKey);
            const file = new File([encryptedBlob], `voice_${Date.now()}.mp4`, { type: 'audio/mp4' });
            const uploadRes = await api.uploadFile(file, 'voice');
            const forReceiver = await cryptoService.encryptSessionKey(fileKey, recipientPublicKey);
            const forSender = await cryptoService.encryptSessionKey(fileKey, myPublicKey);
            await api.sendEncryptedMessage({
                receiverUsername: recipientUsername,
                encryptedContent: '',
                encryptedSessionKey: forReceiver.encryptedSessionKey,
                iv: forReceiver.iv,
                encryptedContentForSender: '',
                encryptedSessionKeyForSender: forSender.encryptedSessionKey,
                ivForSender: forSender.iv,
                type: 'VOICE',
                fileUrl: uploadRes.fileUrl,
                fileName: uploadRes.fileName,
                fileSize: uploadRes.fileSize,
            });
            toast.success('Голосовое сообщение отправлено');
            handleClose();
            onSent?.();
        } catch (err) {
            console.error(err);
            toast.error('Не удалось отправить голосовое сообщение');
        } finally {
            setSending(false);
        }
    };

    const cancelRecording = () => {
        if (recorderRef.current && recorderRef.current.isRecording()) {
            recorderRef.current.stopRecording().catch(console.error);
        }
        handleClose();
        toast('Запись отменена');
    };

    const stopAndSend = async () => {
        await stopRecording();
        await sendRecording();
    };

    const handleOpen = async () => {
        setIsOpen(true);
        await startRecording();
    };

    const handleClose = () => {
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        if (recorderRef.current && recorderRef.current.isRecording()) {
            recorderRef.current.stopRecording().catch(console.error);
        }
        clearInterval(timerRef.current);
        setIsRecording(false);
        setIsOpen(false);
        setDuration(0);
    };

    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

    if (!isOpen) {
        return (
            <button
                onClick={handleOpen}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                title="Записать голосовое сообщение"
            >
                <Mic className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Запись голосового сообщения</h3>
                <div className="flex flex-col items-center gap-4">
                    <canvas ref={canvasRef} className="w-full h-16 bg-gray-100 rounded" />
                    <div className="text-2xl font-mono">{formatTime(duration)} / 1:00</div>
                    <div className="flex gap-4">
                        {isRecording ? (
                            <button
                                onClick={stopRecording}
                                className="bg-yellow-500 text-white p-3 rounded-full"
                                title="Остановить запись"
                            >
                                <Square className="w-6 h-6" />
                            </button>
                        ) : (
                            <button
                                onClick={sendRecording}
                                disabled={sending}
                                className="bg-green-600 text-white p-3 rounded-full disabled:opacity-50"
                                title="Отправить"
                            >
                                {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            </button>
                        )}
                        <button
                            onClick={cancelRecording}
                            className="bg-red-500 text-white p-3 rounded-full"
                            title="Отменить"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};