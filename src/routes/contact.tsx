import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT } from "@/lib/fsf";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact The Free School Foundation | Aba, Abia State" },
      {
        name: "description",
        content:
          "Reach the Foundation office at 26 Crystal Park Road, Off Port Harcourt Road, Aba. Call or WhatsApp +234 812 685 9803.",
      },
      { property: "og:title", content: "Contact The Free School Foundation" },
      {
        property: "og:description",
        content: "Office address, phone and WhatsApp details for scholarship enquiries.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Foundation"
        description="We answer questions about the scholarship, the application process and the programmes. There is never a fee to speak with us."
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {[
              {
                icon: MapPin,
                title: "Foundation office",
                body: CONTACT.address,
              },
              {
                icon: Phone,
                title: "Phone / WhatsApp",
                body: CONTACT.phone,
                href: `tel:${CONTACT.phoneHref}`,
              },
              {
                icon: Mail,
                title: "Website",
                body: CONTACT.website,
              },
              {
                icon: Clock,
                title: "Opening hours",
                body: "Monday to Friday, 9:00am – 4:00pm",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 rounded-2xl border border-border p-6">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <div className="min-w-0">
                  <h2 className="font-bold">{item.title}</h2>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="mt-1 block text-sm font-semibold text-brand-green-dark"
                    >
                      {item.body}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-border bg-brand-green-soft/60 p-6">
              <h2 className="font-bold">Ready to apply instead?</h2>
              <Button asChild className="mt-4">
                <Link to="/apply">Apply for scholarship</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-7">
            <h2 className="text-xl font-bold">Send us a message</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We usually respond within two working days.
            </p>
            {sent ? (
              <div className="mt-6 rounded-xl border border-brand-green/40 bg-brand-green-soft p-6">
                <p className="font-bold text-brand-green-dark">Message sent</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you for reaching out. Our team will get back to you shortly.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSending(true);
                  setTimeout(() => {
                    setSending(false);
                    setSent(true);
                    toast.success("Message sent to the Foundation office");
                  }, 700);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" required maxLength={100} className="h-11" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      maxLength={20}
                      className="h-11"
                      placeholder="080..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input id="email" type="email" maxLength={255} className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" required maxLength={1000} rows={5} />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={sending}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {sending ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
