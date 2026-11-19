"use client";

import { type ReactNode, useActionState, useRef, useState } from "react";

import { submitAbsence } from "@/app/(student)/applications/actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

import {
  Field,
  FormMessage,
  GroupError,
  SubmitButton,
  describedBy,
  inputClass,
  useFocusFirstError,
  useOfflineGuard,
} from "./FormParts";

export type AbsenceCandidateView = {
  id: string;
  label: string;
  when: string;
  /** Дата контроля «ГГГГ-ММ-ДД»: подставляется в период отсутствия. */
  day: string;
  notifyBy: string;
  expired: boolean;
};

export type AbsenceReasonView = { code: string; reason: string; document: string };

/** S5: какой контроль, причина (по п. 5.3.2, у каждой свой документ), даты, отметка об оригинале. */
export function AbsenceForm({
  candidates,
  reasons,
  initialEventId,
  dateBounds,
  deadlineNorms,
  documentNorms,
  periodNorms,
}: {
  candidates: AbsenceCandidateView[];
  reasons: AbsenceReasonView[];
  initialEventId: string | null;
  /** Допустимые даты (учебный год … год вперёд); сервер проверяет те же границы. */
  dateBounds: { min: string; max: string };
  deadlineNorms: ReactNode;
  documentNorms: ReactNode;
  periodNorms: ReactNode;
}) {
  const [state, action, pending] = useActionState(submitAbsence, EMPTY_FORM_STATE);
  const guard = useOfflineGuard();
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const selected = v.eventId ?? initialEventId ?? "";
  const selectedDay = candidates.find((c) => c.id === selected)?.day ?? "";
  // Последний день не раньше первого: min второго поля следует за первым.
  const [fromDay, setFromDay] = useState(v.absenceFrom ?? selectedDay);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  if (candidates.every((c) => c.expired)) {
    return (
      <div className="mt-4 flex flex-col gap-2" data-testid="absence-empty">
        <p className="text-lg font-semibold">1. Какой контроль пропускаете</p>
        {deadlineNorms}
        <p className="text-ink-muted">
          Ближайших зачётов, экзаменов и пересдач, о неявке на которые ещё можно сообщить, нет.
          Заявление нужно, только если вы пропускаете контроль. Расписание контроля — в разделе
          «Учёба».
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={guard.onSubmit}
      className="mt-4 flex max-w-2xl flex-col gap-6"
      noValidate
    >
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={e.eventId ? "eventId-error" : undefined}
      >
        <legend className="text-lg font-semibold">1. Какой контроль пропускаете</legend>
        {deadlineNorms}
        {candidates.map((c) => (
          <label
            key={c.id}
            data-testid="absence-candidate"
            data-day={c.day}
            data-expired={c.expired ? "true" : "false"}
            className={`border-border flex min-h-11 items-start gap-3 rounded-md border p-3 ${
              c.expired ? "text-ink-muted" : "cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name="eventId"
              value={c.id}
              defaultChecked={selected === c.id && !c.expired}
              disabled={c.expired}
              className="mt-1 size-5 shrink-0"
            />
            <span>
              <span className="block font-medium">{c.label}</span>
              <span className="block text-sm">{c.when}</span>
              <span className="block text-sm" data-testid="notify-by">
                {c.expired ? `Срок сообщить истёк ${c.notifyBy}` : `Сообщите до ${c.notifyBy}`}
              </span>
            </span>
          </label>
        ))}
        <GroupError id="eventId" error={e.eventId} />
      </fieldset>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={e.reason ? "reason-error" : undefined}
      >
        <legend className="text-lg font-semibold">2. Причина и документ</legend>
        {documentNorms}
        {reasons.map((r) => (
          <label
            key={r.code}
            className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3"
          >
            <input
              type="radio"
              name="reason"
              value={r.code}
              defaultChecked={v.reason === r.code}
              className="mt-1 size-5 shrink-0"
            />
            <span>
              <span className="block font-medium">{r.reason}</span>
              <span className="text-ink-muted block text-sm">Документ: {r.document}</span>
            </span>
          </label>
        ))}
        <GroupError id="reason" error={e.reason} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-semibold">3. Даты отсутствия</legend>
        {periodNorms}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="absenceFrom" label="Первый день" error={e.absenceFrom}>
            <input
              id="absenceFrom"
              name="absenceFrom"
              type="date"
              required
              defaultValue={v.absenceFrom ?? selectedDay}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={(ev) => setFromDay(ev.target.value)}
              className={inputClass}
              {...describedBy("absenceFrom", false, e.absenceFrom)}
            />
          </Field>
          <Field id="absenceTo" label="Последний день" error={e.absenceTo}>
            <input
              id="absenceTo"
              name="absenceTo"
              type="date"
              required
              defaultValue={v.absenceTo ?? selectedDay}
              min={fromDay && fromDay > dateBounds.min ? fromDay : dateBounds.min}
              max={dateBounds.max}
              className={inputClass}
              {...describedBy("absenceTo", false, e.absenceTo)}
            />
          </Field>
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            name="willBringOriginal"
            defaultChecked={v.willBringOriginal === "on"}
            className="mt-1 size-5 shrink-0"
            {...describedBy("willBringOriginal", false, e.willBringOriginal)}
          />
          <span>Оригинал документа принесу в деканат (в прототипе вместо загрузки файла)</span>
        </label>
        {e.willBringOriginal ? (
          <p
            id="willBringOriginal-error"
            className="text-danger text-sm"
            data-testid="error-willBringOriginal"
          >
            {e.willBringOriginal}
          </p>
        ) : null}
      </fieldset>

      <FormMessage
        message={guard.offlineMessage ?? state.message}
        prototypeNote={state.prototypeNote}
      />
      <div>
        <SubmitButton pending={pending}>Отправить заявление о продлении</SubmitButton>
      </div>
    </form>
  );
}
