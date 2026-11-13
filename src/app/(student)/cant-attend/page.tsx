import type { Metadata } from "next";

import { BackButton } from "@/components/BackButton";
import { ScreenStub } from "@/components/ScreenStub";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Не смогу прийти" };

// Заглушка S5: мастер «Не смогу прийти» появится в задании 6.
export default async function CantAttendPage() {
  await requireStudent();
  return (
    <>
      <BackButton fallbackHref="/study" />
      <div className="mt-2">
        <ScreenStub title="Не смогу прийти" />
      </div>
    </>
  );
}
