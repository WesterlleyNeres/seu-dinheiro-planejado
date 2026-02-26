import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Mic, MicOff, X, Loader2, FileText, Image as ImageIcon, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

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

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ACCEPTED_AUDIO_TYPES = [
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "text/plain"];

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const AUDIO_EXTS = new Set(["mp3", "mpeg", "wav", "m4a", "mp4", "aac", "ogg", "webm"]);
const DOC_EXTS = new Set(["pdf", "txt"]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/m4a",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
  pdf: "application/pdf",
  txt: "text/plain",
};

function getAttachmentType(mimeType: string, ext?: string): "image" | "audio" | "document" {
  if (mimeType && ACCEPTED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (mimeType && ACCEPTED_AUDIO_TYPES.includes(mimeType)) return "audio";
  if (ext && IMAGE_EXTS.has(ext)) return "image";
  if (ext && AUDIO_EXTS.has(ext)) return "audio";
  return "document";
}

function getFileExtension(name: string): string | undefined {
  const parts = name.split(".");
  if (parts.length <= 1) return undefined;
  return parts[parts.length - 1]?.toLowerCase();
}

function normalizeFile(file: File) {
  const ext = getFileExtension(file.name);
  const inferredMime = (!file.type && ext && EXT_TO_MIME[ext]) ? EXT_TO_MIME[ext] : file.type;
  const type = getAttachmentType(inferredMime, ext);
  const normalized =
    file.type || !inferredMime
      ? file
      : new File([file], file.name, { type: inferredMime });
  return { file: normalized, ext, mime: inferredMime || normalized.type || "", type };
}

function getSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function getAudioExtension(mimeType: string): string {
  if (!mimeType) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
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
  const isMobile = useIsMobile();
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/i.test(navigator.userAgent);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = isMobile ? 96 : 150;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [input, isMobile]);

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

  const convertPdfToImages = useCallback(async (file: File) => {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      const workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.js",
        import.meta.url
      ).toString();
      // @ts-expect-error - pdfjs legacy types are not perfect
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

      const data = await file.arrayBuffer();
      // @ts-expect-error - pdfjs legacy types are not perfect
      const pdf = await pdfjsLib.getDocument({ data }).promise;

      const maxPages = Math.min(pdf.numPages, 3);
      const converted: LocalAttachment[] = [];

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 0.92)
        );

        if (!blob) continue;

        const imageFile = new File(
          [blob],
          `${file.name.replace(/\.pdf$/i, "")}-p${pageNumber}.png`,
          { type: "image/png" }
        );

        converted.push({
          id: crypto.randomUUID(),
          type: "image",
          file: imageFile,
          name: imageFile.name,
          size: imageFile.size,
          preview: URL.createObjectURL(imageFile),
        });
      }

      if (pdf.numPages > maxPages) {
        toast.info(
          `PDF com ${pdf.numPages} páginas. Converti as primeiras ${maxPages}.`
        );
      } else {
        toast.success("PDF convertido para imagens.");
      }

      return converted;
    } catch (error) {
      console.error("PDF conversion error:", error);
      toast.error("Não foi possível converter o PDF. Envie como imagem.");
      return [];
    }
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const normalized = normalizeFile(file);
      const ext = normalized.ext;
      const mimeType = normalized.mime;
      const normalizedFile = normalized.file;
      const isPdf = mimeType === "application/pdf" || ext === "pdf";

      if (isPdf) {
        const images = await convertPdfToImages(file);
        if (images.length > 0) {
          setAttachments((prev) => [...prev, ...images]);
        }
        continue;
      }

      const type = normalized.type;
      const maxSize = type === "audio" ? MAX_AUDIO_SIZE : MAX_FILE_SIZE;

      if (normalizedFile.size > maxSize) {
        toast.error(`${normalizedFile.name} excede o limite de ${formatFileSize(maxSize)}`);
        return;
      }

      const isAccepted =
        (mimeType && ACCEPTED_IMAGE_TYPES.includes(mimeType)) ||
        (mimeType && ACCEPTED_AUDIO_TYPES.includes(mimeType)) ||
        (mimeType && ACCEPTED_DOCUMENT_TYPES.includes(mimeType)) ||
        (ext && (IMAGE_EXTS.has(ext) || AUDIO_EXTS.has(ext) || DOC_EXTS.has(ext)));

      if (!isAccepted) {
        toast.error(`Tipo de arquivo não suportado: ${normalizedFile.type || normalizedFile.name}`);
        return;
      }

      const attachment: LocalAttachment = {
        id: crypto.randomUUID(),
        type,
        file: normalizedFile,
        name: normalizedFile.name,
        size: normalizedFile.size,
        preview: type === "image" ? URL.createObjectURL(normalizedFile) : undefined,
      };

      setAttachments((prev) => [...prev, attachment]);
    }
  }, [convertPdfToImages]);

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
      const secureContext = typeof window !== "undefined" ? window.isSecureContext : false;
      const canUseMedia = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

      if (!secureContext || !canUseMedia) {
        audioInputRef.current?.click();
        toast.error("Gravação direta indisponível. Selecione um áudio.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blobType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        const ext = getAudioExtension(blobType);
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: blobType });

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
      audioInputRef.current?.click();
      toast.error("Não foi possível acessar o microfone. Selecione um áudio.");
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
    <form onSubmit={handleSubmit} className="border-t border-border px-3 pt-2 sm:px-4 sm:pt-4">
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
          "relative flex items-end gap-1.5 rounded-lg border border-input p-1.5 transition-colors sm:gap-2 sm:p-2",
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
          accept="image/*,audio/*,application/pdf,text/plain"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFileSelect(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          capture={isIOS ? undefined : "microphone"}
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
          className="h-9 w-9 shrink-0 sm:h-8 sm:w-8"
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
          className="h-9 w-9 shrink-0 sm:h-8 sm:w-8"
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
          className="min-h-[32px] max-h-[96px] resize-none border-0 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 sm:min-h-[36px] sm:max-h-[150px]"
          rows={1}
          disabled={isSending || isRecording}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && attachments.length === 0) || isSending}
          className="h-9 w-9 shrink-0 sm:h-8 sm:w-8"
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

      <p className="mt-1 hidden text-[10px] text-muted-foreground text-center sm:mt-2 sm:block sm:text-xs">
        GUTA pode analisar imagens, transcrever áudios e ler documentos.
      </p>
    </form>
  );
}
