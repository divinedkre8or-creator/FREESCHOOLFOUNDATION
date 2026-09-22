import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { PROGRAMMES, PROGRAMME_DETAILS } from "@/lib/fsf";
import { absoluteUrl, breadcrumbSchema, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/programmes")({
  head: () =>
    seoHead({
      title: "Fully Funded OND Programmes | The Free School Foundation",
      description:
        "Explore fully funded Ordinary National Diploma (OND) options in Computer Science, Computer Engineering, Electrical Engineering, Mass Communication and Business Administration.",
      path: "/programmes",
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Programmes", path: "/programmes" },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Fully funded OND programmes",
              url: absoluteUrl("/programmes"),
              numberOfItems: PROGRAMMES.length,
              itemListElement: PROGRAMMES.map((name, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name,
                url: absoluteUrl("/programmes"),
              })),
            },
          ]),
        },
      ],
    }),
  component: ProgrammesPage,
});

function ProgrammesPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Programmes"
        title="Five programmes, fully funded"
        description="Every programme below is available at Ordinary National Diploma (OND) level under the current scholarship."
      />

      <section className="section-y">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {PROGRAMMES.map((p) => (
            <article key={p} className="rounded-2xl border border-border p-7">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-green-soft px-2.5 py-1 text-xs font-bold text-brand-green-dark">
                  OND
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold">{p}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {PROGRAMME_DETAILS[p].blurb}
              </p>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Where it can lead
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PROGRAMME_DETAILS[p].careers.map((c) => (
                  <li
                    key={c}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/apply">
                  Apply for this programme <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-brand-green-dark">
        <div className="container-page py-14 text-center">
          <h2 className="text-2xl font-extrabold text-primary-foreground md:text-3xl">
            Ready to choose your programme?
          </h2>
          <Button asChild size="lg" variant="secondary" className="mt-6 h-12 text-base">
            <Link to="/apply">Start your application</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
