// Con una sola mesa no hay nada que elegir: /entrar la preselecciona y oculta
// el selector. Sin imports para poder testearla en Node.
export function onlyTableId(tables: readonly { id: string }[]): string | null {
  return tables.length === 1 ? (tables[0]?.id ?? null) : null
}
