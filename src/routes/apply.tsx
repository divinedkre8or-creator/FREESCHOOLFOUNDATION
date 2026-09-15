import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  LoaderCircle,
  Mail,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  NIGERIAN_STATES,
  PROGRAMMES,
  type Application,
  type Level,
  type Programme,
} from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { submitApplicationToSupabase } from "@/lib/supabase/applications";
import { sendPlatformEmail } from "@/lib/email/platform-email";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/apply")({
  head: () =>
    seoHead({
      title: "Apply for Scholarship | The Free School Foundation",
      description: "Create an account or continue your private scholarship application.",
      path: "/apply",
      noIndex: true,
    }),
  component: ApplyPage,
});

const STEPS = [
  "Personal information",
  "Programme",
  "Education",
  "Scholarship information",
  "Documents",
  "Review & submit",
];

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  stateOfResidence: string;
  stateOfOrigin: string;
  level: Level;
  programme: Programme;
  secondarySchool: string;
  examType: string;
  examYear: string;
  examNumber: string;
  ndInstitution: string;
  ndProgramme: string;
  ndGraduationYear: string;
  ndGrade: string;
  employmentStatus: string;
  occupation: string;
  reason: string;
  goals: string;
};

const initialForm: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  stateOfResidence: "Abia",
  stateOfOrigin: "Abia",
  level: "ND",
  programme: "Computer Science",
  secondarySchool: "",
  examType: "WAEC",
  examYear: "",
  examNumber: "",
  ndInstitution: "",
  ndProgramme: "",
  ndGraduationYear: "",
  ndGrade: "",
  employmentStatus: "Unemployed",
  occupation: "",
  reason: "",
  goals: "",
};

function ApplyPage() {
  const [authUser, setAuthUser] = useState<
    { id: string; email: string | undefined } | null | undefined
  >(undefined);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [declaration, setDeclaration] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { saveDraft, submitApplication } = useStore();
  const navigate = useNavigate();
  const fileName = file?.name ?? "";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const user = data.session?.user;
      setAuthUser(user ? { id: user.id, email: user.email } : null);
      if (user?.email) setForm((current) => ({ ...current, email: current.email || user.email! }));
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user;
        setAuthUser(user ? { id: user.id, email: user.email } : null);
        if (user?.email)
          setForm((current) => ({ ...current, email: current.email || user.email! }));
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const nextErrors: string[] = [];
    if (
      step === 0 &&
      (!form.firstName ||
        !form.lastName ||
        !form.dob ||
        !form.phone ||
        !form.email ||
        !form.address)
    )
      nextErrors.push("Complete all required personal information.");
    if (step === 2 && form.level === "ND" && (!form.secondarySchool || !form.examYear))
      nextErrors.push("Add your secondary school and examination year.");
    if (
      step === 2 &&
      form.level === "HND" &&
      (!form.ndInstitution || !form.ndProgramme || !form.ndGraduationYear)
    )
      nextErrors.push("Complete your ND qualification details.");
    if (step === 3 && (!form.reason || !form.goals))
      nextErrors.push("Answer both scholarship questions.");
    if (step === 5 && (!declaration || !consent))
      nextErrors.push("Accept the declaration and communication consent to submit.");
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const goNext = async () => {
    if (!validate()) return;
    saveDraft({ level: form.level, programme: form.programme });
    if (step < 5) {
      setStep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    const education =
      form.level === "ND"
        ? {
            secondarySchool: form.secondarySchool,
            examType: form.examType,
            examYear: form.examYear,
            examNumber: form.examNumber,
          }
        : {
            ndInstitution: form.ndInstitution,
            ndProgramme: form.ndProgramme,
            ndGraduationYear: form.ndGraduationYear,
            ndGrade: form.ndGrade,
          };
    let persisted;
    try {
      persisted = await submitApplicationToSupabase({
        level: form.level,
        programme: form.programme,
        personal: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          dob: form.dob,
          phone: form.phone,
          email: authUser?.email ?? form.email,
          address: form.address,
          stateOfResidence: form.stateOfResidence,
          stateOfOrigin: form.stateOfOrigin,
        },
        education,
        scholarshipResponses: {
          employmentStatus: form.employmentStatus,
          occupation: form.occupation,
          reason: form.reason,
          goals: form.goals,
        },
        communicationConsent: consent,
        document: file,
      });
    } catch (error) {
      setSubmitting(false);
      setErrors([error instanceof Error ? error.message : "Submission failed. Please try again."]);
      return;
    }
    void sendPlatformEmail({
      applicationIds: [persisted.id],
      event: "submitted",
    }).catch(() => undefined);
    const now = persisted.submittedAt;
    const application: Application = {
      id: persisted.id,
      appNumber: persisted.applicationNumber,
      createdAt: now,
      submittedAt: now,
      status: "Submitted",
      campaign: "Citi Polytechnic ODeL Scholarship 2026",
      level: form.level,
      programme: form.programme,
      personal: {
        firstName: form.firstName,
        ...(form.middleName ? { middleName: form.middleName } : {}),
        lastName: form.lastName,
        dob: form.dob,
        phone: form.phone,
        email: authUser?.email ?? form.email,
        address: form.address,
        stateOfResidence: form.stateOfResidence,
        stateOfOrigin: form.stateOfOrigin,
      },
      education,
      scholarship: {
        employmentStatus: form.employmentStatus,
        ...(form.occupation ? { occupation: form.occupation } : {}),
        reason: form.reason,
        goals: form.goals,
      },
      documents: fileName
        ? [
            {
              id: crypto.randomUUID(),
              name: fileName,
              type: "Initial supporting document",
              uploadedAt: now,
              uploaded: true,
            },
          ]
        : [],
      messages: [
        {
          id: crypto.randomUUID(),
          from: "admin",
          subject: "Application received",
          body: "Thank you for applying. Your application is now with our scholarship team.",
          sentAt: now,
          channel: "Portal",
          read: false,
        },
      ],
      notes: [],
      history: [{ id: crypto.randomUUID(), status: "Submitted", at: now, by: "Applicant" }],
      consentCommunication: consent,
    };
    submitApplication(application);
    setSubmitted(application);
    setSubmitting(false);
  };

  if (authUser === undefined) return <ApplicationAccessLoading />;
  if (!authUser) return <ApplicationAccess />;

  if (submitted) {
    return <SubmissionSuccessView application={submitted} onAccessPortal={() => void navigate({ to: "/portal" })} />;
  }


  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-3">
          <Logo />
          <Link to="/" className="shrink-0 text-xs font-semibold text-brand-green-dark sm:text-sm">
            Save and exit
          </Link>
        </div>
      </header>
      <div className="container-page grid gap-8 py-7 lg:grid-cols-[250px_minmax(0,760px)] lg:justify-center lg:py-12">
        <aside className="hidden lg:block">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Your application
          </p>
          <ol className="mt-5 space-y-4">
            {STEPS.map((name, index) => (
              <li
                key={name}
                className={`flex gap-3 text-sm ${index === step ? "font-bold text-foreground" : index < step ? "text-brand-green-dark" : "text-muted-foreground"}`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${index <= step ? "border-brand-green bg-brand-green-soft" : "border-border"}`}
                >
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="pt-1">{name}</span>
              </li>
            ))}
          </ol>
        </aside>
        <main className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 md:p-8">
          <div className="flex items-start justify-between gap-3 text-xs font-semibold sm:text-sm">
            <span>Step {step + 1} of 6</span>
            <span className="text-muted-foreground">{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / 6) * 100} className="mt-3" />
          {errors.length > 0 && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
          <div className="mt-8">
            {step === 0 && <Personal form={form} update={update} />}
            {step === 1 && <Programme form={form} update={update} />}
            {step === 2 && <Education form={form} update={update} />}
            {step === 3 && <Scholarship form={form} update={update} />}
            {step === 4 && <Documents fileName={fileName} setFile={setFile} />}
            {step === 5 && (
              <Review
                form={form}
                fileName={fileName}
                declaration={declaration}
                consent={consent}
                setDeclaration={setDeclaration}
                setConsent={setConsent}
                edit={setStep}
              />
            )}
          </div>
          <div className="mt-8 border-t border-border pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full justify-center px-6 font-semibold sm:w-auto"
                disabled={step === 0 || submitting}
                onClick={() => {
                  setErrors([]);
                  setStep((value) => Math.max(0, value - 1));
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-green-dark">
                <Save className="h-3.5 w-3.5" /> Progress auto-saved
              </div>

              <Button
                size="lg"
                className={`h-12 w-full justify-center px-8 text-base font-bold sm:w-auto ${
                  step === 5
                    ? "bg-brand-green text-white shadow-md hover:bg-brand-green-dark"
                    : "bg-primary text-primary-foreground"
                }`}
                onClick={() => void goNext()}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Submitting application…
                  </span>
                ) : step === 5 ? (
                  <span className="flex items-center justify-center gap-2">
                    Submit application <ArrowRight className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const fieldClass = "h-11";
function Personal({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">Tell us about yourself</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the same details shown on your supporting documents.
      </p>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Field label="First name" required>
          <Input
            className={fieldClass}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </Field>
        <Field label="Middle name">
          <Input
            className={fieldClass}
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </Field>
        <Field label="Last name" required>
          <Input
            className={fieldClass}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </Field>
        <Field label="Date of birth" required>
          <Input
            className={fieldClass}
            type="date"
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
          />
        </Field>
        <Field label="Phone number" required>
          <Input
            className={fieldClass}
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </Field>
        <Field label="Account email" required>
          <Input
            className={fieldClass}
            type="email"
            value={form.email}
            readOnly
            aria-readonly="true"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Residential address" required>
            <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
        </div>
        <Field label="State of residence">
          <StateSelect
            value={form.stateOfResidence}
            onChange={(value) => update("stateOfResidence", value)}
          />
        </Field>
        <Field label="State of origin">
          <StateSelect
            value={form.stateOfOrigin}
            onChange={(value) => update("stateOfOrigin", value)}
          />
        </Field>
      </div>
    </>
  );
}
function Programme({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">Choose your study path</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We will only show education questions relevant to your level.
      </p>
      <div className="mt-7 grid gap-3 min-[380px]:grid-cols-2">
        {(["ND", "HND"] as Level[]).map((level) => (
          <button
            type="button"
            key={level}
            onClick={() => update("level", level)}
            className={`rounded-xl border p-5 text-left ${form.level === level ? "border-brand-green bg-brand-green-soft ring-1 ring-brand-green" : "border-border"}`}
          >
            <strong className="text-lg">{level}</strong>
            <span className="mt-1 block text-xs text-muted-foreground">
              {level === "ND" ? "Start a National Diploma" : "Continue after your ND"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <Field label="Programme">
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.programme}
            onChange={(e) => update("programme", e.target.value as Programme)}
          >
            {PROGRAMMES.map((programme) => (
              <option key={programme}>{programme}</option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}
function Education({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">
        {form.level === "ND" ? "Your secondary education" : "Your ND qualification"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add the qualification our team will verify.
      </p>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {form.level === "ND" ? (
          <>
            <div className="md:col-span-2">
              <Field label="Secondary school" required>
                <Input
                  className={fieldClass}
                  value={form.secondarySchool}
                  onChange={(e) => update("secondarySchool", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Examination type">
              <Input
                className={fieldClass}
                value={form.examType}
                onChange={(e) => update("examType", e.target.value)}
              />
            </Field>
            <Field label="Examination year" required>
              <Input
                className={fieldClass}
                inputMode="numeric"
                value={form.examYear}
                onChange={(e) => update("examYear", e.target.value)}
              />
            </Field>
            <Field label="Examination number">
              <Input
                className={fieldClass}
                value={form.examNumber}
                onChange={(e) => update("examNumber", e.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Field label="ND institution" required>
                <Input
                  className={fieldClass}
                  value={form.ndInstitution}
                  onChange={(e) => update("ndInstitution", e.target.value)}
                />
              </Field>
            </div>
            <Field label="ND programme" required>
              <Input
                className={fieldClass}
                value={form.ndProgramme}
                onChange={(e) => update("ndProgramme", e.target.value)}
              />
            </Field>
            <Field label="Graduation year" required>
              <Input
                className={fieldClass}
                value={form.ndGraduationYear}
                onChange={(e) => update("ndGraduationYear", e.target.value)}
              />
            </Field>
            <Field label="Grade">
              <Input
                className={fieldClass}
                value={form.ndGrade}
                onChange={(e) => update("ndGrade", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
    </>
  );
}
function Scholarship({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">Why this scholarship matters</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Short, honest answers are enough. You do not need to write an essay.
      </p>
      <div className="mt-7 space-y-5">
        <Field label="Employment status">
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.employmentStatus}
            onChange={(e) => update("employmentStatus", e.target.value)}
          >
            {["Unemployed", "Employed", "Self-employed", "Student"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        {form.employmentStatus !== "Unemployed" && (
          <Field label="Current occupation">
            <Input
              className={fieldClass}
              value={form.occupation}
              onChange={(e) => update("occupation", e.target.value)}
            />
          </Field>
        )}
        <Field label="Why are you applying?" required>
          <Textarea
            maxLength={500}
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
          />
          <span className="text-xs text-muted-foreground">{form.reason.length}/500 characters</span>
        </Field>
        <Field label="How will this help your education or career goals?" required>
          <Textarea
            maxLength={500}
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
          />
          <span className="text-xs text-muted-foreground">{form.goals.length}/500 characters</span>
        </Field>
      </div>
    </>
  );
}
function Documents({
  fileName,
  setFile,
}: {
  fileName: string;
  setFile: (value: File | null) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">Add your initial documents</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start with the essentials. We can request anything else through your portal.
      </p>
      <div className="mt-7 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-5 text-center sm:p-7">
        <FileCheck2 className="mx-auto h-8 w-8 text-brand-green" />
        <p className="mt-3 font-bold">O’Level or ND result</p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB</p>
        <Label className="mt-5 inline-flex cursor-pointer rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold">
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          Choose file
        </Label>
        {fileName && (
          <div className="mt-5 rounded-lg border border-border bg-background p-3 text-left text-sm">
            <strong>{fileName}</strong>
            <span className="block text-xs text-brand-green-dark">Ready to upload</span>
          </div>
        )}
      </div>
    </>
  );
}
function Review({
  form,
  fileName,
  declaration,
  consent,
  setDeclaration,
  setConsent,
  edit,
}: {
  form: FormState;
  fileName: string;
  declaration: boolean;
  consent: boolean;
  setDeclaration: (value: boolean) => void;
  setConsent: (value: boolean) => void;
  edit: (step: number) => void;
}) {
  const cards = useMemo(
    () => [
      {
        title: "Personal information",
        step: 0,
        lines: [`${form.firstName} ${form.lastName}`, form.phone, form.email],
      },
      { title: "Programme", step: 1, lines: [`${form.level} · ${form.programme}`] },
      {
        title: "Education",
        step: 2,
        lines: [form.level === "ND" ? form.secondarySchool : form.ndInstitution],
      },
      { title: "Documents", step: 4, lines: [fileName || "No initial document added"] },
    ],
    [form, fileName],
  );
  return (
    <>
      <h1 className="text-2xl font-extrabold md:text-3xl">Review before you submit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Check your information. Submission does not guarantee scholarship approval or admission.
      </p>
      <div className="mt-7 space-y-3">
        {cards.map((card) => (
          <section key={card.title} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{card.title}</h2>
              <button
                type="button"
                onClick={() => edit(card.step)}
                className="text-sm font-bold text-brand-green-dark"
              >
                Edit
              </button>
            </div>
            {card.lines.map((line) => (
              <p key={line} className="mt-1 text-sm text-muted-foreground">
                {line || "Not provided"}
              </p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={declaration}
            onCheckedChange={(value) => setDeclaration(value === true)}
          />
          <span>
            I confirm that the information provided is accurate and complete. I understand that
            submission does not guarantee admission or scholarship approval, and I accept the{" "}
            <Link to="/terms" target="_blank" className="font-bold text-brand-green-dark underline">
              Application Terms
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
          <span>
            I consent to receiving application-related communication from The Free School Foundation
            and acknowledge the{" "}
            <Link
              to="/privacy"
              target="_blank"
              className="font-bold text-brand-green-dark underline"
            >
              Privacy Notice
            </Link>
            .
          </span>
        </label>
      </div>
      <div className="mt-6 flex gap-3 rounded-lg bg-brand-green-soft p-4 text-sm text-brand-green-dark">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <p>
          Your information and documents are private and are only available to authorized
          scholarship staff.
        </p>
      </div>
    </>
  );
}
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
function StateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {NIGERIAN_STATES.map((state) => (
        <option key={state}>{state}</option>
      ))}
    </select>
  );
}

function ApplicationAccessLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-green-soft/40">
      <LoaderCircle
        className="h-7 w-7 animate-spin text-brand-green"
        aria-label="Checking access"
      />
    </div>
  );
}

function ApplicationAccess() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const createAccount = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    if (password.length < 8) {
      setError("Create a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: authError } = await getSupabaseBrowserClient().auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/apply`,
      },
    });
    setLoading(false);
    if (authError) {
      setError("We could not create your account. Please check the details and try again.");
      return;
    }
    if (!data.session) setSent(true);
  };

  return (
    <div className="min-h-screen bg-brand-green-soft/40">
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-3">
          <Logo />
          <Link to="/" className="shrink-0 text-xs font-semibold text-brand-green-dark sm:text-sm">
            Back to website
          </Link>
        </div>
      </header>
      <main className="container-page grid min-h-[calc(100vh-65px)] place-items-center py-7 sm:py-10">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lift sm:p-8">
          {sent ? (
            <>
              <Mail className="h-8 w-8 text-brand-green" />
              <h1 className="mt-5 text-2xl font-extrabold">Confirm your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
                Confirm your email, then sign in with the password you created to continue.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/login">Go to applicant login</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold uppercase tracking-wider text-brand-orange">
                Scholarship application
              </p>
              <h1 className="mt-3 text-2xl font-extrabold">Create your applicant account</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Use your email address and create a password. You will use both whenever you return
                to your application portal.
              </p>
              {error && (
                <p
                  role="alert"
                  className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <form
                className="mt-6 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createAccount();
                }}
              >
                <Field label="Email address" required>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="h-11"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Create password" required>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <span className="text-xs text-muted-foreground">At least 8 characters</span>
                </Field>
                <Field label="Confirm password" required>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" size="lg" className="h-12 w-full text-base font-bold" disabled={loading}>
                  {loading ? "Creating account…" : "Create account and continue"}
                </Button>
              </form>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                Already started an application?{" "}
                <Link to="/login" className="font-bold text-brand-green-dark hover:underline">
                  Sign in to continue
                </Link>
              </p>
              <div className="mt-5 flex gap-3 rounded-lg bg-brand-green-soft p-4 text-sm text-brand-green-dark">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                Your application is private and accessible only with your verified email and
                password.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function SubmissionSuccessView({
  application,
  onAccessPortal,
}: {
  application: Application;
  onAccessPortal: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(application.appNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const applicantName = `${application.personal.firstName} ${application.personal.lastName}`.trim();

  return (
    <div className="min-h-screen bg-brand-green-soft/40 py-8 sm:py-12">
      <div className="container-page max-w-2xl">
        {/* Top brand header */}
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-soft px-3 py-1 text-xs font-bold text-brand-green-dark">
            <Sparkles className="h-3.5 w-3.5 text-brand-orange" /> Official Reference
          </span>
        </div>

        {/* Main Reference Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
          {/* Green Top Ribbon */}
          <div className="bg-gradient-to-r from-brand-green-dark via-brand-green to-brand-green-dark p-6 text-center text-white sm:p-8">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-4 ring-white/20 backdrop-blur-sm">
              <Award className="h-7 w-7 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
              The Free School Foundation • Scholarship & Admission
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Application Submitted Successfully
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs text-emerald-100 sm:text-sm">
              Your scholarship submission has been officially registered in the Foundation admissions database.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            {/* Application Code Box */}
            <div className="rounded-xl border-2 border-dashed border-brand-orange/40 bg-brand-orange-soft/40 p-4 text-center sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                Your Official Application Number
              </p>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="font-mono text-2xl font-extrabold tracking-wider text-foreground sm:text-3xl">
                  {application.appNumber}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyCode()}
                  className="h-9 gap-1.5 border-brand-orange/40 bg-card font-semibold text-brand-orange hover:bg-brand-orange hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-brand-green" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-xs">Copy Code</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Keep this code safe. You will need it for all inquiries, status tracking, and verification.
              </p>
            </div>

            {/* Applicant Dossier Snapshot */}
            <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-secondary/20 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3.5 sm:px-4">
                <span className="font-medium text-muted-foreground">Applicant Name</span>
                <span className="font-bold text-foreground">{applicantName}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 sm:px-4">
                <span className="font-medium text-muted-foreground">Programme Applied</span>
                <span className="font-bold text-foreground">{application.programme}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 sm:px-4">
                <span className="font-medium text-muted-foreground">Award / Level</span>
                <span className="font-bold text-foreground">
                  {application.level === "ND" ? "National Diploma (ND)" : "Higher National Diploma (HND)"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 sm:px-4">
                <span className="font-medium text-muted-foreground">Education Partner</span>
                <span className="font-bold text-foreground">Citi Polytechnic ODeL Partnership</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={onAccessPortal}
                className="h-13 flex-1 bg-brand-green text-base font-bold text-white shadow-md hover:bg-brand-green-dark"
              >
                Access Your Admission Portal <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="h-13 gap-2 px-5 font-semibold text-muted-foreground hover:text-foreground"
              >
                <Printer className="h-4 w-4" /> Print Reference
              </Button>
            </div>

            {/* What to Expect Next */}
            <div className="mt-8 rounded-xl border border-border p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-brand-orange" /> Next Steps & Review Process
              </h2>
              <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground sm:text-sm">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span>
                    <strong>Email Confirmation:</strong> A detailed receipt has been sent to{" "}
                    <strong className="text-foreground">{application.personal.email}</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span>
                    <strong>Admissions Scrutiny:</strong> The scholarship committee will review your biodata, qualification, and motivation.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span>
                    <strong>Live Updates:</strong> Check your <strong>Admission Portal</strong> anytime for shortlist notices, document requests, and enrolment announcements.
                  </span>
                </li>
              </ul>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-brand-green-dark" />
              <span>Verified & Protected • The Free School Foundation Official Gateway</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

