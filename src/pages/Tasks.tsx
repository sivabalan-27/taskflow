import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Users as UsersIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statuses: TaskStatus[] = ["todo", "in-progress", "review", "done"];
const statusLabels: Record<TaskStatus, string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "review": "Review",
  "done": "Done",
};

export default function Tasks() {
  const { user } = useAuth();
  const { currentTeam, isMember } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "medium" as Task["priority"],
    deadline: "",
  });

  // Subscribe only to tasks for current team; non-members see nothing.
  useEffect(() => {
    if (!currentTeam || !isMember) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, "tasks"), where("teamId", "==", currentTeam.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Task[];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTasks(list);
    });
    return unsub;
  }, [currentTeam, isMember]);

  if (!currentTeam) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-3">
        <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">No team selected</h2>
        <p className="text-muted-foreground text-sm">
          Create a team or accept an invite to start managing tasks.
        </p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-muted-foreground">
          You are not a member of this team. Tasks are private to team members.
        </p>
      </div>
    );
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const memberOptions = Object.entries(currentTeam.members || {});

  const handleCreate = async () => {
    if (!user || !currentTeam) return;
    if (!newTask.title || !newTask.assigneeId) {
      toast({ title: "Title and assignee are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, "tasks"), {
        teamId: currentTeam.id,
        title: newTask.title,
        description: newTask.description,
        status: "todo" as TaskStatus,
        priority: newTask.priority,
        assigneeId: newTask.assigneeId,
        deadline: newTask.deadline,
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      setNewTask({ title: "", description: "", assigneeId: "", priority: "medium", deadline: "" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Failed to create task", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tasks · <span className="text-accent">{currentTeam.name}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} tasks total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1.5" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the task..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign To</Label>
                  <Select
                    value={newTask.assigneeId}
                    onValueChange={(v) => setNewTask((p) => ({ ...p, assigneeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberOptions.map(([uid, info]) => (
                        <SelectItem key={uid} value={uid}>
                          {info.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) =>
                      setNewTask((p) => ({ ...p, priority: v as Task["priority"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {creating ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        {statuses.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {statusLabels[s]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assignee={currentTeam.members?.[task.assigneeId]}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No tasks yet</p>
      )}
    </div>
  );
}
