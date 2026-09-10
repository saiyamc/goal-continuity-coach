import { describe, expect, it } from "vitest";
import { cronForTime, formatReminderEmail } from "./routers";

describe("goal reminders", () => {
  it("creates a UTC heartbeat expression from the configured time", () => {
    expect(cronForTime("20:05")).toBe("0 5 20 * * *");
    expect(cronForTime("08:00")).toBe("0 0 8 * * *");
  });

  it("keeps the full, busy-day, and emergency actions in the reminder", () => {
    const message = formatReminderEmail({
      title: "Exam preparation",
      fullAction: "Study for 60 minutes",
      shortAction: "Revise one topic for 15 minutes",
      emergencyAction: "Review five flashcards",
    });
    expect(message.subject).toBe("A small step for: Exam preparation");
    expect(message.text).toContain("Study for 60 minutes");
    expect(message.text).toContain("Revise one topic for 15 minutes");
    expect(message.text).toContain("Review five flashcards");
  });
});
