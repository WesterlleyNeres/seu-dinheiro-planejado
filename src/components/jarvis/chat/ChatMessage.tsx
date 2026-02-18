import { Brain, User, FileText, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Attachment {
  type: "image" | "audio" | "document";
  url: string;
  name: string;
  size?: number;
  mime_type?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  attachments?: Attachment[];
}

interface ChatMessageProps {
  message: Message;
  onSelectOption?: (value: string) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMessage({ message, onSelectOption }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const content = message.content || "";

  const hasDisambiguation =
    /Encontrei v[aá]rias (carteiras|categorias) parecidas/i.test(content) ||
    /Responda com o n[úu]mero ou o nome exato/i.test(content);

  const options = hasDisambiguation
    ? content
        .split("\n")
        .map((line) => {
          const match = line.match(/^\s*\d+[\)\.]\s+(.+)\s*$/);
          return match ? match[1].trim() : null;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  const normalizeOptionValue = (label: string) => {
    const typeMatch = label.match(/\(([^)]+)\)\s*$/);
    if (!typeMatch) return label.trim();
    const typeValue = typeMatch[1].toLowerCase();
    const knownTypes = ["despesa", "receita", "investimento", "divida", "fixa", "variavel"];
    if (!knownTypes.includes(typeValue)) return label.trim();
    return label.replace(/\s*\(([^)]+)\)\s*$/, "").trim();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Brain className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.type === "image" && (
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.name}
                      className="rounded-lg max-w-[280px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}
                {att.type === "audio" && (
                  <audio
                    controls
                    src={att.url}
                    className="max-w-full"
                  >
                    Seu navegador não suporta áudio.
                  </audio>
                )}
                {att.type === "document" && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg transition-colors",
                      isUser
                        ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background hover:bg-background/80"
                    )}
                  >
                    <FileText className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      {att.size && (
                        <p className="text-xs opacity-70">{formatFileSize(att.size)}</p>
                      )}
                    </div>
                    <Download className="h-4 w-4 shrink-0 opacity-50" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  code: ({ children }) => (
                    <code className="rounded bg-background/50 px-1 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
        )}

        {isAssistant && options.length > 0 && onSelectOption && (
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option, idx) => (
              <Button
                key={`${option}-${idx}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => onSelectOption(normalizeOptionValue(option))}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
