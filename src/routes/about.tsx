import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Target, Users } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { PartnerBar } from "@/components/site/PartnerBar";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/fsf";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — The Free School Foundation" },
      {
        name: "description",
        content:
          "The Free School Foundation funds education for people in Nigeria who have the drive but not the means. Based in Aba, Abia State.",
      },
      { property: "og:title", content: "About The Free School Foundation" },
      {
        property: "og:description",
        content:
          "An education foundation in Aba funding fully paid diploma places in partnership with recognised institutions.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title="Education should never stop because of money"
        description="The Free School Foundation is an education foundation based in Aba, Abia State, funding diploma places for Nigerians who are ready to learn."
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5 leading-relaxed text-muted-foreground">
            <p>
              Across Nigeria, thousands of capable people leave school early or never
              continue after secondary school — not because they lack ability, but
              because the fees are out of reach. The Free School Foundation exists to
              remove that barrier.
            </p>
            <p>
              We fund full scholarships in partnership with recognised institutions, so
              that every place we fund leads to a qualification that employers and
              further-study programmes accept. Applicants never pay us a fee — not to
              apply, not to be shortlisted, not to enrol.
            </p>
            <p>
              Our work is deliberately practical. We choose programmes with clear career
              value, study formats that fit around work and family, and an application
              process that can be completed on an inexpensive phone using mobile data.
            </p>
            <p>
              The Foundation is run from our office in Aba, where applicants are welcome
              to visit us in person with questions about the scholarship.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Target,
                title: "Our mission",
                body: "Fund education for people who have the drive but not the means, and make applying genuinely easy.",
              },
              {
                icon: Users,
                title: "Who we serve",
                body: "School leavers, working adults and anyone whose education was interrupted by cost.",
              },
              {
                icon: HeartHandshake,
                title: "How we work",
                body: "Through partnerships with accredited institutions, starting with Citi Polytechnic Abuja.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border p-6">
                <item.icon className="h-6 w-6 text-brand-green" />
                <h2 className="mt-3 font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40 section-y">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Our partnership with Citi Polytechnic
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The Foundation funds the scholarship. Citi Polytechnic Abuja delivers the
            academic programme through its Open Distance e-Learning Programme, so
            students can study from Aba without relocating.
          </p>
          <PartnerBar className="mt-8 max-w-2xl" />
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-7">
            <h2 className="text-lg font-bold">Foundation office</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{CONTACT.address}</p>
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="mt-3 block font-bold text-brand-green-dark"
            >
              {CONTACT.phone}
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-brand-green-soft/60 p-7">
            <h2 className="text-lg font-bold">Applications are open</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The Citi Polytechnic ODeL scholarship is accepting applications now.
            </p>
            <Button asChild className="mt-5">
              <Link to="/apply">Apply for scholarship</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
