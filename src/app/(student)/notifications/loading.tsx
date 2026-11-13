import { SectionSkeleton } from "@/components/SectionSkeleton";

export default function NotificationsLoading() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Уведомления</h1>
      <div className="mt-4">
        <SectionSkeleton label="Загружаем уведомления" />
      </div>
    </>
  );
}
