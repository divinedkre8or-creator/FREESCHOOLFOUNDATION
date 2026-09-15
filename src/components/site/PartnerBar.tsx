import { Handshake } from "lucide-react";
import citiLogo from "../../../citilogo.jpg";

export function PartnerBar({ className }: { className?: string }) {
  return (
    <div
      className={
        "grid gap-3 rounded-xl border border-border bg-card p-3 min-[520px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[520px]:items-center " +
        (className ?? "")
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/favicon.png"
          alt="The Free School Foundation logo"
          width="64"
          height="64"
          className="h-12 w-12 shrink-0 object-contain"
        />
        <div className="min-w-0 text-sm">
          <p className="font-bold">The Free School Foundation</p>
          <p className="text-muted-foreground">Scholarship funder</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-orange min-[520px]:justify-center">
        <span className="h-px flex-1 bg-border min-[520px]:hidden" />
        <Handshake className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-[520px]:sr-only">In partnership with</span>
        <span className="h-px flex-1 bg-border min-[520px]:hidden" />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={citiLogo}
          alt="Citi Polytechnic Abuja logo"
          width="199"
          height="200"
          className="h-12 w-12 shrink-0 rounded-md object-contain"
        />
        <div className="min-w-0 text-sm">
          <p className="font-bold">Citi Polytechnic Abuja</p>
          <p className="text-muted-foreground">Open Distance Learning (ODL) partner</p>
        </div>
      </div>
    </div>
  );
}
