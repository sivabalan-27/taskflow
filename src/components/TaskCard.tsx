import { Calendar } from "lucide-react";
import { Task, getStatusColor, getPriorityColor, TeamMemberInfo, initialsFromName } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  task: Task;
  assignee?: TeamMemberInfo;
}

export function TaskCard({ task, assignee }: Props) {
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue =
    deadlineDate && deadlineDate < new Date() && task.status !== "done";
  const initials = initialsFromName(assignee?.displayName, assignee?.email);

  return (
    <div
      className={`rounded-xl border-l-4 ${getPriorityColor(task.priority)} bg-card border border-border p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-card-foreground leading-snug">
          {task.title}
        </h3>
        <Badge variant="secondary" className={`text-xs shrink-0 ${getStatusColor(task.status)}`}>
          {task.status}
        </Badge>
      </div>
      {task.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
            {initials}
          </div>
          <span>{assignee?.displayName || "Unassigned"}</span>
        </div>
        {deadlineDate && (
          <div
            className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
