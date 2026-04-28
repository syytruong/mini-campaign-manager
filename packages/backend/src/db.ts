import { Sequelize } from 'sequelize';
import { config } from './config';

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function pingDatabase(): Promise<void> {
  await sequelize.authenticate();
}
