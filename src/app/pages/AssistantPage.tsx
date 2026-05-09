import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import type { ChatMessage as AppChatMessage } from "../../lib/types";
import { sendChatMessage, ApiError } from "../../lib/api";
import type { ChatMessage as ApiChatMsg } from "../../lib/api";

const QUICK_PROMPTS = [
  "How do I perform CPR?",
  "Trapped under rubble protocol",
  "Treat severe bleeding",
  "Flood evacuation steps",
  "Emergency contact protocol",
];

// ── Typing indicator with CSS-animation dots (no inline <style>) ─────────────
function TypingIndicator() {
  return (
    <div className="mr-auto bg-white/[0.04] border border-white/[0.08] text-foreground text-sm px-4 py-3 rounded-xl rounded-bl-none max-w-[75%] flex items-center gap-1">
      <span className="typing-dot" />
      <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
      <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
    </div>
  );
}

export function AssistantPage() {
  const { set }                   = useTopbar();
  const { user }                  = useAuth();
  const [messages, setMessages]   = useState<AppChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [typing, setTyping]       = useState(false);
  const [imageFile, setImageFile] = useState<{ base64: string; type: string } | null>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const abortRef                  = useRef<AbortController | null>(null);
  const sessionIdRef              = useRef<string | undefined>(undefined);

  // Stable topbar content
  const topbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground/60 text-sm">Connected</span>
    </div>
  ), []);

  useEffect(() => {
    set({ title: "Field Assistant", right: topbarRight });
  }, [set, topbarRight]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = useCallback(async (text: string, imgData?: { base64: string; type: string }) => {
    if (!text.trim() && !imgData) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: AppChatMessage = {
      id:        crypto.randomUUID(),
      role:      "user",
      content:   text,
      imageUrl:  imgData ? `data:${imgData.type};base64,${imgData.base64}` : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImageFile(null);
    setTyping(true);

    try {
      // Build API history (last 10 turns for context window)
      const history: ApiChatMsg[] = messages.slice(-10).map((m) => ({
        role:    m.role as "user" | "assistant",
        content: m.content,
      }));

      const resp = await sendChatMessage(
        {
          message:      text,
          history,
          image_base64: imgData?.base64,
          language:     "en",
          session_id:   sessionIdRef.current,
        },
        abortRef.current.signal,
      );

      sessionIdRef.current = resp.session_id;

      setMessages((prev) => [
        ...prev,
        {
          id:        crypto.randomUUID(),
          role:      "assistant",
          content:   resp.message,
          timestamp: new Date(),
        },
      ]);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof ApiError
        ? `AI unavailable (${err.status}). Try again shortly.`
        : "Failed to reach AI assistant.";
      toast.error(msg);
    } finally {
      setTyping(false);
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, imageFile ?? undefined);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageFile({ base64: dataUrl.split(",")[1], type: file.type });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="rakshak-chat-shell -m-8 flex flex-col">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-foreground text-xl font-semibold text-center">RAKSHAK AI Assistant</p>
            <p className="mt-2 text-muted-foreground/50 text-sm text-center max-w-sm">
              Damage assessment · Evacuation guidance · Medical triage · Emergency coordination
            </p>
            {user && (
              <p className="mt-1 text-muted-foreground/30 text-xs text-center">
                Logged in as {user.displayName ?? user.email}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="border rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-all duration-100 bg-transparent border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={msg.role === "user"
                  ? "ml-auto bg-primary/[0.12] border border-primary/20 text-foreground text-sm px-4 py-3 rounded-xl rounded-br-none max-w-[75%]"
                  : "mr-auto bg-white/[0.04] border border-white/[0.08] text-foreground text-sm px-4 py-3 rounded-xl rounded-bl-none max-w-[75%] leading-relaxed"
                }>
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      className="max-h-40 rounded-lg mb-2 object-cover"
                    />
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className={`text-[10px] text-muted-foreground/30 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                  {msg.timestamp.toLocaleTimeString("en-US", { hour12: true })}
                </p>
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input row */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "hsl(0 0% 8%)" }}
      >
        <button
          type="button"
          title="Attach image"
          onClick={() => fileRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground border border-white/10 rounded-lg px-3 py-2 transition-colors flex-shrink-0"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 transition-colors"
            placeholder={imageFile ? "Image attached — ask anything..." : "Ask anything..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {imageFile && (
            <button
              type="button"
              title="Remove image"
              onClick={() => setImageFile(null)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-[10px] hover:text-destructive transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => sendMessage(input, imageFile ?? undefined)}
          disabled={(!input.trim() && !imageFile) || typing}
          className="w-9 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          title="Send"
        >
          →
        </button>
      </div>
    </div>
  );
}
