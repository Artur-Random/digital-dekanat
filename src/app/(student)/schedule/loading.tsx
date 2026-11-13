import { SectionSkeleton } from "@/components/SectionSkeleton";

export default function ScheduleLoading() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Расписание</h1>
      <div className="mt-6">
        <SectionSkeleton label="Загружаем расписание" />
      </div>
    </>
  );
}
