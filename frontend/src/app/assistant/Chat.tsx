"use client";

import { Bot, Loader2, Send, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  products?: { id: string; title: string; price: number; offers: number }[];
  mode?: string;
  tools?: { name: string }[];
}

const SUGGESTIONS = ["برای ماشینم چه روغن موتوری مناسبه؟", "لنت جلو ارزان و مطمئن می‌خوام", "سرویس بعدی ماشین‌هام کیه؟", "باتری مناسب هایما S7 زیر ۸ میلیون"];

const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");

export function Chat({ carTitle }: { carTitle?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const j = await res.json();
      setMsgs([...next, { role: "assistant", content: j.text ?? j.detail ?? "خطا", products: j.products, mode: j.mode, tools: j.toolCalls }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "ارتباط برقرار نشد. دوباره تلاش کنید." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex h-[calc(100dvh-14rem)] min-h-[480px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="mx-auto max-w-md py-8 text-center">
            <Bot className="mx-auto h-12 w-12 text-brand" strokeWidth={1.4} />
            <h2 className="mt-3 font-bold">دستیار هوشمند خودرو</h2>
            <p className="mt-1 text-sm text-muted">{carTitle ? `خودروی فعال: ${carTitle}. ` : ""}درباره قطعه، روغن، سازگاری یا زمان سرویس بپرسید.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="chip border border-line bg-white py-2 hover:border-brand">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "" : "flex-row-reverse"}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-navy text-white" : "bg-brand-soft text-brand"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </span>
            <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "" : "text-left"}`}>
              <div className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-right text-sm leading-7 ${m.role === "user" ? "bg-navy text-white" : "bg-canvas"}`}>{m.content}</div>
              {m.products && m.products.length > 0 && (
                <div className="grid gap-2 text-right sm:grid-cols-2">
                  {m.products.slice(0, 4).map((p) => (
                    <Link key={p.id} href={`/product/${p.id}`} className="rounded-xl border border-line bg-white p-3 text-xs hover:border-brand">
                      <div className="line-clamp-2 font-semibold">{p.title}</div>
                      <div className="mt-1 text-muted">
                        از {fa(p.price)} تومان · {fa(p.offers)} فروشنده
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {m.role === "assistant" && m.mode && (
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
                  <Wrench className="h-3 w-3" /> {m.mode === "claude" ? "Claude" : "حالت آفلاین"}
                  {m.tools?.map((t, j) => (
                    <span key={j} className="rounded bg-canvas px-1.5 py-0.5 font-mono" dir="ltr">
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex flex-row-reverse items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> در حال بررسی کاتالوگ و دفترچه خودرو…
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="مثلاً: برای پژو ۲۰۶ تیپ ۵ من چه روغن موتوری مناسبه؟" />
        <button className="btn-primary" disabled={busy} aria-label="ارسال">
          <Send className="h-4 w-4 -scale-x-100" />
        </button>
      </form>
    </div>
  );
}
