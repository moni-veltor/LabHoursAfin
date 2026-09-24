import { SkCardGrid, SkHeader, Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <SkHeader />
      <div className="space-y-3">
        <Sk className="h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Sk key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <SkCardGrid n={6} />
    </div>
  );
}
