"use client";

import { useActionState, useRef } from "react";

import { submitCertificate } from "@/app/(student)/applications/actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

import {
  Field,
  FormMessage,
  SubmitButton,
  describedBy,
  inputClass,
  useFocusFirstError,
} from "./FormParts";

export function CertificateForm({ typeCode }: { typeCode: string }) {
  const [state, action, pending] = useActionState(submitCertificate, EMPTY_FORM_STATE);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  return (
    <form ref={formRef} action={action} className="mt-4 flex flex-col gap-4" noValidate>
      <input type="hidden" name="typeCode" value={typeCode} />
      <Field id="destination" label="Куда нужна справка" error={e.destination}>
        <input
          id="destination"
          name="destination"
          type="text"
          maxLength={200}
          required
          defaultValue={v.destination ?? ""}
          placeholder="Например, по месту работы"
          className={inputClass}
          {...describedBy("destination", false, e.destination)}
        />
      </Field>
      <Field id="copies" label="Сколько экземпляров" error={e.copies}>
        <input
          id="copies"
          name="copies"
          type="number"
          inputMode="numeric"
          min={1}
          max={5}
          required
          defaultValue={v.copies ?? "1"}
          className={`${inputClass} max-w-32`}
          {...describedBy("copies", false, e.copies)}
        />
      </Field>
      <FormMessage message={state.message} />
      <div>
        <SubmitButton pending={pending}>Заказать справку</SubmitButton>
      </div>
    </form>
  );
}
