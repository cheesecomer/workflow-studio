export type DocumentDefinitionWithFieldGroups = {
  fieldGroupDefinitions: {
    id: bigint;
    repeatable: boolean;
    minRows: number | null;
    maxRows: number | null;
    fieldDefinitions: {
      id: bigint;
      required: boolean;
    }[];
  }[];
};
