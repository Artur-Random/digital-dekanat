import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/LogoutButton";
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
      <dl className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-x-4">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-muted text-sm sm:text-base">{label}</dt>
            <dd className="-mt-2 sm:mt-0">{value}</dd>
          </div>
        ))}
      </dl>

      <section
        aria-labelledby="password-title"
        className="border-border mt-8 rounded-md border p-4"
      >
        <h2 id="password-title" className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound aria-hidden="true" className="size-5" />
          Смена пароля
        </h2>
        <p className="text-ink-muted mt-2" id="password-disabled">
          В демо-режиме смена пароля недоступна: аккаунтом пользуются несколько экспертов.
        </p>
        <button
          type="button"
          disabled
          aria-describedby="password-disabled"
          className="bg-surface-muted text-ink-muted mt-3 min-h-11 cursor-not-allowed rounded-md px-4"
        >
          Сменить пароль
        </button>
      </section>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </>
  );
}
