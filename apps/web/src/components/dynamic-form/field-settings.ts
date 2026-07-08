export type SelectOption = { value: string; label: string };

// `FieldDefinition.settings` is `Record<string, unknown>` — nothing backend
// or wire-side guarantees `options` actually holds `{ value, label }`
// entries, so this filters rather than blindly asserting the shape.
export function getSelectOptions(settings: Record<string, unknown>): SelectOption[] {
  if (!Array.isArray(settings.options)) {
    return [];
  }

  return settings.options.filter(
    (option): option is SelectOption =>
      typeof option === 'object' &&
      option !== null &&
      typeof (option as { value?: unknown }).value === 'string' &&
      typeof (option as { label?: unknown }).label === 'string',
  );
}
