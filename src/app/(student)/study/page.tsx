import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Учёба" };

export default async function StudyPage() {
  await requireStudent();
  return <ScreenStub title="Учёба" />;
}
