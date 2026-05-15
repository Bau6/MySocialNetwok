import React, { useState, useRef, useEffect } from 'react';
import { Video, X, Send, Loader2, Square } from 'lucide-react';
import { MediaRecorderService } from '../../services/recording';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import toast from 'react-hot-toast';

interface VideoRecorderProps {
    recipientUsername: string;
    recipientPublicKey: string;
    myPublicKey: string;
    onSent?: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
                                                                recipientUsername,
                                                                recipientPublicKey,
                                                                myPublicKey,
                                                                onSent
                                                            }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sending, setSending] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const recorderRef = useRef<MediaRecorderService | null>(null);
    const timerRef = useRef<NodeJS.Timeout>();
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        recorderRef.current = new MediaRecorderService();
        return () => {
            if (recorderRef.current && recorderRef.current.isRecording()) {
                recorderRef.current.stopRecording().catch(console.error);
            }
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
                videoPreviewRef.current.play();
            }
            await recorderRef.current?.startRecording('video');
            setIsRecording(true);
            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev + 1 >= 60) {
                        stopRecordingAndShowPreview();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            toast.error('Не удалось получить доступ к камере');
            handleClose();
        }
    };

    const stopRecordingAndShowPreview = async () => {
        if (!isRecording) return;
        clearInterval(timerRef.current);
        setIsRecording(false);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
        try {
            const blob = await recorderRef.current?.stopRecording();
            if (blob) {
                setRecordedBlob(blob);
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.src = url;
                    videoPreviewRef.current.loop = true;
                    videoPreviewRef.current.play();
                }
            }
        } catch (err) {
            toast.error('Ошибка при остановке записи');
        }
    };

    const cancelRecording = () => {
        if (recorderRef.current && recorderRef.current.isRecording()) {
            recorderRef.current.stopRecording().catch(console.error);
        }
        handleClose();
        toast('Запись отменена');
    };

    const sendVideo = async () => {
        if (!recordedBlob) return;
        setSending(true);
        try {
            const fileKey = await cryptoService.generateFileKey();
            const encryptedBlob = await cryptoService.encryptBlob(recordedBlob, fileKey);
            const file = new File([encryptedBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
            const uploadRes = await api.uploadFile(file, 'message');
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
                type: 'VIDEO',
                circle: true,
                fileUrl: uploadRes.fileUrl,
                fileName: uploadRes.fileName,
                fileSize: uploadRes.fileSize,
            });
            toast.success('Видеосообщение отправлено');
            handleClose();
            onSent?.();
        } catch (err) {
            toast.error('Не удалось отправить видео');
        } finally {
            setSending(false);
        }
    };

    const handleOpen = async () => {
        setIsOpen(true);
        await startRecording();
    };

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (recorderRef.current && recorderRef.current.isRecording()) {
            recorderRef.current.stopRecording().catch(console.error);
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setIsOpen(false);
        setRecordedBlob(null);
        setPreviewUrl(null);
        setIsRecording(false);
        setDuration(0);
    };

    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

    if (!isOpen) {
        return (
            <button
                onClick={handleOpen}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                title="Записать видеосообщение"
            >
                <Video className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
            <div className="relative w-96 h-96 rounded-full overflow-hidden bg-black">
                <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted={isRecording}
                    playsInline
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-lg">
                    {formatTime(duration)} / 1:00
                </div>
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
                    {isRecording ? (
                        <button
                            onClick={stopRecordingAndShowPreview}
                            className="bg-yellow-500 text-white p-4 rounded-full"
                            title="Остановить запись"
                        >
                            <Square className="w-8 h-8" />
                        </button>
                    ) : (
                        previewUrl && (
                            <>
                                <button
                                    onClick={cancelRecording}
                                    className="bg-red-600 text-white p-4 rounded-full"
                                    title="Отмена"
                                >
                                    <X className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={sendVideo}
                                    disabled={sending}
                                    className="bg-green-600 text-white p-4 rounded-full disabled:opacity-50"
                                    title="Отправить"
                                >
                                    {sending ? <Loader2 className="w-8 h-8 animate-spin" /> : <Send className="w-8 h-8" />}
                                </button>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};