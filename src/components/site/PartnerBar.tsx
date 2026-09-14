import { GraduationCap, Handshake } from "lucide-react";
import logo from "@/assets/fsf-logo.png.asset.json";

export function PartnerBar({ className }: { className?: string }) {
  return (
    <div
      className={
        "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 " +
        (className ?? "")
      }
    >
      <img
        src={logo.url}
        alt="The Free School Foundation"
        className="h-10 w-10 rounded-md object-cover"
      />
      <div className="min-w-0 text-sm">
        <p className="font-bold">The Free School Foundation</p>
        <p className="text-muted-foreground">Scholarship funder</p>
      </div>
      <Handshake className="mx-1 h-5 w-5 shrink-0 text-brand-orange" />
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-green text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-bold">Citi Polytechnic Abuja</p>
          <p className="text-muted-foreground">Open Distance e-Learning partner</p>
        </div>
      </div>
    </div>
  );
}
