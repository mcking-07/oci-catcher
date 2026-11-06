type CatchOutcomeType =
  | { status: 'exists'; instance_id: string; lifecycle_state: string }
  | { status: 'unavailable'; availability: string }
  | { status: 'launched'; instance_id: string }
  | { status: 'retrying'; reason: string }
  | { status: 'failed'; reason: string };

type NotificationType = {
  title: string;
  message: string;
  priority: 'default' | 'high' | 'urgent';
  tags: string[];
};

export type { CatchOutcomeType, NotificationType };
