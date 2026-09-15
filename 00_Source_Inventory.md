# Source Inventory

| ID | Source | SHA-256 / revision | Kind | Authority | Coverage | Inspection method | Status and findings |
|---|---|---|---|---|---|---|---|
| REF-001 | `../FSFPRD.txt` | `3853441C8221B78D9E13C852749B9D9CDE020A98BF8B5AC229542C1E0CA67195` | product requirements | AUTHORITATIVE | required | full text review | Defines actors, complete lifecycle, privacy, brand, content, and release success |
| REF-002 | Git repository at `ed1917cb3b7795559db1fb8c238b80a0be5c0368` | commit SHA | code | BEHAVIOR_ONLY | required | static inspection and build | Public site exists; application, login, portal, and admin routes are absent |
| REF-003 | `README.md` | tracked in REF-002 | implementation brief | DIRECTIONAL | contextual | full text review | Closely restates desired public, applicant, and admin experiences |
| REF-004 | `src/routes/index.tsx` | tracked in REF-002 | UI route | BEHAVIOR_ONLY | required | static inspection and production build | Establishes homepage hierarchy, content tone, CTA pattern, and responsive direction |
| REF-005 | `src/routes/{scholarship,programmes,about,faqs,contact}.tsx` | tracked in REF-002 | UI routes | BEHAVIOR_ONLY | required | static inspection and production build | Establishes existing public information architecture |
| REF-006 | `src/components/site/SiteLayout.tsx` | tracked in REF-002 | navigation shell | BEHAVIOR_ONLY | required | static inspection and TypeScript baseline | Links future `/apply`, `/login`, and `/admin` routes that are not implemented |
| REF-007 | `src/styles.css` and UI components | tracked in REF-002 | design system | DIRECTIONAL | required | token and component inspection | Establishes green/orange/yellow identity, typography, shape, spacing, and component grammar |
| REF-008 | `src/lib/fsf.ts` | tracked in REF-002 | domain prototype | CONTENT_ONLY | contextual | type and fixture inspection | Useful terminology and status copy; demo data is not production truth |
| REF-009 | `src/lib/store.tsx` | tracked in REF-002 | state prototype | BEHAVIOR_ONLY | contextual | state-path inspection | Demonstrates desired actions using insecure browser-local persistence; must be replaced for production |
| REF-010 | `src/assets/hero-student.jpg` and Foundation logo metadata | tracked in REF-002 | brand/media assets | DIRECTIONAL | required | visual/metadata inspection | Supports current public visual direction; primary logo raster is not present as a normal reusable source file |

## Precedence and conflicts

- REF-001 controls desired behavior; REF-002–REF-010 describe the current baseline.
- Demo fixtures and browser state never override privacy, authorization, or persistence requirements.
- The public UI direction is preserved unless a reviewed prototype approves a change.
- Claims about eligibility, recognition, deadlines, required documents, and legal consent require owner confirmation before production publication.
