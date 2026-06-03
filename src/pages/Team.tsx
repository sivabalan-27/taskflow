import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { Invite, initialsFromName } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Plus, Crown, UserPlus, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Team() {
  const { user } = useAuth();
  const { teams, currentTeam, setCurrentTeamId, isMember } = useTeam();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // My pending invites (by email)
  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, "invites"),
      where("emailLower", "==", user.email.toLowerCase()),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvites(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Invite[]
      );
    });
    return unsub;
  }, [user]);

  const handleCreateTeam = async () => {
    if (!user || !teamName.trim()) return;
    const displayName = user.displayName || (user.email || "").split("@")[0];
    try {
      const ref = await addDoc(collection(db, "teams"), {
        name: teamName.trim(),
        ownerId: user.uid,
        memberIds: [user.uid],
        members: {
          [user.uid]: {
            email: user.email,
            displayName,
            role: "owner",
          },
        },
        createdAt: Date.now(),
      });
      setTeamName("");
      setCreateOpen(false);
      setCurrentTeamId(ref.id);
      toast({ title: "Team created" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!user || !currentTeam || !inviteEmail.trim()) return;
    const emailLower = inviteEmail.trim().toLowerCase();
    if (Object.values(currentTeam.members || {}).some((m) => m.email?.toLowerCase() === emailLower)) {
      toast({ title: "Already a member", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      await addDoc(collection(db, "invites"), {
        teamId: currentTeam.id,
        teamName: currentTeam.name,
        emailLower,
        invitedBy: user.uid,
        invitedByName: user.displayName || user.email,
        status: "pending",
        createdAt: Date.now(),
      });
      setInviteEmail("");
      toast({ title: "Invite sent", description: emailLower });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const acceptInvite = async (inv: Invite) => {
    if (!user) return;
    try {
      const displayName = user.displayName || (user.email || "").split("@")[0];
      await updateDoc(doc(db, "teams", inv.teamId), {
        memberIds: arrayUnion(user.uid),
        [`members.${user.uid}`]: {
          email: user.email,
          displayName,
          role: "member",
        },
      });
      await updateDoc(doc(db, "invites", inv.id), { status: "accepted" });
      setCurrentTeamId(inv.teamId);
      toast({ title: `Joined ${inv.teamName}` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const declineInvite = async (inv: Invite) => {
    try {
      await updateDoc(doc(db, "invites", inv.id), { status: "declined" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const isOwner = !!(currentTeam && user && currentTeam.ownerId === user.uid);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {teams.length} team{teams.length === 1 ? "" : "s"}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1.5" /> New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a team</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Label>Team name</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Acme Engineering"
              />
              <Button onClick={handleCreateTeam} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invites
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium text-card-foreground">{inv.teamName}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {inv.invitedByName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptInvite(inv)}>
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => declineInvite(inv)}>
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {teams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Switch team
          </h2>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={t.id === currentTeam?.id ? "default" : "outline"}
                onClick={() => setCurrentTeamId(t.id)}
              >
                {t.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      {currentTeam && isMember && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{currentTeam.name} — Members</h2>
          </div>

          {isOwner && (
            <div className="flex gap-2 rounded-xl border border-border bg-card p-4">
              <Input
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleInvite} disabled={inviting}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(currentTeam.members || {}).map(([uid, m]) => (
              <div
                key={uid}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-sm">
                    {initialsFromName(m.displayName, m.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-card-foreground truncate">
                        {m.displayName}
                      </h3>
                      {m.role === "owner" && (
                        <Crown className="h-3.5 w-3.5 text-warning" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{m.email}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {teams.length === 0 && invites.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>You aren't on any team yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
