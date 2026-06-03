export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TeamMemberInfo {
  email: string;
  displayName: string;
  role: "owner" | "member";
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  members: Record<string, TeamMemberInfo>;
  createdAt: number;
}

export interface Task {
  id: string;
  teamId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  deadline: string;
  createdAt: number;
  createdBy: string;
}

export interface Invite {
  id: string;
  teamId: string;
  teamName: string;
  emailLower: string;
  invitedBy: string;
  invitedByName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export const getStatusColor = (status: TaskStatus) => {
  const map: Record<TaskStatus, string> = {
    "todo": "bg-muted text-muted-foreground",
    "in-progress": "bg-accent/15 text-accent",
    "review": "bg-warning/15 text-warning",
    "done": "bg-success/15 text-success",
  };
  return map[status];
};

export const getPriorityColor = (priority: TaskPriority) => {
  const map: Record<TaskPriority, string> = {
    low: "border-muted-foreground/30",
    medium: "border-accent",
    high: "border-warning",
    urgent: "border-destructive",
  };
  return map[priority];
};

export const initialsFromName = (name?: string | null, email?: string | null) =>
  (name || email || "U").split(/\s+|@/)[0].slice(0, 2).toUpperCase();
