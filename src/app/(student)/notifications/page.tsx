import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  await requireStudent();
  return <ScreenStub title="Уведомления" />;
}
