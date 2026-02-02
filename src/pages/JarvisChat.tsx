import { useState, useRef, useEffect } from "react";
import { Send, Brain, Loader2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJarvisChat } from "@/hooks/useJarvisChat";
import { ChatMessage } from "@/components/jarvis/chat/ChatMessage";
import { ChatWelcome } from "@/components/jarvis/chat/ChatWelcome";
import { ChatSidebar } from "@/components/jarvis/chat/ChatSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const JarvisChat = () => {
  const {
    messages,
    isLoading,
    isSending,
    sendMessage,
    startNewConversation,
    conversations,
    selectConversation,
    renameConversation,
    deleteConversation,
    conversationId,
    currentConversation,
  } = useJarvisChat();

  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (isSending) return;
    await sendMessage(action);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      {!isMobile && (
        <ChatSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelectConversation={selectConversation}
          onNewConversation={startNewConversation}
          onRename={(id, title) => renameConversation({ id, title })}
          onDelete={deleteConversation}
          isCollapsed={sidebarCollapsed}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border px-4">
          <div className="flex items-center gap-3">
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8"
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold truncate max-w-[200px] sm:max-w-none">
                {currentConversation?.title || "JARVIS"}
              </h1>
              <p className="text-sm text-muted-foreground">Seu assistente pessoal</p>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              className="gap-2"
            >
              Nova
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 py-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <ChatWelcome onQuickAction={handleQuickAction} />
          ) : (
            <div className="space-y-4 pr-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="pt-4 border-t border-border px-4">
          <div className="relative flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[44px] max-h-[150px] resize-none pr-12"
              rows={1}
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending}
              className="absolute right-2 bottom-2 h-8 w-8"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            JARVIS pode consultar suas tarefas, finanças, hábitos e muito mais.
          </p>
        </form>
      </div>
    </div>
  );
};

export default JarvisChat;
