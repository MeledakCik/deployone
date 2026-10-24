export type Cell = null | number | string | { blob: string };
export type KeyInfo = { id: string; label: string; mode: "ro" | "rw"; prefix: string; createdAt: number; revokedAt?: number };
export type PublicDb = { id: string; displayName: string; createdAt: number; username: string; keys?: KeyInfo[] };
export type ColumnInfo = { cid: number; name: string; type: string; notnull: number; dflt: Cell; pk: number };
export type IndexInfo = { name: string; unique: boolean; origin: string; sql: string | null };
export type TableInfo = { name: string; type: string; sql: string | null; rowCount: Cell; columns: ColumnInfo[]; indexes: IndexInfo[] };
export type Schema = { tables: TableInfo[]; triggers: { name: string; table: string; sql: string | null }[] };
