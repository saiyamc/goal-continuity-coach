import { useState } from "react";
import { Bell, CheckCircle2, Clock3, Mail, Plus, ShieldAlert, Target, X } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function GoalPanel() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fullAction, setFullAction] = useState("");
  const [shortAction, setShortAction] = useState("");
  const [emergencyAction, setEmergencyAction] = useState("");
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const utils = trpc.useUtils();
  const goalsQuery = trpc.goals.list.useQuery(undefined, { enabled: isAuthenticated });
  const createGoal = trpc.goals.create.useMutation({ onSuccess: () => { void utils.goals.list.invalidate(); reset(); } });
  const completeGoal = trpc.goals.complete.useMutation({ onSuccess: () => void utils.goals.list.invalidate() });
  const scheduleReminder = trpc.goals.scheduleReminder.useMutation({ onSuccess: () => void utils.goals.list.invalidate() });

  const reset = () => { setOpen(false); setTitle(""); setFullAction(""); setShortAction(""); setEmergencyAction(""); setReminderEmail(""); setReminderEnabled(false); };
  const save = async () => {
    const result = await createGoal.mutateAsync({ title, fullAction, shortAction, emergencyAction, reminderEmail: reminderEmail || undefined, reminderTime, reminderEnabled: false });
    if (reminderEnabled && reminderEmail) await scheduleReminder.mutateAsync({ goalId: result.id, enabled: true });
  };

  if (!isAuthenticated) {
    return <section className="goal-panel mt-7"><div className="flex items-start gap-3"><div className="goal-panel-icon"><ShieldAlert className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#163c30]">Make it persistent</p><p className="mt-1 text-xs leading-5 text-[#68766d]">Sign in to save a goal, track completions across days, and schedule reminders that survive closing this page.</p><button onClick={() => startLogin()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#163c30] px-3 py-2 text-xs font-semibold text-[#e8f6c6]">Sign in to add a goal <Target className="h-3.5 w-3.5" /></button></div></div></section>;
  }

  return <section className="goal-panel mt-7">
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Live continuity loop</p><h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">Your goals, not just your case.</h3><p className="mt-2 text-xs leading-5 text-[#718078]">Add a real commitment. The agent can mark completion, learn the miss, and escalate only when you choose.</p></div><button onClick={() => setOpen(true)} className="add-goal-button"><Plus className="h-4 w-4" /> Add goal</button></div>
    {goalsQuery.data?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{goalsQuery.data.map((goal) => <div key={goal.id} className="goal-card"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#163c30]">{goal.title}</p><p className="mt-1 text-xs leading-5 text-[#68766d]">Full: {goal.fullAction}</p></div><Target className="h-4 w-4 shrink-0 text-[#779257]" /></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-[#eef4e8] p-2"><span className="font-bold uppercase tracking-wider text-[#759063]">Busy day</span><p className="mt-1 text-[#4c604d]">{goal.shortAction}</p></div><div className="rounded-lg bg-[#f8eddc] p-2"><span className="font-bold uppercase tracking-wider text-[#9a784b]">Emergency</span><p className="mt-1 text-[#80643e]">{goal.emergencyAction}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-[#e7ece4] pt-3"><div className="flex items-center gap-1.5 text-[10px] text-[#7d8981]"><Clock3 className="h-3 w-3" /> {goal.reminderTime} {goal.reminderEnabled ? "· reminder on" : "· reminders off"}</div><button onClick={() => completeGoal.mutate({ goalId: goal.id })} disabled={completeGoal.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cdddc5] px-2.5 py-1.5 text-[10px] font-semibold text-[#4f702b] hover:bg-[#eef4e8]"><CheckCircle2 className="h-3.5 w-3.5" /> Mark done</button></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#cbd8c5] bg-[#f6faef] px-4 py-5 text-center"><p className="text-xs font-semibold text-[#4f652f]">No live goals yet</p><p className="mt-1 text-[11px] text-[#7d8d78]">Add the goal you want this agent to protect in real life.</p></div>}
    <div className="mt-4 flex items-center gap-2 text-[10px] text-[#819087]"><Mail className="h-3.5 w-3.5" /> Email reminders are wired for a mail provider; the app will show the delivery status before enabling them.</div>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-[#163c30]/25 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl border border-[#d9e0d8] bg-[#fbfcfa] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="eyebrow">New commitment</p><h4 className="mt-1 font-display text-2xl font-semibold">What should survive today?</h4></div><button onClick={reset} className="text-[#849087] hover:text-[#163c30]"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3"><label className="field-label">Goal title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prepare for my exam" className="field-input" /></label><label className="field-label">Full-day action<input value={fullAction} onChange={(e) => setFullAction(e.target.value)} placeholder="Study one chapter for 60 minutes" className="field-input" /></label><label className="field-label">Busy-day version<input value={shortAction} onChange={(e) => setShortAction(e.target.value)} placeholder="Revise one topic for 15 minutes" className="field-input" /></label><label className="field-label">Emergency version<input value={emergencyAction} onChange={(e) => setEmergencyAction(e.target.value)} placeholder="Review five flashcards" className="field-input" /></label><div className="grid gap-3 sm:grid-cols-[1fr_120px]"><label className="field-label">Reminder email<input type="email" value={reminderEmail} onChange={(e) => setReminderEmail(e.target.value)} placeholder="you@example.com" className="field-input" /></label><label className="field-label">Check-in time<input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="field-input" /></label></div><label className="flex items-start gap-2 rounded-xl border border-[#e1e8df] bg-white p-3 text-xs text-[#66746b]"><input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} className="mt-0.5 accent-[#163c30]" /><span><span className="font-semibold text-[#34483b]">Enable missed-goal reminder</span><span className="mt-1 block text-[11px] leading-4">The scheduler checks this daily. Completion and rescheduling remain under the user’s control.</span></span></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={reset} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#738078]">Cancel</button><button onClick={() => void save()} disabled={!title || !fullAction || !shortAction || !emergencyAction || createGoal.isPending || scheduleReminder.isPending} className="rounded-lg bg-[#163c30] px-4 py-2 text-xs font-semibold text-[#e8f6c6]">{createGoal.isPending || scheduleReminder.isPending ? "Saving…" : "Save goal"}</button></div></div></div>}
  </section>;
}
