import type { Metadata } from "next";

import { BackButton } from "@/components/BackButton";
import { ScreenStub } from "@/components/ScreenStub";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Новая заявка" };

// Заглушка S4a: мастер заявок появится в задании 6.
export default async function NewApplicationPage() {
  await requireStudent();
  return (
    <>
      <BackButton fallbackHref="/applications" />
      <div className="mt-2">
        <ScreenStub title="Новая заявка" />
      </div>
    </>
  );
}
