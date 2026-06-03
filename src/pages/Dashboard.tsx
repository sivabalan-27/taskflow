import { useEffect, useState } from "react";
import { ListTodo, Users, CheckCircle2, Clock } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeam } from "@/context/TeamContext";
import { Task } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";

export default function Dashboard() {
  const { currentTeam, isMember } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!currentTeam || !isMember) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, "tasks"), where("teamId", "==", currentTeam.id));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Task[]);
    });
    return unsub;
  }, [currentTeam, isMember]);

  if (!currentTeam) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-3">
        <h2 className="text-xl font-semibold">Welcome 👋</h2>
        <p className="text-muted-foreground text-sm">
          Head to the Teams page to create a team or accept an invite.
        </p>
      </div>
    );
  }

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const memberCount = Object.keys(currentTeam.members || {}).length;
  const upcoming = tasks
    .filter((t) => t.status !== "done" && t.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard · <span className="text-accent">{currentTeam.name}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your team's progress
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={tasks.length} icon={ListTodo} />
        <StatCard label="In Progress" value={inProgress} icon={Clock} />
        <StatCard
          label="Completed"
          value={doneTasks}
          icon={CheckCircle2}
          trend={tasks.length ? `${Math.round((doneTasks / tasks.length) * 100)}%` : "—"}
        />
        <StatCard label="Team Members" value={memberCount} icon={Users} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={currentTeam.members?.[task.assigneeId]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
