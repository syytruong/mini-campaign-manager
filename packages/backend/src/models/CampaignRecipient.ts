import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../db';

export const DELIVERY_STATUSES = ['pending', 'sent', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export class CampaignRecipient extends Model<
  InferAttributes<CampaignRecipient>,
  InferCreationAttributes<CampaignRecipient>
> {
  declare campaignId: string;
  declare recipientId: string;
  declare status: CreationOptional<DeliveryStatus>;
  declare sentAt: Date | null;
  declare openedAt: Date | null;
}

CampaignRecipient.init(
  {
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'campaign_id',
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'recipient_id',
    },
    status: {
      type: DataTypes.ENUM(...DELIVERY_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'opened_at',
    },
  },
  {
    sequelize,
    tableName: 'campaign_recipients',
    timestamps: false,
  },
);
