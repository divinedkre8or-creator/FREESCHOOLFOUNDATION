import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { breadcrumbSchema, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seoHead({
      title: "Scholarship Application Terms | The Free School Foundation",
      description:
        "Read the conditions for creating an account and submitting an application to The Free School Foundation scholarship portal.",
      path: "/terms",
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Application Terms", path: "/terms" },
            ]),
          ),
        },
      ],
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Scholarship portal"
        title="Application terms"
        description="Important conditions for creating an account and submitting a scholarship application."
      />
      <article className="container-page max-w-3xl py-10 text-sm leading-7 md:py-14">
        <p className="rounded-xl bg-brand-green-soft p-4 font-semibold text-brand-green-dark">
          Official Application Terms · Effective 15 September 2026
        </p>
        <Term title="Applying is free">
          The Free School Foundation does not charge an application fee. Do not pay anyone to submit
          or influence an application. Report payment requests to the Foundation immediately.
        </Term>
        <Term title="Account responsibility">
          Use your own accessible email, create a strong password, keep it private, and provide a
          working phone number. You are responsible for activity performed through your account.
        </Term>
        <Term title="Accurate information">
          Information and documents must be truthful, complete and belong to you. The Foundation may
          verify submissions and may disqualify an application containing material falsehoods,
          impersonation, altered documents or duplicate submissions.
        </Term>
        <Term title="Eligibility and deadlines">
          Published campaign requirements, available programmes, qualification levels and closing
          time apply. Starting or saving a form does not reserve a scholarship place. A submission
          is complete only when the portal issues an application number.
        </Term>
        <Term title="Selection">
          Submission does not guarantee shortlisting, admission, scholarship approval or enrolment.
          Decisions depend on eligibility, verification, available places and the Foundation's
          documented review process. Portal status and official Foundation messages are
          authoritative.
        </Term>
        <Term title="Documents and security">
          Upload only requested PDF, JPG or PNG files. Unsafe, invalid, encrypted or malicious files
          may be rejected or removed. Access to applicant documents is restricted to authorized use.
        </Term>
        <Term title="Communications">
          Necessary account, security and application-service messages may be sent by email or shown
          in the portal. Any optional promotional communication requires separate permission.
        </Term>
        <Term title="Changes and support">
          The Foundation may correct or update these terms and will state the effective date.
          Material changes affecting an active application will be communicated where appropriate.
          Contact +234 812 685 9803 or info@thefreeschoolfoundation.com.ng for support.
        </Term>
        <p className="mt-10 border-t border-border pt-6">
          How we handle information is explained in the{" "}
          <Link to="/privacy" className="font-bold text-brand-green-dark">
            Privacy Notice
          </Link>
          .
        </p>
      </article>
    </SiteLayout>
  );
}

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </section>
  );
}
