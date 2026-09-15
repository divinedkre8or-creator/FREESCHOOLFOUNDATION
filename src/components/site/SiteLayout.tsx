import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/fsf";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/scholarship", label: "Scholarship" },
  { to: "/programmes", label: "Programmes" },
  { to: "/about", label: "About" },
  { to: "/faqs", label: "FAQs" },
  { to: "/contact", label: "Contact" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container-page grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5 sm:gap-3">
        <Logo />
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 pl-2 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Applicant login</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/apply">Apply for scholarship</Link>
            </Button>
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2">
              <Button asChild size="lg">
                <Link to="/apply" onClick={() => setOpen(false)}>
                  Apply for scholarship
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login" onClick={() => setOpen(false)}>
                  Applicant login
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container-page grid gap-9 py-12 sm:grid-cols-2 md:grid-cols-4 md:py-14">
        <div className="sm:col-span-2 md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The Free School Foundation opens doors to education for people who have the drive but
            not the funds. Our scholarships are fully funded — never pay to apply.
          </p>
          <a
            href={`tel:${CONTACT.phoneHref}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-green-dark"
          >
            <Phone className="h-4 w-4" /> {CONTACT.phone}
          </a>
        </div>
        <div>
          <h3 className="text-sm font-bold">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold">Scholarship</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/apply" className="hover:text-foreground">
                Apply now
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground">
                Applicant login
              </Link>
            </li>
          </ul>
          <h3 className="mt-6 text-sm font-bold">Office</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{CONTACT.address}</p>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} The Free School Foundation. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span>{CONTACT.website}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-border bg-brand-green-soft/60">
      <div className="container-page py-14 md:py-20">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-orange">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-extrabold sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
