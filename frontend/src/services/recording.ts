export type RecorderType = 'audio' | 'video';

export class MediaRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private chunks: Blob[] = [];

    async startRecording(type: RecorderType): Promise<void> {
        if (this.mediaRecorder) throw new Error('Already recording');
        const constraints = type === 'audio' ? { audio: true } : { video: true, audio: true };
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.chunks = [];

        if (type === 'video' && this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack) {
                try {
                    await videoTrack.applyConstraints({ width: { exact: 480 }, height: { exact: 480 }, frameRate: { ideal: 30 } });
                } catch (e) { console.warn(e); }
            }
        }

        let mimeType: string;
        if (type === 'audio') {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
                mimeType = 'audio/mpeg';
            } else {
                mimeType = 'audio/webm';
            }
        } else {
            // Для видео оставляем webm (стабильно)
            if (MediaRecorder.isTypeSupported('video/webm')) {
                mimeType = 'video/webm';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else {
                mimeType = 'video/webm';
            }
        }

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
        this.mediaRecorder.start(100);
    }

    async stopRecording(): Promise<Blob> {
        if (!this.mediaRecorder) throw new Error('No active recorder');
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) return reject('No recorder');
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
                this.cleanup();
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    private cleanup() {
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.chunks = [];
    }

    isRecording(): boolean {
        return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
    }
}