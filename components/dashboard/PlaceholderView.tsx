import { Surface } from "@/components/ui/Surface";
import { Empty } from "@/components/ui/primitives";
import { Sparkles } from "@/components/ui/icons";

export function PlaceholderView({ title }: { title: string }) {
  return (
    <Surface>
      <Empty icon={Sparkles} title={title}>
        Halaman ini sedang dalam pengembangan. Fitur inti deploy sudah bisa kamu coba dari tab Dashboard dan Deploy.
      </Empty>
    </Surface>
  );
}
