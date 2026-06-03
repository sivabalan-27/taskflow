import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 flex flex-col gap-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-card-foreground">{value}</span>
        {trend && <span className="text-xs font-medium text-success mb-1">{trend}</span>}
      </div>
    </div>
  );
}
