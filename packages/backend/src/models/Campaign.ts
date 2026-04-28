import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../db';

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export class Campaign extends Model<
  InferAttributes<Campaign>,
  InferCreationAttributes<Campaign>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare subject: string;
  declare body: string;
  declare status: CreationOptional<CampaignStatus>;
  declare scheduledAt: Date | null;
  declare createdBy: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Campaign.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...CAMPAIGN_STATUSES),
      allowNull: false,
      defaultValue: 'draft',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_at',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'campaigns',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
);
