import { SkCardGrid, SkHeader, SkPanel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <SkHeader lede={false} />
      <SkPanel lines={2} />
      <SkCardGrid n={4} />
    </div>
  );
}
