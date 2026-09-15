// Domain model, constants and demo data for The Free School Foundation
// scholarship portal. This layer is intentionally UI-only (in-memory +
// localStorage) so a real database and auth can replace it later.

export type Level = "ND" | "HND";

export const PROGRAMMES = [
  "Mass Communication",
  "Business Administration and Management",
  "Computer Science",
  "Electrical Engineering",
  "Computer Engineering",
] as const;

export type Programme = (typeof PROGRAMMES)[number];

export const PROGRAMME_DETAILS: Record<Programme, { blurb: string; careers: string[] }> = {
  "Mass Communication": {
    blurb:
      "Reporting, broadcasting, public relations and digital media for Nigeria's fast-growing media industry.",
    careers: ["Journalist", "PR Officer", "Content Producer", "Media Analyst"],
  },
  "Business Administration and Management": {
    blurb:
      "Management, accounting basics, entrepreneurship and operations for people building or running businesses.",
    careers: ["Operations Officer", "Entrepreneur", "Admin Manager", "Sales Lead"],
  },
  "Computer Science": {
    blurb:
      "Programming, databases, networking and problem solving for careers in software and technology.",
    careers: ["Software Developer", "Data Analyst", "IT Support", "Web Developer"],
  },
  "Electrical Engineering": {
    blurb: "Electrical installation, power systems, electronics and maintenance practice.",
    careers: ["Electrical Technician", "Power Systems Officer", "Maintenance Engineer"],
  },
  "Computer Engineering": {
    blurb: "Hardware, embedded systems, networking and computer maintenance skills.",
    careers: ["Hardware Engineer", "Network Engineer", "Systems Technician"],
  },
};

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Shortlisted"
  | "Additional Documents Required"
  | "Approved"
  | "Enrolled"
  | "Not Successful";

export const STATUSES: ApplicationStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Additional Documents Required",
  "Approved",
  "Enrolled",
  "Not Successful",
];

export const STATUS_COPY: Record<
  ApplicationStatus,
  { tone: "neutral" | "info" | "warning" | "success" | "danger"; applicant: string; next: string }
> = {
  Draft: {
    tone: "neutral",
    applicant:
      "Your application has not been submitted yet. You can continue from where you stopped at any time.",
    next: "Complete and submit your application.",
  },
  Submitted: {
    tone: "info",
    applicant:
      "We have received your application. Our scholarship team will begin reviewing it shortly.",
    next: "Nothing to do for now. We will notify you here.",
  },
  "Under Review": {
    tone: "info",
    applicant:
      "Your application has been received and is currently being reviewed by our scholarship team.",
    next: "Keep an eye on your messages in case we need anything.",
  },
  Shortlisted: {
    tone: "success",
    applicant:
      "Congratulations. You have been shortlisted. We are now verifying your details before a final decision.",
    next: "Make sure your phone number is reachable.",
  },
  "Additional Documents Required": {
    tone: "warning",
    applicant:
      "We need one or more extra documents from you before your application can move forward.",
    next: "Upload the requested documents in the Documents section.",
  },
  Approved: {
    tone: "success",
    applicant:
      "Your scholarship has been approved. We will contact you with enrolment instructions.",
    next: "Watch out for enrolment details from the Foundation.",
  },
  Enrolled: {
    tone: "success",
    applicant:
      "You are now enrolled with Citi Polytechnic under The Free School Foundation scholarship.",
    next: "Follow the orientation instructions shared with you.",
  },
  "Not Successful": {
    tone: "danger",
    applicant:
      "Your application was not successful this time. We keep your details for future scholarship opportunities.",
    next: "Look out for the next scholarship campaign.",
  },
};

export type Doc = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size?: string;
  requested?: boolean;
  uploaded: boolean;
  scanStatus?: "pending" | "clean" | "rejected" | "failed";
};

export type Message = {
  id: string;
  from: "admin" | "applicant";
  subject: string;
  body: string;
  sentAt: string;
  channel: "Portal" | "SMS";
  read: boolean;
  priority?: "normal" | "high";
};

export type Note = { id: string; author: string; body: string; createdAt: string };

export type HistoryEntry = {
  id: string;
  status: ApplicationStatus;
  at: string;
  by: string;
  comment?: string;
};

export type Application = {
  id: string;
  appNumber: string;
  createdAt: string;
  submittedAt?: string;
  status: ApplicationStatus;
  campaign: string;
  level: Level;
  programme: Programme;
  personal: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dob: string;
    phone: string;
    email: string;
    address: string;
    stateOfResidence: string;
    stateOfOrigin: string;
    photo?: string;
  };
  education: {
    // ND path
    secondarySchool?: string;
    examType?: string;
    examYear?: string;
    examNumber?: string;
    subjects?: string;
    // HND path
    ndInstitution?: string;
    ndProgramme?: string;
    ndGraduationYear?: string;
    ndGrade?: string;
  };
  scholarship: {
    employmentStatus: string;
    occupation?: string;
    reason: string;
    goals: string;
  };
  documents: Doc[];
  messages: Message[];
  notes: Note[];
  history: HistoryEntry[];
  consentCommunication: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  partner: string;
  description: string;
  programmes: string[];
  opensOn: string;
  deadline: string;
  status: "Active" | "Draft" | "Closed";
  applicants: number;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "Super Admin" | "Reviewer" | "Communications" | "Viewer";
  permissions: string[];
  active: boolean;
};

export const PERMISSIONS = [
  "Review applications",
  "Change statuses",
  "View documents",
  "Send communications",
  "Manage scholarship campaigns",
  "Manage administrators",
];

export const CONTACT = {
  org: "The Free School Foundation",
  email: "info@thefreeschoolfoundation.com.ng",
  emailHref: "mailto:info@thefreeschoolfoundation.com.ng",
  address: "26 Crystal Park Road, Off Port Harcourt Road, Aba, Abia State.",
  phone: "+234 812 685 9803",
  phoneHref: "+2348126859803",
  website: "thefreeschoolfoundation.com.ng",
  partner: "Citi Polytechnic Abuja",
};

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

// Historical fixtures are retained only as typed development references.
// Keep this compile-time flag false so no synthetic people or staff ship.
const INCLUDE_DEMO_DATA = false;

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

let counter = 1284;
export const nextAppNumber = () => `FSF-2026-${String(++counter).padStart(6, "0").slice(-6)}`;

function mk(
  partial: Partial<Application> & {
    id: string;
    first: string;
    last: string;
    level: Level;
    programme: Programme;
    status: ApplicationStatus;
    days: number;
    state: string;
  },
): Application {
  const { first, last, level, programme, status, days, state, id } = partial;
  return {
    id,
    appNumber: `FSF-2026-00${id}`,
    createdAt: iso(days + 2),
    ...(status === "Draft" ? {} : { submittedAt: iso(days) }),
    status,
    campaign: "Citi Polytechnic ODeL Scholarship 2026",
    level,
    programme,
    personal: {
      firstName: first,
      lastName: last,
      dob: "2001-04-12",
      phone: "+234 80" + (1000000 + Number(id) * 7777).toString().slice(0, 8),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      address: "12 Umuola Street, Aba",
      stateOfResidence: state,
      stateOfOrigin: state,
    },
    education:
      level === "ND"
        ? {
            secondarySchool: "Government Secondary School, Aba",
            examType: "WAEC",
            examYear: "2019",
            examNumber: "4251908" + id,
            subjects: "English C4, Mathematics B3, Economics B2, Biology C5, Civic C4",
          }
        : {
            ndInstitution: "Abia State Polytechnic",
            ndProgramme: programme,
            ndGraduationYear: "2023",
            ndGrade: "Upper Credit",
          },
    scholarship: {
      employmentStatus: Number(id) % 2 ? "Employed" : "Unemployed",
      ...(Number(id) % 2 ? { occupation: "Shop assistant" } : {}),
      reason:
        "I stopped schooling because of finances and I want to complete my education while still working.",
      goals:
        "This scholarship will let me finish my diploma, qualify for better roles and support my family.",
    },
    documents: [
      {
        id: "d1",
        name: "O'Level Result.pdf",
        type: "O'Level Result",
        uploadedAt: iso(days),
        size: "412 KB",
        uploaded: true,
      },
      {
        id: "d2",
        name: "Passport Photograph.jpg",
        type: "Passport Photograph",
        uploadedAt: iso(days),
        size: "120 KB",
        uploaded: true,
      },
    ],
    messages: [
      {
        id: "m1",
        from: "admin",
        subject: "Application received",
        body: "Thank you for applying to The Free School Foundation scholarship. Your application is now with our review team.",
        sentAt: iso(days),
        channel: "Portal",
        read: true,
      },
    ],
    notes: [],
    history: [
      { id: "h1", status: "Submitted", at: iso(days), by: "Applicant" },
      ...(status !== "Submitted" && status !== "Draft"
        ? [{ id: "h2", status, at: iso(Math.max(days - 3, 0)), by: "Grace Nwosu" }]
        : []),
    ],
    consentCommunication: true,
  };
}

export const DEMO_APPLICATIONS: Application[] = INCLUDE_DEMO_DATA
  ? [
      mk({
        id: "1284",
        first: "Chidera",
        last: "Okafor",
        level: "ND",
        programme: "Computer Science",
        status: "Under Review",
        days: 6,
        state: "Abia",
      }),
      mk({
        id: "1285",
        first: "Amina",
        last: "Bello",
        level: "HND",
        programme: "Mass Communication",
        status: "Shortlisted",
        days: 9,
        state: "Kano",
      }),
      mk({
        id: "1286",
        first: "Emeka",
        last: "Nwachukwu",
        level: "ND",
        programme: "Electrical Engineering",
        status: "Submitted",
        days: 2,
        state: "Imo",
      }),
      mk({
        id: "1287",
        first: "Blessing",
        last: "Adeyemi",
        level: "HND",
        programme: "Business Administration and Management",
        status: "Approved",
        days: 14,
        state: "Lagos",
      }),
      mk({
        id: "1288",
        first: "Samuel",
        last: "Ikenna",
        level: "ND",
        programme: "Computer Engineering",
        status: "Additional Documents Required",
        days: 5,
        state: "Abia",
      }),
      mk({
        id: "1289",
        first: "Halima",
        last: "Yusuf",
        level: "ND",
        programme: "Business Administration and Management",
        status: "Enrolled",
        days: 21,
        state: "Kaduna",
      }),
      mk({
        id: "1290",
        first: "Peter",
        last: "Etim",
        level: "HND",
        programme: "Computer Science",
        status: "Not Successful",
        days: 18,
        state: "Akwa Ibom",
      }),
      mk({
        id: "1291",
        first: "Ngozi",
        last: "Uche",
        level: "ND",
        programme: "Mass Communication",
        status: "Draft",
        days: 1,
        state: "Enugu",
      }),
      mk({
        id: "1292",
        first: "Tunde",
        last: "Balogun",
        level: "ND",
        programme: "Computer Science",
        status: "Under Review",
        days: 4,
        state: "Oyo",
      }),
      mk({
        id: "1293",
        first: "Rita",
        last: "Obi",
        level: "HND",
        programme: "Electrical Engineering",
        status: "Submitted",
        days: 3,
        state: "Anambra",
      }),
      mk({
        id: "1294",
        first: "Joshua",
        last: "Effiong",
        level: "ND",
        programme: "Computer Engineering",
        status: "Shortlisted",
        days: 8,
        state: "Cross River",
      }),
      mk({
        id: "1295",
        first: "Mary",
        last: "Danjuma",
        level: "ND",
        programme: "Business Administration and Management",
        status: "Under Review",
        days: 7,
        state: "Plateau",
      }),
    ]
  : [];

if (INCLUDE_DEMO_DATA) {
  DEMO_APPLICATIONS[4]!.documents.push({
    id: "d3",
    name: "Birth Certificate",
    type: "Birth Certificate",
    uploadedAt: "",
    requested: true,
    uploaded: false,
  });
}

export const DEMO_ANNOUNCEMENTS: Announcement[] = INCLUDE_DEMO_DATA
  ? [
      {
        id: "a1",
        title: "Application deadline extended",
        body: "The deadline for the Citi Polytechnic ODeL scholarship has been extended to 30 November 2026. Encourage others to apply.",
        audience: "All applicants",
        createdAt: iso(3),
      },
      {
        id: "a2",
        title: "Verification calls begin next week",
        body: "Shortlisted applicants will receive a verification call from the Foundation. Please keep your phone reachable.",
        audience: "Shortlisted applicants",
        createdAt: iso(6),
      },
    ]
  : [];

export const DEMO_CAMPAIGNS: Campaign[] = INCLUDE_DEMO_DATA
  ? [
      {
        id: "c1",
        name: "Citi Polytechnic ODeL Scholarship 2026",
        partner: "Citi Polytechnic Abuja",
        description:
          "100% funded ND and HND places through Citi Polytechnic's Open Distance e-Learning Programme, studied from Aba.",
        programmes: [...PROGRAMMES],
        opensOn: "2026-08-01",
        deadline: "2026-11-30",
        status: "Active",
        applicants: DEMO_APPLICATIONS.length,
      },
      {
        id: "c2",
        name: "Foundation Skills Grant 2027",
        partner: "To be confirmed",
        description: "Planned vocational skills grant for young people in Abia State.",
        programmes: [],
        opensOn: "2027-01-15",
        deadline: "2027-03-31",
        status: "Draft",
        applicants: 0,
      },
    ]
  : [];

export const DEMO_STAFF: StaffMember[] = INCLUDE_DEMO_DATA
  ? [
      {
        id: "s1",
        name: "Grace Nwosu",
        email: "grace@freeschoolfoundation.com.ng",
        role: "Super Admin",
        permissions: [...PERMISSIONS],
        active: true,
      },
      {
        id: "s2",
        name: "Daniel Okoro",
        email: "daniel@freeschoolfoundation.com.ng",
        role: "Reviewer",
        permissions: ["Review applications", "Change statuses", "View documents"],
        active: true,
      },
      {
        id: "s3",
        name: "Ify Chukwu",
        email: "ify@freeschoolfoundation.com.ng",
        role: "Communications",
        permissions: ["Send communications", "View documents"],
        active: true,
      },
      {
        id: "s4",
        name: "Sunday Adeniyi",
        email: "sunday@freeschoolfoundation.com.ng",
        role: "Viewer",
        permissions: ["Review applications"],
        active: false,
      },
    ]
  : [];

export const fullName = (a: Application) =>
  [a.personal.firstName, a.personal.middleName, a.personal.lastName].filter(Boolean).join(" ");

export const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
