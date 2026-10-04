import { pruneAudit } from '../audit/repository.js';
export async function runScheduled(
  controller: ScheduledController,
  db: D1Database,
  budgetBytes = 400000000,
): Promise<void> {
  const removed = await pruneAudit(db, controller.scheduledTime);
  const usage = await db
    .prepare(
      'SELECT COUNT(*) AS records, COALESCE(SUM(length(CAST(details AS BLOB))+length(message)+256),0) AS bytes FROM audit_records WHERE timestamp>=?',
    )
    .bind(controller.scheduledTime - 86400000)
    .all<{ records: number; bytes: number }>();
  const databaseBytes = usage.meta.size_after;
  const daily = usage.results[0];
  const projected90DayBytes = (daily?.bytes ?? 0) * 90 * 2;
  console.log(
    JSON.stringify({
      event: 'audit_retention_completed',
      removed,
      databaseBytes,
      projected90DayBytes,
      dailyRecords: daily?.records ?? 0,
      budgetBytes,
      scheduledTime: controller.scheduledTime,
    }),
  );
  if (
    databaseBytes > budgetBytes * 0.8 ||
    projected90DayBytes > budgetBytes * 0.8
  )
    console.warn(
      JSON.stringify({
        event: 'audit_capacity_warning',
        databaseBytes,
        projected90DayBytes,
        budgetBytes,
      }),
    );
}
