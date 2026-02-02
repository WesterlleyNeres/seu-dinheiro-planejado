import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Mic, MicOff, X, Loader2, FileText, Image as ImageIcon, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LocalAttachment {
  id: string;
  type: "image" | "audio" | "document";
  file: File;
  preview?: string;
  name: string;
  size: number;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: LocalAttachment[]) => void;
  isSending: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ACCEPTED_AUDIO_TYPES = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/m4a", "audio/ogg", "audio/webm"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "text/plain"];

function getAttachmentType(mimeType: string): "image" | "audio" | "document" {
  if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ACCEPTED_AUDIO_TYPES.includes(mimeType)) return "audio";
  return "document";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({ onSend, isSending, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      attachments.forEach((att) => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
    };
  }, []);

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const type = getAttachmentType(file.type);
      const maxSize = type === "audio" ? MAX_AUDIO_SIZE : MAX_FILE_SIZE;

      if (file.size > maxSize) {
        toast.error(`${file.name} excede o limite de ${formatFileSize(maxSize)}`);
        return;
      }

      if (
        !ACCEPTED_IMAGE_TYPES.includes(file.type) &&
        !ACCEPTED_AUDIO_TYPES.includes(file.type) &&
        !ACCEPTED_DOCUMENT_TYPES.includes(file.type)
      ) {
        toast.error(`Tipo de arquivo não suportado: ${file.type || file.name}`);
        return;
      }

      const attachment: LocalAttachment = {
        id: crypto.randomUUID(),
        type,
        file,
        name: file.name,
        size: file.size,
        preview: type === "image" ? URL.createObjectURL(file) : undefined,
      };

      setAttachments((prev) => [...prev, attachment]);
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });

        const attachment: LocalAttachment = {
          id: crypto.randomUUID(),
          type: "audio",
          file,
          name: file.name,
          size: file.size,
        };

        setAttachments((prev) => [...prev, attachment]);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isSending) return;

    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <form onSubmit={handleSubmit} className="pt-4 border-t border-border px-4">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group bg-muted rounded-lg overflow-hidden"
            >
              {att.type === "image" && att.preview && (
                <img
                  src={att.preview}
                  alt={att.name}
                  className="h-20 w-20 object-cover"
                />
              )}
              {att.type === "audio" && (
                <div className="h-20 w-32 flex flex-col items-center justify-center gap-1 px-2">
                  <Music className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {att.name}
                  </span>
                </div>
              )}
              {att.type === "document" && (
                <div className="h-20 w-32 flex flex-col items-center justify-center gap-1 px-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {att.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 mb-3 text-destructive">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium">Gravando {formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Input Area */}
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-lg border border-input p-2 transition-colors",
          isDragOver && "border-primary bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_DOCUMENT_TYPES].join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFileSelect(e.target.files);
              e.target.value = "";
            }
          }}
        />

        {/* Attach Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || isRecording}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Record Button */}
        <Button
          type="button"
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSending}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="min-h-[36px] max-h-[150px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          rows={1}
          disabled={isSending || isRecording}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && attachments.length === 0) || isSending}
          className="h-8 w-8 shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 border-2 border-dashed border-primary rounded-lg">
          <p className="text-sm text-primary font-medium">Solte os arquivos aqui</p>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground text-center">
        JARVIS pode analisar imagens, transcrever áudios e ler documentos.
      </p>
    </form>
  );
}
