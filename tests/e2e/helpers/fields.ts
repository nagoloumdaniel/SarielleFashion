import { expect, type Locator, type Page } from '@playwright/test';

/* Aides pour les champs personnalisés (Select, DateField, TimeField, DateTimeField). */

type Choice = string | { label: string };

/** Ouvre le menu déroulant libellé `label` et choisit une option (valeur ou libellé). */
export async function selectOption(
  page: Page,
  label: string | RegExp,
  choice: Choice,
): Promise<void> {
  const trigger = page.getByLabel(label);
  await trigger.click();
  const option =
    typeof choice === 'string'
      ? page.locator(`[role="option"][data-value="${choice}"]`)
      : page.getByRole('option', { name: choice.label, exact: true });
  await option.click();
}

/** Choisit un jour (AAAA-MM-JJ) dans le calendrier ouvert par `trigger`. */
export async function pickDateOn(trigger: Locator, iso: string): Promise<void> {
  const page = trigger.page();
  const [y, m, d] = iso.split('-');
  await trigger.click();
  const dialog = page.getByRole('dialog');
  const target = dialog.getByRole('button', { name: `${d}/${m}/${y}`, exact: true });
  for (let i = 0; i < 36 && !(await target.isVisible()); i++) {
    await dialog.getByRole('button', { name: 'Mois suivant' }).click();
  }
  await expect(target).toBeEnabled();
  await target.click();
}

export async function pickDate(page: Page, label: string | RegExp, iso: string): Promise<void> {
  await pickDateOn(page.getByLabel(label), iso);
}

/** Date + heure du champ posté sous `name` (ex. startsAtLocal), valeur « AAAA-MM-JJTHH:mm ». */
export async function pickDateTime(page: Page, name: string, value: string): Promise<void> {
  const [date, time] = value.split('T');
  const box = page.locator(`input[name="${name}"]`).locator('xpath=..');
  await pickDateOn(box.locator('button[aria-haspopup="dialog"]'), date);
  await box.getByRole('combobox').click();
  await box.getByRole('option', { name: time, exact: true }).click();
}
