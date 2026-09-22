import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FAQS } from "@/lib/content";
import { CONTACT } from "@/lib/fsf";
import { breadcrumbSchema, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/faqs")({
  head: () =>
    seoHead({
      title: "OND Scholarship FAQs | The Free School Foundation",
      description:
        "Get clear answers about scholarship eligibility, required documents, fees, deadlines, distance learning, applications and selection decisions.",
      path: "/faqs",
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Frequently Asked Questions", path: "/faqs" },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]),
        },
      ],
    }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="FAQs"
        title="Questions applicants ask us most"
        description="If your question is not answered here, call or send a WhatsApp message to the Foundation office."
      />
      <section className="section-y">
        <div className="container-page max-w-3xl">
          <Accordion type="single" collapsible>
            {FAQS.map((faq) => (
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

          <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-7">
            <h2 className="text-lg font-bold">Still not sure?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Call or WhatsApp {CONTACT.phone}, or visit the Foundation office in Aba.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/apply">Apply for scholarship</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
