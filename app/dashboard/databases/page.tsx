import { redirect } from "next/navigation";

// Menu Database hidup di dalam dashboard (state-based, seperti menu lainnya) supaya sidebar tetap tampil.
export default function DatabasesRedirect() {
  redirect("/dashboard?view=database");
}
