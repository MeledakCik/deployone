import { redirect } from "next/navigation";

export default function DatabaseRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard?view=database&db=${encodeURIComponent(params.id)}`);
}
