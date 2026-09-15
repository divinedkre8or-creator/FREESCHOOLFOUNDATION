<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Free School Gateway build constitution

This repository implements The Free School Foundation Scholarship Portal.

## Required reading

Before product work, read these files in order:

1. `AGENTS.md`
2. `../FSFPRD.txt`
3. `PROJECT_BIBLE.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `TASK_TRACKER.md`

## Product truth

- The Free School Foundation is the primary brand and data controller.
- Citi Polytechnic is the education partner for the current campaign, not the product identity.
- The product has three connected experiences: public website, applicant portal, and Foundation admin panel.
- The core outcome is: Discover -> Apply -> Submit -> Review -> Communicate -> Shortlist -> Approve -> Enrol.
- Mobile completion is required for every applicant-facing flow.
- Internal notes, staff permissions, private documents, and other applicants' records must never cross authorization boundaries.

## Conflict order

Current user instruction > this constitution > security and data rules > shared flow contracts > implementation plan > individual task notes > builder judgment.

## Working rules

- Work in the dependency order recorded in `docs/IMPLEMENTATION_PLAN.md`.
- Update `TASK_TRACKER.md` when a task starts, becomes blocked, or is completed.
- A task is complete only when its acceptance criteria and evidence fields are satisfied.
- Preserve the established public-site visual language unless a reviewed prototype approves a material change.
- Major UI/UX changes require a flow prototype and explicit approval before production implementation.
- Add tests before or with behavioral changes; verify role and object ownership for sensitive paths.
- Never treat browser `localStorage` demo state as production persistence or authorization.
- Do not rewrite published Git history; commits synchronize with Lovable.

## Stop conditions

Stop and request authority before production deployment, DNS changes, paid-service activation, destructive real-data changes, legal acceptance, or use of real applicant data.
