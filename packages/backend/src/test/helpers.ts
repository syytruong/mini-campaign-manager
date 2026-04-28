import { sequelize } from '../db';
import '../models'; // register associations

/**
 * Truncate all app tables between tests. We CASCADE because of FKs.
 * Faster than dropping/recreating, safer than per-table truncation.
 */
export async function resetDatabase(): Promise<void> {
  await sequelize.query(
    `TRUNCATE TABLE
       campaign_recipients,
       campaigns,
       recipients,
       users
     RESTART IDENTITY CASCADE;`,
  );
}

export async function closeDatabase(): Promise<void> {
  await sequelize.close();
}
