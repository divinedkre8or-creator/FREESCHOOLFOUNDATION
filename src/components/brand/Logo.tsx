import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="The Free School Foundation home"
      className="flex min-w-0 items-center gap-2.5"
    >
      <img
        src="/favicon.png"
        alt="The Free School Foundation logo"
        width="64"
        height="64"
        className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
      />
      {!compact && (
        <span className="hidden min-w-0 leading-[1.05] min-[350px]:block">
          <span className="block whitespace-nowrap text-[13px] font-extrabold text-brand-orange sm:text-sm">
            The Free School
          </span>
          <span className="block whitespace-nowrap text-[13px] font-extrabold text-brand-green sm:text-sm">
            Foundation
          </span>
        </span>
      )}
    </Link>
  );
}
