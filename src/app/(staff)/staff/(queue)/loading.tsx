import { SectionSkeleton } from "@/components/SectionSkeleton";

// loading.tsx в группе маршрута: не действует на вложенные [id], где notFound() должен давать 404.
export default function Loading() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Очередь заявок</h1>
      <div className="mt-6">
        <SectionSkeleton label="Загружаем очередь" />
      </div>
    </>
  );
}
