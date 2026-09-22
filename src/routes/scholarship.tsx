import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { PartnerBar } from "@/components/site/PartnerBar";
import { Button } from "@/components/ui/button";
import { ELIGIBILITY, STEPS_HOW_IT_WORKS } from "@/lib/content";
import { PROGRAMMES } from "@/lib/fsf";
import { breadcrumbSchema, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/scholarship")({
  head: () =>
    seoHead({
      title: "100% Funded OND Scholarship | The Free School Foundation",
      description:
        "Learn what the Open Distance Learning (ODL) scholarship covers, who can apply, the required documents, available OND programmes, and how to apply online.",
      path: "/scholarship",
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Scholarship", path: "/scholarship" },
            ]),
          ),
        },
      ],
    }),
  component: ScholarshipPage,
});

function ScholarshipPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Current scholarship"
        title="Open Distance Learning (ODL) Scholarship"
        description="A 100% full scholarship covering tuition for Ordinary National Diploma (OND) programmes, funded by The Free School Foundation with accredited partner Citi Polytechnic Abuja."
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-2xl font-extrabold">What the scholarship covers</h2>
            <ul className="mt-5 space-y-3">
              {[
                "100% of tuition for the full OND programme",
                "No application fee at any stage",
                "Access to Open Distance Learning (ODL) study materials and faculty support",
                "Structured physical orientation and support from the Foundation office in Aba",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-12 text-2xl font-extrabold">How it works</h2>
            <ol className="mt-5 space-y-5">
              {STEPS_HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-green-soft text-sm font-bold text-brand-green-dark">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="mt-12 text-2xl font-extrabold">Who can apply</h2>
            <div className="mt-5">
              <div className="rounded-2xl border border-border p-6">
                <h3 className="font-bold">Ordinary National Diploma (OND) applicants</h3>
                <ul className="mt-3 space-y-2.5">
                  {ELIGIBILITY.ND.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <h2 className="mt-12 text-2xl font-extrabold">Documents to prepare</h2>
            <p className="mt-3 text-muted-foreground">
              You only need a few things to apply. Extra documents are requested later, and only if
              you are shortlisted.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "O'Level result (WAEC, NECO, or NABTEB)",
                "Passport photograph",
                "A phone number you use regularly",
                "Valid email address",
              ].map((d) => (
                <div
                  key={d}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand-orange" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-secondary/40 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                Scholarship summary
              </p>
              <p className="mt-3 text-3xl font-extrabold">100% free</p>
              <p className="text-sm text-muted-foreground">No tuition fees</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Level</dt>
                  <dd className="font-semibold">Ordinary National Diploma (OND)</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Programmes</dt>
                  <dd className="font-semibold">{PROGRAMMES.length} available</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Study mode</dt>
                  <dd className="font-semibold">Open Distance Learning (ODL)</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Application deadline</dt>
                  <dd className="font-semibold">30 November 2026</dd>
                </div>
              </dl>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link to="/apply">Apply for scholarship</Link>
              </Button>
            </div>
            <PartnerBar className="mt-4" />
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
