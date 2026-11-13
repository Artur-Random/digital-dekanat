import "server-only";

import { z } from "zod";

import type { StaffActor } from "@/server/auth/guards";
import type { DbTx } from "@/server/dal/client";
import {
  createAnnouncement,
  notifyApplicationStatus,
  notifyRetakeSchedulePublished,
} from "@/server/dal/notifications";

// Доменные функции уведомлений: те же вызывают сид и экраны сотрудника (задания 6–7).

type Options = { now?: Date; tx?: DbTx };

const announcementSchema = z.object({
  groupCodes: z.array(z.string().min(1).max(20)).min(1),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
});

export async function publishAnnouncement(
  actor: StaffActor,
  input: z.input<typeof announcementSchema>,
  options: Options = {},
): Promise<number> {
  return createAnnouncement(actor, announcementSchema.parse(input), options);
}

export async function publishRetakeSchedule(
  actor: StaffActor,
  eventId: string,
  options: Options = {},
): Promise<number> {
  return notifyRetakeSchedulePublished(actor, z.cuid().parse(eventId), options);
}

export async function notifyStudentAboutApplication(
  actor: StaffActor,
  applicationId: string,
  options: Options = {},
): Promise<number> {
  return notifyApplicationStatus(actor, z.cuid().parse(applicationId), options);
}
