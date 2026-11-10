import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";

export const metadata: Metadata = { title: "Очередь" };

// TODO(задание 2): requireStaff() перед рендером.
export default function StaffQueuePage() {
  return <ScreenStub code="E1" title="Очередь заявок" />;
}
