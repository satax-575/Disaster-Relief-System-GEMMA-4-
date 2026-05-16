import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import type { ChatMessage as AppChatMessage } from "../../lib/types";
import { sendChatMessage, ApiError } from "../../lib/api";
import type { ChatMessage as ApiChatMsg } from "../../lib/api";
import {
  doc, setDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db as firestoreDb } from "../../lib/firebase";

const QUICK_PROMPTS = [
  "How do I perform CPR?",
  "Trapped under rubble protocol",
  "Treat severe bleeding",
  "Flood evacuation steps",
  "Emergency contact protocol",
];

const MAX_STORED_MESSAGES = 60;  // Keep last 60 messages in Firestore
const SAVE_DEBOUNCE_MS    = 1500; // Wait 1.5s after last message to save

// ── Strip <think>...</think> blocks from AI response ─────────────────────────
function extractThinkingAndContent(raw: string): { thinking: string; content: string } {
  const thinkMatch = raw.match(/^[\s\S]*?<think>([\s\S]*?)<\/think>\s*/i);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const content = raw.slice(thinkMatch[0].length).trim();
    return { thinking, content };
  }
  return { thinking: "", content: raw.trim() };
}

// ── Fix 3b — Post-processing sanitizer: strip all leaked reasoning from AI responses ─
function sanitizeFieldAssistantResponse(text: string): string {
  return text
    // Strip JSON artifacts
    .replace(/JSON Function Call[\s\S]*$/im, "")
    .replace(/```json[\s\S]*?```/gim, "")
    .replace(/```[\s\S]*?```/gim, "")
    .replace(/\{\s*"[^"]+"\s*:[\s\S]*?\}/gm, "")
    // Strip <think>...</think> blocks (in case they leak through)
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, "")
    // Strip asterisk-wrapped inline reasoning (*Wait*, *Let me think*, *Hmm*, etc.)
    .replace(/\*[^\n]{1,100}\*\n?/g, "")
    // Strip lines that are clearly internal meta-commentary
    .replace(/^(let me|I need to|I should|I will|I'm going to|hmm|wait|okay|alright|so,)[^\n]*\n?/gim, "")
    // Remove duplicate consecutive section headers (e.g. SITUATION ASSESSMENT repeated twice)
    .replace(/(\bSITUATION[^\n]*\n)([\s\S]*?)\1/gi, "$1$2")
    // Collapse 3+ newlines into 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


// ── Fix 3c — ETA injection for dispatch-type queries ──────────────────────────
function injectETAIfMissing(response: string, inputText: string): string {
  if (/\d+[–\-]\d+\s*minutes/i.test(response)) return response;
  const lower = inputText.toLowerCase();
  const isDispatch = /flood|fire|collapse|explosion|trapped|earthquake|cyclone|emergency|disaster/i.test(lower);
  if (!isDispatch) return response;
  let eta = "15–25 minutes";
  if (/collapse|trapped|critical|explosion/i.test(lower)) eta = "8–12 minutes";
  else if (/flood|fire|drowning/i.test(lower)) eta = "10–18 minutes";
  else if (/minor|small|low/i.test(lower)) eta = "20–35 minutes";
  return response + `\n\nESTIMATED RESCUE ARRIVAL: ${eta}`;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="mr-auto bg-white/[0.04] border border-white/[0.08] text-foreground text-sm px-4 py-3 rounded-xl rounded-bl-none max-w-[75%] flex items-center gap-1">
      <span className="typing-dot" />
      <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
      <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
    </div>
  );
}

// ── Collapsible Thinking block ────────────────────────────────────────────────
function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-muted-foreground/40 text-xs hover:text-muted-foreground/70 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{open ? "Hide" : "Show"} reasoning</span>
      </button>
      {open && (
        <div
          className="mt-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground/50 leading-relaxed whitespace-pre-wrap border border-white/[0.05]"
          style={{ background: "rgba(255,255,255,0.02)", animation: "fade-in 0.2s ease-out" }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{p}</strong> : p
        );
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={i} className="flex items-start gap-2">
            <span className="text-primary mt-0.5 flex-shrink-0">•</span>
            <span>{rendered}</span>
          </div>;
        }
        const numMatch = line.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          const [, num, restParts] = numMatch;
          return <div key={i} className="flex items-start gap-2">
            <span className="text-primary font-bold flex-shrink-0 mt-0.5">{num}.</span>
            <span>{restParts}</span>
          </div>;
        }
        if (line === "") return <div key={i} className="h-1" />;
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

// ── Extended message type ─────────────────────────────────────────────────────
interface RichChatMessage extends AppChatMessage {
  thinking?: string;
  modelUsed?: string;
}

// ── Firestore persistence helpers ─────────────────────────────────────────────
// Schema: users/{uid}/chatHistory/field_assistant
// { messages: [...], sessionId: string, updatedAt: serverTimestamp }

function serializeMessages(msgs: RichChatMessage[]) {
  return msgs.slice(-MAX_STORED_MESSAGES).map((m) => ({
    id:        m.id,
    role:      m.role,
    content:   m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    thinking:  m.thinking ?? null,
    modelUsed: m.modelUsed ?? null,
    // Don't store imageUrl (large base64) — just flag that an image was attached
    hadImage:  !!m.imageUrl,
  }));
}

function deserializeMessages(raw: unknown[]): RichChatMessage[] {
  return (raw ?? []).map((m: unknown) => {
    const msg = m as Record<string, unknown>;
    return {
      id:        (msg.id as string) ?? crypto.randomUUID(),
      role:      (msg.role as "user" | "assistant") ?? "user",
      content:   (msg.content as string) ?? "",
      timestamp: msg.timestamp ? new Date(msg.timestamp as string) : new Date(),
      thinking:  (msg.thinking as string | undefined) ?? undefined,
      modelUsed: (msg.modelUsed as string | undefined) ?? undefined,
      imageUrl:  undefined, // base64 not persisted
    };
  });
}

async function loadChatFromFirestore(uid: string): Promise<{ messages: RichChatMessage[]; sessionId?: string }> {
  try {
    const ref = doc(firestoreDb, "users", uid, "chatHistory", "field_assistant");
    const snap = await getDoc(ref);
    if (!snap.exists()) return { messages: [] };
    const data = snap.data() as Record<string, unknown>;
    const messages = deserializeMessages((data.messages as unknown[]) ?? []);
    const sessionId = (data.sessionId as string | undefined) ?? undefined;
    return { messages, sessionId };
  } catch (e) {
    console.warn("[AssistantPage] Failed to load chat from Firestore:", e);
    return { messages: [] };
  }
}

async function saveChatToFirestore(
  uid: string,
  messages: RichChatMessage[],
  sessionId?: string,
): Promise<void> {
  try {
    const ref = doc(firestoreDb, "users", uid, "chatHistory", "field_assistant");
    await setDoc(ref, {
      messages:   serializeMessages(messages),
      sessionId:  sessionId ?? null,
      updatedAt:  serverTimestamp(),
      messageCount: messages.length,
    }, { merge: true });
  } catch (e) {
    console.warn("[AssistantPage] Failed to save chat to Firestore:", e);
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AssistantPage() {
  const { set }                   = useTopbar();
  const { user }                  = useAuth();
  const [messages, setMessages]   = useState<RichChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [typing, setTyping]       = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [imageFile, setImageFile] = useState<{ base64: string; type: string } | null>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const abortRef                  = useRef<AbortController | null>(null);
  const sessionIdRef              = useRef<string | undefined>(undefined);
  const chatAreaRef               = useRef<HTMLDivElement>(null);
  const saveTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground/60 text-sm">Gemma 4 31B · Connected</span>
    </div>
  ), []);

  useEffect(() => {
    set({ title: "Field Assistant", right: topbarRight });
  }, [set, topbarRight]);

  // ── Load chat history from Firestore on mount ─────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    loadChatFromFirestore(user.uid).then(({ messages: loaded, sessionId }) => {
      if (cancelled) return;
      if (loaded.length > 0) {
        setMessages(loaded);
        sessionIdRef.current = sessionId;
        toast.success(`Chat restored — ${loaded.length} messages`, {
          duration: 3000,
          description: "Your previous conversation has been loaded.",
        });
      }
      setHistoryLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  // ── Debounced save to Firestore on message changes ────────────────────────
  // Only save after history is loaded (prevents overwriting on first render)
  useEffect(() => {
    if (!historyLoaded || !user?.uid) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChatToFirestore(user!.uid!, messages, sessionIdRef.current);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, historyLoaded, user?.uid]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = useCallback(async (text: string, imgData?: { base64: string; type: string }) => {
    if (!text.trim() && !imgData) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: RichChatMessage = {
      id:        crypto.randomUUID(),
      role:      "user",
      content:   text,
      imageUrl:  imgData ? `data:${imgData.type};base64,${imgData.base64}` : undefined,
      timestamp: new Date(),
    };

    // ── CRITICAL FIX: capture messages BEFORE state update, build history from it ──
    setMessages((prev) => {
      const history: ApiChatMsg[] = prev.slice(-10).map((m) => ({
        role:    m.role as "user" | "assistant",
        content: m.content,
      }));

      void (async () => {
        setInput("");
        setImageFile(null);
        setTyping(true);

        try {
          const resp = await sendChatMessage(
            {
              message:      text,
              history,
              image_base64: imgData?.base64,
              language:     "en",
              session_id:   sessionIdRef.current,
            },
            abortRef.current!.signal,
          );

          sessionIdRef.current = resp.session_id;

          const { thinking, content } = extractThinkingAndContent(resp.message);
          const sanitized = sanitizeFieldAssistantResponse(content || resp.message);
          const withETA   = injectETAIfMissing(sanitized, text);

          setMessages((p) => [
            ...p,
            {
              id:        crypto.randomUUID(),
              role:      "assistant",
              content:   withETA,
              thinking:  thinking || undefined,
              timestamp: new Date(),
              modelUsed: resp.model_used,
            },
          ]);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "AbortError") return;
          const msg = err instanceof ApiError
            ? `AI unavailable (${err.status}). Backend may be starting up — try again in 30s.`
            : "Failed to reach AI assistant. Check connection.";
          toast.error(msg);
        } finally {
          setTyping(false);
        }
      })();

      return [...prev, userMsg];
    });
  }, []);

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
    e.target.value = "";
  };

  const clearChat = async () => {
    abortRef.current?.abort();
    setMessages([]);
    sessionIdRef.current = undefined;
    // Clear from Firestore too
    if (user?.uid) {
      await saveChatToFirestore(user.uid, [], undefined);
    }
  };

  return (
    <div
      className="flex flex-col -m-4 md:-m-8"
      style={{ height: "calc(100vh - 56px)" }}
    >
      {/* Chat history header row — only show when messages exist */}
      {messages.length > 0 && (
        <div
          className="flex items-center justify-between px-6 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-muted-foreground/40 text-xs" id="chat-message-count">
            {messages.filter(m => m.role === "user").length} messages · Session active · Auto-saved
          </span>
          <button
            onClick={clearChat}
            className="text-muted-foreground/40 text-xs hover:text-destructive transition-colors"
            id="chat-clear-btn"
          >
            Clear chat
          </button>
        </div>
      )}

      {/* Scrollable chat area */}
      <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🛡️</span>
            </div>
            <p className="text-foreground text-xl font-semibold text-center">RAKSHAK AI Assistant</p>
            <p className="mt-2 text-muted-foreground/50 text-sm text-center max-w-sm">
              Damage assessment · Evacuation guidance · Medical triage · Emergency coordination
            </p>
            <p className="mt-1 text-muted-foreground/25 text-xs text-center">Powered by Gemma 4 31B</p>
            {user && (
              <p className="mt-1 text-muted-foreground/30 text-xs text-center">
                Logged in as {user.displayName ?? user.email}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  title="Click to pre-fill this prompt — press Enter or ↗ to send"
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
                  ? "ml-auto bg-primary/[0.12] border border-primary/20 text-foreground text-sm px-4 py-3 rounded-xl rounded-br-none max-w-[80%]"
                  : "mr-auto bg-white/[0.04] border border-white/[0.08] text-foreground/90 text-sm px-4 py-3 rounded-xl rounded-bl-none max-w-[80%] leading-relaxed"
                }>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="attachment" className="max-h-40 rounded-lg mb-2 object-cover" />
                  )}
                  {msg.role === "assistant" && msg.thinking && (
                    <ThinkingBlock thinking={msg.thinking} />
                  )}
                  {msg.role === "assistant" ? (
                    <MessageContent text={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <div className={`flex items-center gap-2 mt-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p className="text-[10px] text-muted-foreground/30">
                    {msg.timestamp instanceof Date
                      ? msg.timestamp.toLocaleTimeString("en-US", { hour12: true })
                      : new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: true })}
                  </p>
                  {msg.role === "assistant" && msg.modelUsed && (
                    <p className="text-[10px] text-muted-foreground/20">· {msg.modelUsed}</p>
                  )}
                </div>
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Attached image preview */}
      {imageFile && (
        <div className="px-6 py-2 flex items-center gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-primary text-xs">📎 Image attached</span>
          <button type="button" onClick={() => setImageFile(null)}
            className="text-muted-foreground/40 text-xs hover:text-destructive transition-colors">
            Remove
          </button>
        </div>
      )}

      {/* Input row */}
      <div
        className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "hsl(0 0% 8%)" }}
      >
        <button type="button" title="Attach image" onClick={() => fileRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground border border-white/10 rounded-lg px-3 py-2 transition-colors flex-shrink-0">
          📎
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <div className="flex-1 relative">
          <textarea
            rows={1}
            id="chat-input"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 transition-colors resize-none overflow-hidden"
            placeholder="Ask anything about emergency response…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          onClick={() => sendMessage(input, imageFile ?? undefined)}
          disabled={(!input.trim() && !imageFile) || typing}
          className="w-9 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
          title="Send"
          id="chat-send-btn"
        >
          →
        </button>
      </div>
    </div>
  );
}
