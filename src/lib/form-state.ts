/**
 * Ответ Server Action формы: ошибки по полям, общее сообщение и введённые значения.
 * Значения возвращаются, потому что React сбрасывает форму после action: без них студент
 * потерял бы введённое при ошибке. Успех — redirect.
 */
export type FormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = {};
