export type CampaignStatus = "draft" | "active" | "paused" | "finished";

export interface CampaignProps {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  draft: ["active", "finished"],
  active: ["paused", "finished"],
  paused: ["active", "finished"],
  finished: [],
};

export class InvalidCampaignTransitionError extends Error {
  constructor(from: CampaignStatus, to: CampaignStatus) {
    super(`Transição de campanha inválida: "${from}" -> "${to}"`);
    this.name = "InvalidCampaignTransitionError";
  }
}

export class Campaign {
  private constructor(private props: CampaignProps) {}

  static create(input: { id: string; name: string; now?: Date }): Campaign {
    const now = input.now ?? new Date();
    return new Campaign({
      id: input.id,
      name: input.name,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: CampaignProps): Campaign {
    return new Campaign(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): CampaignStatus {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === "active";
  }

  private transitionTo(next: CampaignStatus, now: Date): void {
    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidCampaignTransitionError(this.props.status, next);
    }
    this.props.status = next;
    this.props.updatedAt = now;
  }

  start(now = new Date()): void {
    this.transitionTo("active", now);
  }

  pause(now = new Date()): void {
    this.transitionTo("paused", now);
  }

  resume(now = new Date()): void {
    this.transitionTo("active", now);
  }

  finish(now = new Date()): void {
    this.transitionTo("finished", now);
  }

  toProps(): CampaignProps {
    return { ...this.props };
  }
}
