export type VisitCounts = {
  todayCount: number;
  totalCount: number;
};

export function normalizeVisitCounts(value: unknown): VisitCounts | null {
  const row = Array.isArray(value) ? value[0] : value;

  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const todayCount = Number(record.today_count);
  const totalCount = Number(record.total_count);

  if (!Number.isFinite(todayCount) || !Number.isFinite(totalCount)) {
    return null;
  }

  return { todayCount, totalCount };
}
