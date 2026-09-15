import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/fsf";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/campaigns")({ component: CampaignsPage });
function CampaignsPage() {
  const { campaigns } = useStore();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-orange">Scholarship management</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Campaigns</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage current and future Foundation opportunities.
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <GraduationCap className="h-6 w-6 text-brand-green" />
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${campaign.status === "Active" ? "bg-brand-green-soft text-brand-green-dark" : "bg-secondary text-muted-foreground"}`}
              >
                {campaign.status}
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold">{campaign.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Partner: {campaign.partner}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {campaign.description}
            </p>
            <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 sm:gap-4">
              <span className="flex gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {formatDate(campaign.opensOn)} — {formatDate(campaign.deadline)}
              </span>
              <span className="text-sm font-bold sm:text-right">
                {campaign.applicants} applicants
              </span>
            </div>
            <Button variant="outline" className="mt-5 w-full">
              Manage campaign
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
