export type PromptOrigin = "typed" | "voice";
export interface VoiceReplyTicket { revision: number; origin: PromptOrigin; language: string }

/** Only a completed reply to the current, unedited voice prompt may auto-read. */
export class VoiceReplyGate {
  private revision = 0;
  private origin: PromptOrigin = "typed";

  draftChanged(origin: PromptOrigin) {
    this.revision += 1;
    this.origin = origin;
  }

  invalidate() { this.draftChanged("typed"); }

  begin(language: string): VoiceReplyTicket {
    return { revision: this.revision, origin: this.origin, language };
  }

  shouldRead(ticket: VoiceReplyTicket, language: string, aborted: boolean): boolean {
    return !aborted && ticket.origin === "voice" && ticket.revision === this.revision && ticket.language === language;
  }
}
