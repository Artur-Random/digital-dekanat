import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { PasswordChangeDisabled } from "@/components/PasswordChangeDisabled";
import { FUNDING_LABEL, STUDY_FORM_LABEL } from "@/lib/labels";
import { requireStudent } from "@/server/auth/guards";
import { getStudentProfile } from "@/server/dal/students";

export const metadata: Metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const actor = await requireStudent();
  const profile = await getStudentProfile(actor);
  if (!profile) notFound();

  const rows: [string, string][] = [
    ["Институт", profile.institute],
    ["Направление", `${profile.programCode} ${profile.programName}`],
    ["Профиль", profile.profile],
    ["Уровень", profile.level.name],
    ["Форма обучения", STUDY_FORM_LABEL[profile.studyForm]],
    ["Основа", FUNDING_LABEL[profile.funding]],
    ["Курс", String(profile.course)],
    ["Группа", profile.group.code],
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold" data-testid="profile-name">
        {profile.fullName}
      </h1>
      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-[12rem_1fr] sm:gap-x-4 sm:gap-y-3">
        {rows.flatMap(([label, value]) => [
          <dt
            key={`${label}-t`}
            className="text-ink-muted mt-3 text-sm first:mt-0 sm:mt-0 sm:text-base"
          >
            {label}
          </dt>,
          <dd key={`${label}-d`}>{value}</dd>,
        ])}
      </dl>

      <PasswordChangeDisabled />

      <ThemeSwitcher initial={parseTheme((await cookies()).get(THEME_COOKIE)?.value)} />
      <div className="mt-8">
        <LogoutButton />
      </div>
    </>
  );
}
