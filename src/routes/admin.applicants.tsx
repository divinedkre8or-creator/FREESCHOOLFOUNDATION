import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/applicants")({
  component: ApplicantsLayout,
});

function ApplicantsLayout() {
  return <Outlet />;
}
