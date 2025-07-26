import { useState, useRef, useEffect } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PlayIcon, 
  PauseIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onTranscriptionComplete?: (text: string) => void;
}

/**
 * Voice recording component with playback and transcription support
 * Uses Web Audio API for recording and visualization
 */
const VoiceRecorder = ({ onRecordingComplete, onTranscriptionComplete }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete?.(blob, recordingTime);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualization
      visualizeAudio();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      setAudioLevel(0);
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Visualize audio levels
  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const animate = () => {
      if (!isRecording) return;
      
      analyserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  // Play/Pause audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Reset recording
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setRecordingTime(0);
    setIsPlaying(false);
  };

  // Mock transcription (replace with actual API call)
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockTranscription = "This is a mock transcription of the recorded audio. In production, this would be replaced with actual speech-to-text from Whisper API or similar service.";
      setTranscription(mockTranscription);
      setIsTranscribing(false);
      onTranscriptionComplete?.(mockTranscription);
    }, 2000);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="relative p-8 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105"
          >
            <MicrophoneIcon className="h-12 w-12" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-gray-600 whitespace-nowrap">
              Click to start recording
            </span>
          </button>
        )}

        {isRecording && (
          <div className="flex flex-col items-center space-y-4">
            {/* Audio level indicator */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
              <button
                onClick={stopRecording}
                className="relative p-8 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                <StopIcon className="h-12 w-12" />
              </button>
              {/* Audio level ring */}
              <div 
                className="absolute inset-0 rounded-full border-4 border-red-500 transition-all"
                style={{
                  transform: `scale(${1 + audioLevel * 0.3})`,
                  opacity: 0.3 + audioLevel * 0.7
                }}
              />
            </div>

            {/* Recording time */}
            <div className="text-2xl font-mono text-gray-700">
              {formatTime(recordingTime)}
            </div>

            {/* Pause button */}
            <button
              onClick={togglePause}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="w-full space-y-4">
            {/* Audio player */}
            <div className="bg-gray-50 rounded-lg p-4">
              <audio
                ref={audioRef}
                src={audioUrl!}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              
              <div className="flex items-center justify-between">
                <button
                  onClick={togglePlayback}
                  className="p-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-6 w-6" />
                  ) : (
                    <PlayIcon className="h-6 w-6" />
                  )}
                </button>

                <div className="flex-1 mx-4">
                  <div className="text-sm text-gray-600">
                    Duration: {formatTime(recordingTime)}
                  </div>
                </div>

                <button
                  onClick={resetRecording}
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                  title="Reset recording"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Transcription section */}
            <div className="bg-blue-50 rounded-lg p-4">
              {!transcription && !isTranscribing && (
                <button
                  onClick={transcribeAudio}
                  className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                >
                  Transcribe Audio
                </button>
              )}

              {isTranscribing && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                  <span className="text-blue-700">Transcribing audio...</span>
                </div>
              )}

              {transcription && (
                <div className="space-y-2">
                  <div className="flex items-center text-green-700 mb-2">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    <span className="font-medium">Transcription Complete</span>
                  </div>
                  <div className="bg-white rounded p-3 text-gray-700 text-sm">
                    {transcription}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isRecording && !audioBlob && (
        <div className="text-center text-sm text-gray-600 space-y-1">
          <p>Record voice notes up to 5 minutes</p>
          <p>Automatic transcription available after recording</p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;