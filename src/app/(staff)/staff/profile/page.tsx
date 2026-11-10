import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/LogoutButton";
import { requireStaff } from "@/server/auth/guards";
import { getStaffProfile } from "@/server/dal/staff";

export const metadata: Metadata = { title: "Профиль сотрудника" };

export default async function StaffProfilePage() {
  const actor = await requireStaff();
  const profile = await getStaffProfile(actor);
  if (!profile) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold" data-testid="profile-name">
        {profile.fullName}
      </h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-ink-muted">Должность</dt>
        <dd>{profile.position}</dd>
        <dt className="text-ink-muted">Подразделение</dt>
        <dd>{profile.unit.name}</dd>
      </dl>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </>
  );
}
