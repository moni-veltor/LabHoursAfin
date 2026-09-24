import { SkCardGrid, SkHeader } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkHeader />
      <SkCardGrid n={4} />
    </div>
  );
}
