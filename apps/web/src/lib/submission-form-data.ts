import type { FieldGroupDefinition, FieldGroupRowInput } from '@/types/api';

// Naming convention for dynamic form field inputs:
// fg_<fieldGroupDefinitionId>.<clientRowKey>.<fieldDefinitionId>
//
// `clientRowKey` is a client-generated id (crypto.randomUUID()) used only to
// group inputs belonging to the same row on submit — it is never sent to the
// API.
const FIELD_NAME_PATTERN = /^fg_([^.]+)\.([^.]+)\.([^.]+)$/;

export function buildFieldName(
  fieldGroupDefinitionId: string,
  rowKey: string,
  fieldDefinitionId: string,
): string {
  return `fg_${fieldGroupDefinitionId}.${rowKey}.${fieldDefinitionId}`;
}

function coerceValue(
  raw: FormDataEntryValue,
  fieldType: string | undefined,
): unknown {
  if (raw instanceof File) {
    return null;
  }

  if (raw === '') {
    return null;
  }

  if (fieldType === 'number') {
    return Number(raw);
  }

  return raw;
}

// Parses a submitted <form>'s FormData back into the fieldGroupRows shape
// POST/PATCH /submissions expects. `groups` must be the field group
// definitions the form was rendered from (used to determine each field's
// type for value coercion, and to order the output rows by group definition
// order rather than raw FormData iteration order).
export function buildFieldGroupRowsFromFormData(
  formData: FormData,
  groups: FieldGroupDefinition[],
): FieldGroupRowInput[] {
  const fieldTypeById = new Map<string, string>();
  const groupOrder: string[] = [];

  for (const group of groups) {
    groupOrder.push(group.id);
    for (const field of group.fieldDefinitions) {
      fieldTypeById.set(field.id, field.fieldType);
    }
  }

  const rowsByGroup = new Map<
    string,
    Map<string, FieldGroupRowInput['fieldValues']>
  >();

  for (const [name, raw] of formData.entries()) {
    const match = FIELD_NAME_PATTERN.exec(name);
    if (!match) continue;

    const [, groupId, rowKey, fieldId] = match;

    if (!rowsByGroup.has(groupId)) {
      rowsByGroup.set(groupId, new Map());
    }
    const rows = rowsByGroup.get(groupId)!;

    if (!rows.has(rowKey)) {
      rows.set(rowKey, []);
    }

    rows.get(rowKey)!.push({
      fieldDefinitionId: fieldId,
      value: coerceValue(raw, fieldTypeById.get(fieldId)),
    });
  }

  const result: FieldGroupRowInput[] = [];

  for (const groupId of groupOrder) {
    const rows = rowsByGroup.get(groupId);
    if (!rows) continue;

    let position = 1;
    for (const fieldValues of rows.values()) {
      result.push({ fieldGroupDefinitionId: groupId, position, fieldValues });
      position += 1;
    }
  }

  return result;
}
