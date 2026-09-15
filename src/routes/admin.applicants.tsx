import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Filter, Search, Users } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROGRAMMES, STATUSES, formatDate, fullName } from "@/lib/fsf";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/applicants")({ component: ApplicantsPage });
function ApplicantsPage() {
  const { applications } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [level, setLevel] = useState("All");
  const [programme, setProgramme] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const filtered = useMemo(
    () =>
      applications.filter((app) => {
        const haystack =
          `${fullName(app)} ${app.appNumber} ${app.personal.phone} ${app.personal.email}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (status === "All" || app.status === status) &&
          (level === "All" || app.level === level) &&
          (programme === "All" || app.programme === programme)
        );
      }),
    [applications, query, status, level, programme],
  );
  const selected = filtered.filter((app) => selectedIds.includes(app.id));
  const exportRows = selected.length > 0 ? selected : filtered;

  const toggle = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const toggleFiltered = () => {
    const filteredIds = filtered.map((app) => app.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : [...new Set([...current, ...filteredIds])],
    );
  };

  const exportPhones = () => {
    const header = ["Name", "Phone", "Email", "Application Number", "Status", "Programme"];
    const rows = exportRows.map((app) => [
      fullName(app),
      app.personal.phone,
      app.personal.email,
      app.appNumber,
      app.status,
      app.programme,
    ]);
    const csv = [header, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fsf-applicant-phones-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <p className="text-sm font-bold text-brand-orange">Applicant management</p>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">All applicants</h1>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <p className="mt-2 text-sm text-muted-foreground">
          Search, filter, select people and export phone numbers for an external SMS platform.
        </p>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          disabled={exportRows.length === 0}
          onClick={exportPhones}
        >
          <Download className="mr-2 h-4 w-4" />
          Export{" "}
          {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} filtered`}
        </Button>
      </div>
      <section className="mt-7 rounded-2xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(3,180px)]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Name, number, phone or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={["All", ...STATUSES]}
            label="status"
          />
          <FilterSelect
            value={level}
            onChange={setLevel}
            options={["All", "ND", "HND"]}
            label="level"
          />
          <FilterSelect
            value={programme}
            onChange={setProgramme}
            options={["All", ...PROGRAMMES]}
            label="programme"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> {filtered.length} applicant
            {filtered.length === 1 ? "" : "s"}
          </span>
          {filtered.length > 0 && (
            <button
              type="button"
              className="font-bold text-brand-green-dark"
              onClick={toggleFiltered}
            >
              {filtered.every((app) => selectedIds.includes(app.id))
                ? "Clear filtered"
                : "Select filtered"}
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 font-bold">No applicants match these filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Clear or change a filter to see more records.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {filtered.map((app) => (
                <article key={app.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-brand-green"
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggle(app.id)}
                        aria-label={`Select ${fullName(app)}`}
                      />
                      <div className="min-w-0">
                        <Link
                          to="/admin/applicants/$applicationId"
                          params={{ applicationId: app.id }}
                          className="truncate font-bold"
                        >
                          {fullName(app)}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{app.appNumber}</p>
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Programme</dt>
                      <dd className="mt-1 font-semibold">{app.programme}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Level</dt>
                      <dd className="mt-1 font-semibold">{app.level}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Submitted</dt>
                      <dd className="mt-1 font-semibold">{formatDate(app.submittedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-green"
                        checked={
                          filtered.length > 0 &&
                          filtered.every((app) => selectedIds.includes(app.id))
                        }
                        onChange={toggleFiltered}
                        aria-label="Select all filtered applicants"
                      />
                    </th>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Programme</th>
                    <th className="px-5 py-3">Level</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((app) => (
                    <tr key={app.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-green"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => toggle(app.id)}
                          aria-label={`Select ${fullName(app)}`}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to="/admin/applicants/$applicationId"
                          params={{ applicationId: app.id }}
                          className="font-bold hover:text-brand-green-dark"
                        >
                          {fullName(app)}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{app.appNumber}</p>
                      </td>
                      <td className="px-5 py-4">{app.programme}</td>
                      <td className="px-5 py-4">{app.level}</td>
                      <td className="px-5 py-4">{formatDate(app.submittedAt)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function safeCsvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
}) {
  return (
    <select
      aria-label={`Filter by ${label}`}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  );
}
