import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTranscript, disabled }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        
        // Use Web Speech API for transcription (simpler than API calls)
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
          setIsProcessing(false);
        };

        recognition.onerror = () => {
          toast({
            title: "Error",
            description: "Could not transcribe audio",
            variant: "destructive",
          });
          setIsProcessing(false);
        };

        // For now, use a simple approach - just notify the user
        toast({
          title: "Voice input received",
          description: "Please type your message instead (full voice transcription coming soon)",
        });
        setIsProcessing(false);
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      onClick={toggleRecording}
      disabled={disabled || isProcessing}
      variant={isRecording ? "destructive" : "ghost"}
      size="icon"
      className="shrink-0"
    >
      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </Button>
  );
};

export default VoiceInput;
