import { FormEvent, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  FileText,
  Flag,
  Mic2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import GoalPanel from "@/components/GoalPanel";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Stage = {
  id: string;
  label: string;
  description: string;
  icon: typeof Compass;
};

const stages: Stage[] = [
  { id: "wedge", label: "Find the wedge", description: "Choose one person, goal, and recurring derailment.", icon: Compass },
  { id: "evidence", label: "Gather evidence", description: "Turn conversations into one sharp insight.", icon: Users },
  { id: "agent", label: "Design the agent", description: "Build the six-step continuity loop.", icon: Target },
  { id: "rails", label: "Stress-test the rails", description: "Make payments, logistics, and voice earn their place.", icon: RotateCcw },
  { id: "submit", label: "Shape the submission", description: "Draft the ten answers without losing the human truth.", icon: FileText },
];

const openingPrompts = [
  "We are thinking about students preparing for competitive exams. Help us find the sharpest wedge.",
  "Here are our interview notes. Separate evidence from assumptions and find the strongest insight.",
  "Help us design the six-step agent for a student whose study plan breaks when college runs late.",
];

const initialMessage: ChatMessage = {
  role: "assistant",
  content:
    "I’m your **Goal Continuity Coach**. I’ll help you build the case, not just polish the pitch.\n\nWe’ll look for the moment when an ordinary disruption turns into abandoning a goal. I will keep **evidence, hypotheses, and design choices separate**—and I will never invent research.\n\nStart with a user group, a goal, or a real failure-to-follow-through story.",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [activeStage, setActiveStage] = useState("wedge");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatMutation = trpc.coach.chat.useMutation();
  const activeStageData = useMemo(() => stages.find((stage) => stage.id === activeStage) ?? stages[0], [activeStage]);

  useEffect(() => {
    const stored = window.localStorage.getItem("goal-continuity-notes");
    if (stored) setNotes(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("goal-continuity-notes", notes);
  }, [notes]);

  const sendMessage = async (value?: string) => {
    const content = (value ?? draft).trim();
    if (!content || chatMutation.isPending) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");

    try {
      const result = await chatMutation.mutateAsync({
        messages: nextMessages,
        stage: activeStage,
        notes,
      });
      setMessages((current) => [...current, { role: "assistant", content: result.content }]);
      if (result.nextStage && stages.some((stage) => stage.id === result.nextStage)) {
        setActiveStage(result.nextStage);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I couldn’t complete that deep analysis just now. Your notes are still safe in this browser—please send it again; long, dense case inputs are supported.",
        },
      ]);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const resetChat = () => {
    setMessages([initialMessage]);
    setActiveStage("wedge");
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setDraft((current) => `${current}${current ? " " : ""}Voice input is not available in this browser.`);
      return;
    }
    const SpeechRecognition = (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setDraft((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`);
    };
    recognition.start();
  };

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17211d]">
      <header className="border-b border-[#d9e0d8] bg-[#f6f7f2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#163c30] text-[#e8f6c6] shadow-[0_6px_18px_rgba(22,60,48,0.18)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold tracking-tight">Goal Continuity</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#748078]">The Ken case studio</div>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-xs font-medium text-[#637069] sm:flex">
            <span className="rounded-full border border-[#d4ddd3] bg-white/70 px-3 py-1.5">Opening 13 / 16</span>
            <a className="inline-flex items-center gap-1.5 transition-colors hover:text-[#163c30]" href="https://the-ken.com/case-competition-2026/" target="_blank" rel="noreferrer">
              Competition brief <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="hidden border-r border-[#d9e0d8] px-5 py-8 lg:block">
          <div className="mb-8">
            <p className="eyebrow">Your workspace</p>
            <h1 className="mt-2 font-display text-[29px] font-semibold leading-[1.05] tracking-[-0.04em]">Make the goal survive the day.</h1>
            <p className="mt-4 text-sm leading-6 text-[#69766e]">A case coach for the moment a predictable disruption becomes a reason to quit.</p>
          </div>
          <nav className="space-y-2" aria-label="Case stages">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const active = stage.id === activeStage;
              return (
                <button key={stage.id} onClick={() => setActiveStage(stage.id)} className={`stage-item ${active ? "stage-item-active" : ""}`}>
                  <span className={`stage-number ${active ? "stage-number-active" : ""}`}>{active ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}</span>
                  <span className="min-w-0 text-left">
                    <span className="flex items-center gap-2 font-semibold">{stage.label} <Icon className="h-3.5 w-3.5 opacity-45" /></span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#7b877f]">{stage.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-10 rounded-2xl border border-[#d4e0c4] bg-[#eaf3d1] p-4">
            <ShieldCheck className="h-5 w-5 text-[#4f702b]" />
            <p className="mt-3 text-xs font-semibold leading-5 text-[#344a2b]">Evidence guardrail</p>
            <p className="mt-1 text-[11px] leading-4 text-[#65755e]">No invented interviews. No “students lack discipline” without proof.</p>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[820px]">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#829087]"><span className="h-2 w-2 rounded-full bg-[#c4d96c]" /> Live case room</div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Let’s find the real break.</h2>
              </div>
              <button onClick={resetChat} className="icon-button" aria-label="Reset conversation" title="Reset conversation"><RotateCcw className="h-4 w-4" /></button>
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {stages.map((stage) => <button key={stage.id} onClick={() => setActiveStage(stage.id)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${activeStage === stage.id ? "border-[#163c30] bg-[#163c30] text-white" : "border-[#d9e0d8] bg-white text-[#68756d]"}`}>{stage.label}</button>)}
            </div>

            <div className="chat-card">
              <div className="flex items-center justify-between border-b border-[#e4e8e2] px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3d1] text-[#4f702b]"><Compass className="h-4 w-4" /></div><div><div className="text-sm font-semibold">Continuity coach</div><div className="text-[11px] text-[#7d8981]">Working on: {activeStageData.label}</div></div></div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#f2f5ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7c887f]"><span className="h-1.5 w-1.5 rounded-full bg-[#8ca847]" /> grounded mode</div>
              </div>
              <div className="chat-scroll space-y-6 px-5 py-6 sm:px-7">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#163c30] text-[#e8f6c6]"><Sparkles className="h-3.5 w-3.5" /></div>}
                    <div className={message.role === "user" ? "message-user" : "message-assistant"}>
                      {message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p className="whitespace-pre-wrap">{message.content}</p>}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && <div className="flex gap-3"><div className="mt-1 grid h-7 w-7 place-items-center rounded-lg bg-[#163c30] text-[#e8f6c6]"><Sparkles className="h-3.5 w-3.5" /></div><div className="message-assistant"><div className="flex gap-1.5 py-1"><span className="typing-dot" /><span className="typing-dot delay-1" /><span className="typing-dot delay-2" /></div></div></div>}
              </div>
              <form onSubmit={submit} className="border-t border-[#e4e8e2] bg-[#fbfcfa] p-4 sm:p-5">
                <div className="relative rounded-2xl border border-[#d9e2d8] bg-white p-2 shadow-[0_4px_16px_rgba(24,51,40,0.04)] focus-within:border-[#8da66b] focus-within:ring-4 focus-within:ring-[#e9f1d8]">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Paste a long case, multiple people, or the day the goal broke..." rows={2} className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-[#a2aca5]" />
                  <div className="flex items-center justify-between px-1 pb-1"><div className="flex items-center gap-1"><button type="button" onClick={() => setShowNotes((value) => !value)} className="small-action"><FileText className="h-3.5 w-3.5" /> {showNotes ? "Hide notes" : "Add notes"}</button><button type="button" onClick={toggleVoice} className={`small-action ${isListening ? "text-[#a9503a]" : ""}`}><Mic2 className="h-3.5 w-3.5" /> {isListening ? "Listening" : "Speak"}</button></div><button type="submit" disabled={!draft.trim() || chatMutation.isPending} className="send-button"><ArrowUpRight className="h-4 w-4" /></button></div>
                </div>
                {showNotes && <div className="mt-3 rounded-xl border border-[#e0e8d9] bg-[#f5f9ee] p-3"><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#61715d]">Working notes · stored only in this browser</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Paste interview notes, rough observations, or quotes here..." className="w-full resize-none rounded-lg border border-[#dce6d3] bg-white p-2.5 text-xs leading-5 outline-none focus:border-[#8da66b]" /></div>}
              </form>
            </div>

            <GoalPanel />

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {openingPrompts.map((prompt) => <button key={prompt} onClick={() => void sendMessage(prompt)} className="prompt-card"><span>{prompt}</span><ChevronRight className="h-4 w-4 shrink-0 text-[#a1aea4]" /></button>)}
            </div>
          </div>
        </section>

        <aside className="border-t border-[#d9e0d8] px-5 py-7 lg:border-l lg:border-t-0 lg:px-6 lg:py-9">
          <div className="sticky top-6">
            <div className="flex items-center justify-between"><p className="eyebrow">Agent blueprint</p><button onClick={() => setShowNotes(true)} className="text-[#809087] transition-colors hover:text-[#163c30]" aria-label="Open working notes"><FileText className="h-4 w-4" /></button></div>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">Protect continuity, not perfection.</h3>
            <p className="mt-3 text-sm leading-6 text-[#6d7a72]">The merged idea has two jobs: see a difficult day coming, then shrink the goal before it disappears.</p>

            <div className="mt-7 space-y-2">
              {[{ label: "Full day", value: "60 min focused study", tone: "bg-[#163c30] text-white" }, { label: "Busy day", value: "15 min revision", tone: "bg-[#dbe9ba] text-[#385027]" }, { label: "Emergency", value: "5 flashcards", tone: "bg-[#f4e8d4] text-[#7d5b2e]" }].map((item) => <div key={item.label} className={`rounded-xl p-3.5 ${item.tone}`}><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] opacity-70"><span>{item.label}</span><Flag className="h-3.5 w-3.5" /></div><div className="mt-2 text-sm font-semibold">{item.value}</div></div>)}
            </div>

            <div className="mt-7 border-t border-[#d9e0d8] pt-6"><p className="eyebrow">Rails to earn</p><div className="mt-4 space-y-4"><div className="flex gap-3"><div className="rail-icon"><Mic2 className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Voice · likely core</p><p className="mt-1 text-xs leading-4 text-[#7b877f]">Signal “I’m running late” hands-free, then adapt.</p></div></div><div className="flex gap-3 opacity-60"><div className="rail-icon"><ArrowUpRight className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Payments · prove the bottleneck</p><p className="mt-1 text-xs leading-4 text-[#7b877f]">Only if a paid service is part of continuity.</p></div></div><div className="flex gap-3 opacity-60"><div className="rail-icon"><BookOpen className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Logistics · optional</p><p className="mt-1 text-xs leading-4 text-[#7b877f]">Do not force a delivery story into the case.</p></div></div></div></div>

            <div className="mt-8 rounded-2xl bg-[#163c30] p-4 text-[#edf7d5]"><div className="flex items-start justify-between gap-3"><CircleHelp className="h-5 w-5 shrink-0 text-[#c4d96c]" /><button className="text-[#b7cbb8] hover:text-white" onClick={() => setNotes("")} aria-label="Clear notes"><X className="h-4 w-4" /></button></div><p className="mt-3 text-xs font-semibold leading-5">Question to test next</p><p className="mt-1 text-[11px] leading-4 text-[#b7cbb8]">When someone misses a goal, do they want motivation—or a smaller version that still counts?</p></div>
          </div>
        </aside>
      </div>
      <footer className="border-t border-[#d9e0d8] px-5 py-5 text-center text-[11px] text-[#87938b]">Built for human-grounded case work · Research first, agent second.</footer>
    </main>
  );
}

type SpeechRecognitionEvent = Event & { results: { [key: number]: { [key: number]: { transcript: string } } } };
type SpeechRecognition = { lang: string; interimResults: boolean; onstart: () => void; onend: () => void; onresult: (event: SpeechRecognitionEvent) => void; start: () => void };

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}
