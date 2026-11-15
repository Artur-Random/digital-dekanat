// Подпись нормы для интерфейса: документ и пункт («754общ, п. 2.13»). Внутренний код N-xx
// остаётся только в реестре и в якорях ссылок (замечание Максима, #36).

/** Короткое имя документа: «754общ», «273-ФЗ», «Указ № 343». */
export function shortDocument(document: string): string {
  if (document.startsWith("Указ")) {
    const number = document.match(/№\s*(\d+)/)?.[1];
    return number ? `Указ № ${number}` : "Указ";
  }
  return document.split(/\s/)[0] ?? document;
}

/** Пункт без пояснений в скобках: «п. 1 «в» (новый п. 3¹ …)» → «п. 1 «в»». */
export function shortClause(clause: string): string {
  return clause.replace(/\s*\([^)]*\)/g, "").trim();
}

export function normLabel(norm: { document: string; clause: string }): string {
  return `${shortDocument(norm.document)}, ${shortClause(norm.clause)}`;
}
