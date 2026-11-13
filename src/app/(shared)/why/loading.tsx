import { SectionSkeleton } from "@/components/SectionSkeleton";

export default function WhyLoading() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Почему так</h1>
      <div className="mt-4">
        <SectionSkeleton label="Загружаем нормы" />
      </div>
    </>
  );
}
