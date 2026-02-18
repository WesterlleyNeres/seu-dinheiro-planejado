import { useState, useRef, useEffect } from "react";
import { Loader2, PanelLeftClose, PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJarvisChat } from "@/hooks/useJarvisChat";
import { ChatMessage } from "@/components/jarvis/chat/ChatMessage";
import { ChatWelcome } from "@/components/jarvis/chat/ChatWelcome";
import { ChatSidebar } from "@/components/jarvis/chat/ChatSidebar";
import { ChatInput, LocalAttachment } from "@/components/jarvis/chat/ChatInput";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GutaMark } from "@/components/brand/GutaMark";

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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Auto-scroll to bottom when messages change or finish loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [messages, isSending, isLoading]);

  const handleSend = async (message: string, attachments?: LocalAttachment[]) => {
    if ((!message.trim() && (!attachments || attachments.length === 0)) || isSending) return;
    await sendMessage({ message, attachments });
  };

  const handleQuickAction = async (action: string) => {
    if (isSending) return;
    await sendMessage({ message: action });
  };

  const handleSelectOption = async (value: string) => {
    if (isSending) return;
    await sendMessage({ message: value });
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]" data-tour="chat-area">
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
        <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 sm:pb-4">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="h-9 w-9"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            ) : (
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
              <GutaMark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold truncate max-w-[200px] sm:max-w-none">
                {currentConversation?.title || "GUTA"}
              </h1>
              <p className="text-sm text-muted-foreground">Sua assistente pessoal</p>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={startNewConversation}
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea viewportRef={scrollViewportRef} className="flex-1 px-2 py-3 sm:px-4 sm:py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <ChatWelcome onQuickAction={handleQuickAction} />
          ) : (
            <div className="mx-auto w-full max-w-[720px] space-y-3 pr-0 sm:space-y-4 sm:pr-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSelectOption={handleSelectOption}
                />
              ))}
              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <GutaMark className="h-4 w-4" />
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
        <ChatInput
          onSend={handleSend}
          isSending={isSending}
        />
      </div>

      {/* Mobile Conversations Sheet */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="flex h-full w-[85vw] max-w-sm flex-col p-0">
            <SheetHeader className="border-b border-border px-4 py-3">
              <SheetTitle>Conversas</SheetTitle>
            </SheetHeader>
            <ChatSidebar
              conversations={conversations}
              activeId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={() => {
                startNewConversation();
                setMobileSidebarOpen(false);
              }}
              onRename={(id, title) => renameConversation({ id, title })}
              onDelete={deleteConversation}
              isCollapsed={false}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default JarvisChat;
