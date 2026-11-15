"use client";

import { type ReactNode, useActionState, useRef, useState } from "react";

import { submitAcademicLeave } from "@/app/(student)/applications/actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import {
  LEAVE_BASES,
  LEAVE_BASIS_LABEL,
  type LeaveBasis,
  leaveBranch,
  maxLeaveMonths,
} from "@/server/rules/application-forms";

import {
  Field,
  FormMessage,
  GroupError,
  SubmitButton,
  describedBy,
  inputClass,
  useFocusFirstError,
} from "./FormParts";

function isBasis(value: string | undefined): value is LeaveBasis {
  return (LEAVE_BASES as readonly string[]).includes(value ?? "");
}

/** previews — этапы веток А и Б из данных типа заявки (сроки и нормы), отрисованы на сервере. */
export function LeaveForm({ previews }: { previews: { A: ReactNode; B: ReactNode } }) {
  const [state, action, pending] = useActionState(submitAcademicLeave, EMPTY_FORM_STATE);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const [basis, setBasis] = useState<LeaveBasis | "">(isBasis(v.basis) ? v.basis : "");
  const [hasDocuments, setHasDocuments] = useState(v.hasDocuments === "on");
  const branch = basis ? leaveBranch(basis, hasDocuments) : null;
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} action={action} className="mt-4 flex flex-col gap-4" noValidate>
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={e.basis ? "basis-error" : undefined}
      >
        <legend className="font-medium">Основание</legend>
        {LEAVE_BASES.map((b) => (
          <label key={b} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="basis"
              value={b}
              checked={basis === b}
              onChange={() => setBasis(b)}
              className="size-5"
            />
            {LEAVE_BASIS_LABEL[b]}
          </label>
        ))}
        <GroupError id="basis" error={e.basis} />
      </fieldset>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          name="hasDocuments"
          checked={hasDocuments}
          onChange={(ev) => setHasDocuments(ev.target.checked)}
          className="size-5"
        />
        Есть документы, подтверждающие основание (в прототипе вместо загрузки файла: принесу
        оригинал)
      </label>
      <Field
        id="months"
        label="Срок отпуска, месяцев"
        hint={basis ? `Не больше ${maxLeaveMonths(basis)} месяцев.` : undefined}
        error={e.months}
      >
        <input
          id="months"
          name="months"
          type="number"
          inputMode="numeric"
          min={1}
          max={basis ? maxLeaveMonths(basis) : 24}
          required
          defaultValue={v.months ?? ""}
          className={`${inputClass} max-w-32`}
          {...describedBy("months", Boolean(basis), e.months)}
        />
      </Field>
      {branch ? (
        <div className="border-border rounded-md border p-3" data-testid="leave-branch">
          {previews[branch]}
        </div>
      ) : null}
      <FormMessage message={state.message} />
      <div>
        <SubmitButton pending={pending}>Подать заявление</SubmitButton>
      </div>
    </form>
  );
}
