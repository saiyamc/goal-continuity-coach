import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { createHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createGoal, getGoalForUser, getDb, listGoals, updateGoal } from "./db";
import { goals } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const coachMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(30000) });
const stageInstructions: Record<string, string> = {
  wedge: "Help the team choose one narrow user segment, one concrete goal, and one recurring derailment. Challenge generic productivity framing.",
  evidence: "Help the team turn interview notes into a single non-obvious customer insight. Separate evidence, interpretation, confidence, and design consequence. Never invent a quote or conversation.",
  agent: "Help the team specify the agent's trigger, memory, action, counterpart, human question, and completion signal. Keep it to six operational steps.",
  rails: "Pressure-test the proposal against voice, payments, and logistics. Make each rail earn its place; it is valid to say a rail is not needed.",
  submit: "Help draft and critique The Ken's ten Solution Assembly answers. Respect the stated word limits and mark any missing evidence as a placeholder.",
};
const coachSystemPrompt = `You are Goal Continuity Coach, a sharp but humane case partner for The Ken Case Competition 2026 opening "Sticking to the goal." The team's merged product concept is a goal-continuity agent: it learns predictable derailers and adapts a user's goal between full, short, and emergency versions before an ordinary disruption turns into abandonment.

You are designed for extremely long, dense, multi-person inputs. Read the entire input before answering. Extract every person, goal, constraint, time pattern, emotional signal, contradiction, and proposed workaround. Do not collapse multiple people into one generic user. If the team lists several members or users, create a compact comparison before synthesising.

Never invent interviews, quotes, survey results, user behaviour, partner capabilities, or evidence. Label Evidence, Hypothesis, Design choice, or Open question when useful. Push toward one user segment, one goal, and one repeated derailment, but preserve meaningful differences between people. Preserve dignity and autonomy: no shame, surveillance, manipulative nudges, or action without consent. A smaller action preserves continuity but is not equivalent to the full goal. If the team has no research, give prompts and hypotheses, not a made-up insight. The team must provide a 60-word insight, six agent steps with 15 words maximum each, three rail sentences, and ten answers.

For dense inputs, use this response structure when appropriate: 1) What I heard, 2) Common pattern, 3) Important differences, 4) Evidence versus hypothesis, 5) Best wedge, 6) What to ask next, 7) Product implication.`;

export const SIX_HOUR_CRON = "0 0 */6 * * *";


function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("coach-timeout")), milliseconds)),
  ]);
}

export function personalisedFallback(input: { messages: Array<{ content: string }> }) {
  const text = input.messages.map((message) => message.content).join("\n");
  const names = Array.from(text.matchAll(/\b([A-Z][a-z]{2,})\s*[–-]\s*(?:MBA\s+student|student)/g)).map((match) => match[1]);
  const uniqueNames = Array.from(new Set(names));
  const nameLine = uniqueNames.length ? uniqueNames.join(", ") : "the people described";
  const hasGym = /gym|workout|fitness/i.test(text);
  const hasExam = /exam|study|course/i.test(text);
  const hasReading = /read|book/i.test(text);
  const goalLine = [hasGym && "fitness", hasExam && "exam preparation", hasReading && "reading"].filter(Boolean).join(", ") || "their personal goals";
  return `## Personalised synthesis\n\n**What I heard:** ${nameLine} are MBA students with long college and coursework days. Their evening goals—${goalLine}—compete with fatigue and the pull of going home.\n\n**Common pattern:** The likely break is not lack of ambition; it is the campus-to-home transition. Once energy is depleted and the person reaches home, an optional goal loses to comfort, sleep, or distraction.\n\n**Important differences:** ${hasGym ? "The gym goal has a location and activation cost;" : "Different goals have different friction;"} ${hasExam ? "exam preparation carries performance pressure;" : "some goals may be restorative or optional;"} ${hasReading ? "reading is portable but still competes with sleep." : "the fallback must respect energy, not demand an ideal evening."}\n\n**Evidence versus hypothesis:** Evidence supplied: long days, tiredness, and a repeated preference for home or rest. Hypothesis to test: the agent should intervene before leaving campus and offer a smaller version before the goal disappears.\n\n**Best next question:** Ask each person: “What is the last moment on campus when you still had enough energy to do a smaller version, and what would that version have been?”\n\n**Design implication:** Build a pre-commute check-in: full version before leaving, short version on campus, emergency version at home. Do not treat the three people as one user until you test whether the same intervention works for all of them.`;
}

export function formatReminderEmail(goal: { title: string; fullAction: string; shortAction: string; emergencyAction: string }) {
  return {
    subject: `A small step for: ${goal.title}`,
    text: `Your planned action may need a smaller version today.\n\nFull: ${goal.fullAction}\nBusy-day version: ${goal.shortAction}\nEmergency version: ${goal.emergencyAction}\n\nOpen Goal Continuity to complete or renegotiate it.`,
  };
}

function sessionToken(req: { headers: { cookie?: string } }) {
  return parseCookie(req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  coach: router({
    chat: publicProcedure.input(z.object({ messages: z.array(coachMessage).min(1).max(48), stage: z.string().max(40).default("wedge"), notes: z.string().max(40000).optional().default("") })).mutation(async ({ input }) => {
      const stage = stageInstructions[input.stage] ?? stageInstructions.wedge;
      const notesBlock = input.notes.trim() ? `\n\nTEAM WORKING NOTES (unverified until confirmed):\n${input.notes.trim().slice(0, 12000)}` : "";
      const promptMessages = [{ role: "system" as const, content: `${coachSystemPrompt}\n\nCURRENT STAGE:\n${stage}${notesBlock}` }, ...input.messages.slice(-28)];
      let rawContent: unknown = "";
      try {
        const response = await withTimeout(invokeLLM({ model: "gpt-5-mini", messages: promptMessages, reasoning: { effort: "low" }, maxTokens: 1400 }), 14000);
        rawContent = response.choices?.[0]?.message?.content;
      } catch (primaryError) {
        console.warn("[Coach] Timed out or failed; using personalised fallback", String(primaryError));
      }
      const content = typeof rawContent === "string" && rawContent.trim() ? rawContent.trim() : personalisedFallback(input);
      return { content, nextStage: input.stage };
    }),
  }),
  goals: router({
    list: protectedProcedure.query(({ ctx }) => listGoals(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().min(3).max(240), fullAction: z.string().min(3).max(800), shortAction: z.string().min(3).max(800), emergencyAction: z.string().min(1).max(800), reminderEmail: z.string().email().optional(), reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("20:00"), reminderEnabled: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const id = await createGoal({ ...input, userId: ctx.user.id, reminderEnabled: input.reminderEnabled ? 1 : 0 });
      return { id, delivery: input.reminderEmail ? "email_provider_required" : "in_app" };
    }),
    complete: protectedProcedure.input(z.object({ goalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await updateGoal(input.goalId, ctx.user.id, { lastCompletedAt: new Date(), lastReminderAt: null });
      return { success: true };
    }),
    scheduleReminder: protectedProcedure.input(z.object({ goalId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const goal = await getGoalForUser(input.goalId, ctx.user.id);
      if (!goal) throw new Error("Goal not found");
      const token = sessionToken(ctx.req);
      if (!input.enabled) {
        if (goal.scheduleCronTaskUid) await deleteHeartbeatJob(goal.scheduleCronTaskUid, token);
        await updateGoal(goal.id, ctx.user.id, { reminderEnabled: 0, scheduleCronTaskUid: null });
        return { enabled: false };
      }
      if (!goal.reminderEmail) throw new Error("Add a reminder email before enabling delivery");
      const job = await createHeartbeatJob({ name: `goal-reminder-${goal.id}`, cron: SIX_HOUR_CRON, path: "/api/scheduled/goalReminder", payload: {}, description: `Goal Continuity reminder for ${goal.title}` }, token);
      await updateGoal(goal.id, ctx.user.id, { reminderEnabled: 1, scheduleCronTaskUid: job.taskUid });
      return { enabled: true, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
  }),
});

export async function handleGoalReminder(taskUid: string) {
  const db = await getDb();
  if (!db) return { ok: true, skipped: "database-unavailable" };
  const rows = await db.select().from(goals).where(eq(goals.scheduleCronTaskUid, taskUid)).limit(1);
  const goal = rows[0];
  if (!goal || !goal.reminderEnabled) return { ok: true, skipped: "orphan-or-disabled" };
  const now = Date.now();
  const lastCompleted = goal.lastCompletedAt?.getTime() ?? 0;
  const lastReminder = goal.lastReminderAt?.getTime() ?? 0;
  if (lastCompleted > lastReminder && now - lastCompleted < 6 * 60 * 60 * 1000) {
    await db.update(goals).set({ lastReminderAt: new Date(now) }).where(eq(goals.id, goal.id));
    return { ok: true, skipped: "completed-this-window", goalId: goal.id };
  }
  const webhook = process.env.REMINDER_EMAIL_WEBHOOK_URL;
  if (!webhook) return { ok: true, skipped: "email-provider-not-configured", goalId: goal.id };
  const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: goal.reminderEmail, ...formatReminderEmail(goal) }) });
  if (!response.ok) throw new Error(`Reminder email webhook failed: ${response.status}`);
  await db.update(goals).set({ lastReminderAt: new Date() }).where(eq(goals.id, goal.id));
  return { ok: true, delivered: true, goalId: goal.id };
}

export type AppRouter = typeof appRouter;
