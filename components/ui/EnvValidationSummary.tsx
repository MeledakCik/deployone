import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EnvValidationIssue } from "@/types";

export function EnvValidationSummary({
  issues,
  validCount,
}: {
  issues: EnvValidationIssue[];
  validCount: number;
}) {
  if (issues.length === 0) {
    if (validCount === 0) return null;
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-emerald-400">
        <CheckCircle2 size={13} className="shrink-0" />
        {validCount} variable valid, siap di-deploy.
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1">
      {issues.map((issue, i) => (
        <li
          key={`${issue.line}-${i}`}
          className={`flex items-start gap-1.5 text-[11.5px] ${
            issue.level === "error" ? "text-red-400" : "text-amber-400"
          }`}
        >
          {issue.level === "error" ? (
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          )}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}
