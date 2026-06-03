import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Team } from "@/lib/types";

interface TeamContextValue {
  teams: Team[];
  currentTeam: Team | null;
  currentTeamId: string | null;
  setCurrentTeamId: (id: string | null) => void;
  loading: boolean;
  isMember: boolean;
}

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  currentTeam: null,
  currentTeamId: null,
  setCurrentTeamId: () => {},
  loading: true,
  isMember: false,
});

const LS_KEY = "currentTeamId";

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamIdState] = useState<string | null>(
    () => localStorage.getItem(LS_KEY)
  );

  // Mirror user profile so others can look them up by email for invites
  useEffect(() => {
    if (!user) return;
    setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        emailLower: (user.email || "").toLowerCase(),
        displayName: user.displayName || (user.email || "").split("@")[0],
      },
      { merge: true }
    ).catch(() => {});
  }, [user]);

  // Subscribe to teams where user is a member
  useEffect(() => {
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "teams"),
      where("memberIds", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Team[];
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setTeams(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const setCurrentTeamId = (id: string | null) => {
    setCurrentTeamIdState(id);
    if (id) localStorage.setItem(LS_KEY, id);
    else localStorage.removeItem(LS_KEY);
  };

  // Auto-select first team if none selected or current invalid
  useEffect(() => {
    if (loading) return;
    const valid = teams.find((t) => t.id === currentTeamId);
    if (!valid && teams.length > 0) {
      setCurrentTeamId(teams[0].id);
    } else if (teams.length === 0 && currentTeamId) {
      setCurrentTeamId(null);
    }
  }, [teams, loading, currentTeamId]);

  const currentTeam = useMemo(
    () => teams.find((t) => t.id === currentTeamId) || null,
    [teams, currentTeamId]
  );

  const isMember = !!(currentTeam && user && currentTeam.memberIds.includes(user.uid));

  return (
    <TeamContext.Provider
      value={{ teams, currentTeam, currentTeamId, setCurrentTeamId, loading, isMember }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);
