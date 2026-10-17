import { Loader2 } from "@/components/ui/icons";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 size={28} className="animate-spin text-text-faint" />
    </div>
  );
}
