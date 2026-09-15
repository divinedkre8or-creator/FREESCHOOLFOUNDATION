import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Notice | The Free School Foundation" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Your information"
        title="Privacy notice"
        description="How The Free School Foundation handles information submitted through the scholarship portal."
      />
      <article className="container-page max-w-3xl py-10 text-sm leading-7 md:py-14">
        <p className="rounded-xl bg-brand-orange-soft p-4 font-semibold text-brand-orange">
          Draft for Foundation approval before public launch · Last updated 15 September 2026
        </p>
        <LegalSection title="Who controls your information">
          <p>
            The Free School Foundation is responsible for scholarship applicant information. Our
            office is at 26 Crystal Park Road, Off Port Harcourt Road, Aba, Abia State. Privacy
            requests may be sent to{" "}
            <a
              className="font-bold text-brand-green-dark"
              href="mailto:officialnwachukwudivine@gmail.com"
            >
              officialnwachukwudivine@gmail.com
            </a>{" "}
            or made by calling +234 812 685 9803.
          </p>
        </LegalSection>
        <LegalSection title="Information we collect">
          <p>
            We collect account email, name, date of birth, phone number, address, state, education
            history, programme choices, scholarship answers, uploaded documents, consent records,
            application decisions, staff messages, and technical session/security information.
          </p>
        </LegalSection>
        <LegalSection title="Why we use it">
          <p>
            We use this information to create and secure your account, receive and assess your
            application, verify eligibility and documents, communicate decisions and required
            actions, administer awards and enrolment, prevent abuse, and keep an accountable record
            of the scholarship process. We rely on your request for scholarship services, consent
            where requested, legitimate operational and security interests, and applicable legal
            obligations.
          </p>
        </LegalSection>
        <LegalSection title="Who may receive it">
          <p>
            Access is limited to authorized Foundation staff and, where necessary for selection or
            enrolment, Citi Polytechnic Abuja. Supabase provides authentication, database and
            private-file storage; Resend delivers account emails; our hosting and approved security
            providers process only what is needed to operate and protect the service. We do not sell
            applicant information.
          </p>
        </LegalSection>
        <LegalSection title="Storage, security and retention">
          <p>
            Records are access-controlled and uploaded documents are quarantined until security
            checks complete. We retain information only for as long as needed for application,
            scholarship administration, fraud prevention, reporting, dispute handling and legal
            obligations. The Foundation must approve and publish its detailed retention schedule
            before launch. Service providers may process information outside Nigeria under
            contractual and legal safeguards.
          </p>
        </LegalSection>
        <LegalSection title="Your choices and rights">
          <p>
            You may ask to access, correct, restrict, object to, export or erase eligible personal
            information, and may withdraw consent where consent is the basis. Some records may need
            to be retained for legal or accountability reasons. Contact us first for remediation;
            you may also complain to the Nigeria Data Protection Commission.
          </p>
        </LegalSection>
        <LegalSection title="Applicants under 18">
          <p>
            An applicant under 18 should contact the Foundation before submitting so we can confirm
            eligibility and any parent or guardian authorization required.
          </p>
        </LegalSection>
        <p className="mt-10 border-t border-border pt-6">
          Also read the{" "}
          <Link to="/terms" className="font-bold text-brand-green-dark">
            Scholarship Portal Terms
          </Link>
          .
        </p>
      </article>
    </SiteLayout>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}
