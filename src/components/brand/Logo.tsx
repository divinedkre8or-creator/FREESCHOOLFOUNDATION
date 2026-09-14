import { Link } from "@tanstack/react-router";
import logo from "@/assets/fsf-logo.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src={logo.url}
        alt="The Free School Foundation logo"
        className="h-11 w-11 shrink-0 rounded-lg object-cover"
      />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-extrabold text-brand-orange">
            the free school
          </span>
          <span className="block text-sm font-extrabold text-brand-green">
            foundation
          </span>
        </span>
      )}
    </Link>
  );
}
