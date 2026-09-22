import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CONTACT, PROGRAMMES, PROGRAMME_DETAILS } from "@/lib/fsf";
import { ELIGIBILITY, FAQS, STEPS_HOW_IT_WORKS } from "@/lib/content";
import heroImage from "@/assets/hero-student.jpg";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seoHead({
      title: "100% Free OND Scholarship | The Free School Foundation",
      description:
        "Apply for a 100% funded Ordinary National Diploma (OND) scholarship in Nigeria. Study through the Open Distance Learning (ODL) Programme with no tuition or application fee.",
      path: "/",
    }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-brand-green-soft/50">
        <div className="container-page grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-orange">
              <BadgeCheck className="h-4 w-4" /> Applications open
            </span>
            <h1 className="mt-5 text-3xl leading-[1.05] font-extrabold min-[380px]:text-4xl md:text-6xl">
              Get your OND
              <span className="mt-1 block text-brand-orange">100% free</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Study from Aba through the Open Distance Learning (ODL) Programme, fully funded by The
              Free School Foundation. No tuition fees, no application fees.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 text-base">
                <Link to="/apply">
                  Apply for scholarship <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 text-base">
                <Link to="/scholarship">Learn more</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              width={1200}
              height={1408}
              alt="A Nigerian student holding a laptop, ready to start her diploma programme"
              className="aspect-4/5 w-full rounded-2xl object-cover shadow-lift"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-card/95 p-4 backdrop-blur">
              <p className="text-sm font-bold">No tuition fees</p>
              <p className="text-xs text-muted-foreground">
                Full scholarship covering your OND programme
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scholarship overview */}
      <section className="section-y">
        <div className="container-page">
          <h2 className="max-w-2xl text-2xl font-extrabold md:text-4xl">
            A fully funded route back to education
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The Free School Foundation pays your tuition so that money is never the reason you stop
            learning. Study through a structured Open Distance Learning programme with physical
            orientation and Foundation guidance in Aba.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Wallet,
                title: "100% full scholarship",
                body: "Your tuition for the full OND programme is covered by the Foundation.",
              },
              {
                icon: ClipboardList,
                title: "Simple application",
                body: "A short online form you can pause and finish later from your phone.",
              },
              {
                icon: MapPin,
                title: "Study from Aba",
                body: "Attend through Open Distance Learning (ODL) with physical orientation and dedicated local support in Aba.",
              },
              {
                icon: ShieldCheck,
                title: "Recognised diploma",
                body: "Accredited Ordinary National Diploma (OND) awards through approved programmes.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border p-5 sm:p-6">
                <item.icon className="h-6 w-6 text-brand-green" />
                <h3 className="mt-4 text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="border-y border-border bg-secondary/40 section-y">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold md:text-4xl">Available programmes</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Five programmes, available at Ordinary National Diploma (OND) level.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/programmes">See programme details</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMMES.map((p) => (
              <Link
                key={p}
                to="/programmes"
                className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-green"
              >
                <h3 className="text-base font-bold">{p}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {PROGRAMME_DETAILS[p].blurb}
                </p>
                <p className="mt-4 text-xs font-semibold text-brand-green-dark">
                  OND available
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold md:text-4xl">How the scholarship works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-5">
            {STEPS_HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="border-t-2 border-brand-yellow pt-4">
                <span className="text-xs font-bold text-brand-orange">STEP {i + 1}</span>
                <h3 className="mt-1 text-base font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-y border-border bg-brand-green-soft/40 section-y">
        <div className="container-page max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-extrabold md:text-2xl">
              Ordinary National Diploma (OND) Eligibility
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For applicants with O'Level results who are starting their polytechnic education.
            </p>
            <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-orange">
              Who can apply
            </h3>
            <ul className="mt-3 space-y-3">
              {ELIGIBILITY.ND.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-7 w-full sm:w-auto">
              <Link to="/apply">Apply for scholarship</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold md:text-4xl">
              About The Free School Foundation
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The Free School Foundation is an education-focused foundation based in Aba, Abia
              State. We fund education for people who have the ability and the drive but not the
              means — school leavers, working adults and anyone whose education was interrupted by
              cost.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We work directly with recognised institutions so that every place we fund leads to a
              real, accredited qualification. Our Open Distance Learning (ODL) scholarship covers
              100% of tuition for eligible OND candidates.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/about">Read more about us</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green-soft text-brand-green-dark">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Academic Model</h3>
                <p className="text-xs text-muted-foreground">Open Distance Learning (ODL)</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The Foundation funds the entire scholarship tuition. Academic delivery is conducted
              through structured Open Distance Learning with physical orientation and local academic
              support in Aba.
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Funder", "The Free School Foundation"],
                ["Study mode", "Open Distance Learning (ODL)"],
                ["Study location", "Aba, Abia State"],
                ["Tuition coverage", "100% Fully Funded"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-border bg-secondary/40 section-y">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-extrabold md:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQS.slice(0, 6).map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/faqs">See all questions</Link>
          </Button>
        </div>
      </section>

      {/* Office + contact */}
      <section className="section-y">
        <div className="container-page grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-5 sm:p-7">
            <MapPin className="h-6 w-6 text-brand-green" />
            <h2 className="mt-4 text-xl font-bold">Visit our office</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{CONTACT.address}</p>
            <p className="mt-3 text-sm text-muted-foreground">Monday to Friday, 9:00am – 4:00pm</p>
          </div>
          <div className="rounded-2xl border border-border p-5 sm:p-7">
            <Phone className="h-6 w-6 text-brand-orange" />
            <h2 className="mt-4 text-xl font-bold">Talk to us</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Call or send a WhatsApp message if you have a question about the scholarship.
            </p>
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="mt-3 block text-lg font-extrabold text-brand-green-dark"
            >
              {CONTACT.phone}
            </a>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/contact">Contact page</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-green-dark">
        <div className="container-page py-16 text-center md:py-20">
          <h2 className="text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Your diploma is fully funded. The only step left is yours.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Applications for the 2026 Open Distance Learning (ODL) scholarship are open now. It
            takes about 15 minutes.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 h-12 text-base">
            <Link to="/apply">
              Apply for scholarship <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
