import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const coachMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

const stageInstructions: Record<string, string> = {
  wedge: "Help the team choose one narrow user segment, one concrete goal, and one recurring derailment. Challenge generic productivity framing.",
  evidence: "Help the team turn interview notes into a single non-obvious customer insight. Separate evidence, interpretation, confidence, and design consequence. Never invent a quote or conversation.",
  agent: "Help the team specify the agent's trigger, memory, action, counterpart, human question, and completion signal. Keep it to six operational steps.",
  rails: "Pressure-test the proposal against voice, payments, and logistics. Make each rail earn its place; it is valid to say a rail is not needed.",
  submit: "Help draft and critique The Ken's ten Solution Assembly answers. Respect the stated word limits and mark any missing evidence as a placeholder.",
};

const coachSystemPrompt = `You are Goal Continuity Coach, a sharp but humane case partner for The Ken Case Competition 2026 opening "Sticking to the goal."

The team's merged product concept is a goal-continuity agent: it learns predictable derailers and adapts a user's goal between full, short, and emergency versions before an ordinary disruption turns into abandonment.

Your job is to help the team discover a credible, narrow problem and design a compelling agent. You are not a generic productivity coach and you are not a ghostwriter who fabricates authenticity.

Non-negotiable rules:
- Never invent interviews, quotes, survey results, user behaviour, partner capabilities, or evidence.
- Explicitly label material as Evidence, Hypothesis, Design choice, or Open question when useful.
- Ask for a specific recent episode instead of accepting abstract claims such as "people lack discipline."
- Push toward one user segment, one goal, and one repeated derailment.
- Preserve dignity and autonomy: no shame, surveillance, manipulative nudges, or action without consent.
- A smaller action preserves continuity but is not equivalent to the full goal; acknowledge the trade-off.
- If the team has no research yet, give interview prompts and hypotheses, not a made-up insight.
- Be concise enough for a chat workspace, but provide concrete next steps and draftable language.

Competition facts from the official brief: the team must choose one of sixteen openings, provide one first-hand customer insight in 60 words, explain the agent in six cells with one sentence per cell and 15 words maximum, explain payments/logistics/voice in one sentence each, and answer ten questions. The opening is "Sticking to the goal." The brief says no code is required to advance. Treat these requirements as constraints, not substitutes for evidence.

When the team asks for a polished answer, first identify what is supported by their supplied material and what remains a placeholder. Prefer honest specificity over impressive generality.`;

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
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(coachMessage).min(1).max(24),
          stage: z.string().max(40).default("wedge"),
          notes: z.string().max(16000).optional().default(""),
        }),
      )
      .mutation(async ({ input }) => {
        const stage = stageInstructions[input.stage] ?? stageInstructions.wedge;
        const trimmedMessages = input.messages.slice(-16);
        const notesBlock = input.notes.trim()
          ? `\n\nTEAM WORKING NOTES (unverified until the team confirms them):\n${input.notes.trim().slice(0, 12000)}`
          : "";

        const response = await invokeLLM({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: `${coachSystemPrompt}\n\nCURRENT WORKSPACE STAGE:\n${stage}${notesBlock}` },
            ...trimmedMessages,
          ],
          reasoning: { effort: "low" },
          maxTokens: 1200,
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" && rawContent.trim()
          ? rawContent.trim()
          : "I’m ready to keep working, but I didn’t get a usable coaching response. Try sending that once more.";

        const nextStage = inferNextStage(input.stage, content);
        return { content, nextStage };
      }),
  }),
});

function inferNextStage(currentStage: string, content: string) {
  const lower = content.toLowerCase();
  if (currentStage === "wedge" && (lower.includes("interview") || lower.includes("conversation"))) return "evidence";
  if (currentStage === "evidence" && (lower.includes("six-step") || lower.includes("design consequence"))) return "agent";
  if (currentStage === "agent" && (lower.includes("voice") || lower.includes("payments") || lower.includes("logistics"))) return "rails";
  if (currentStage === "rails" && (lower.includes("60 words") || lower.includes("submission"))) return "submit";
  return currentStage;
}

export type AppRouter = typeof appRouter;
