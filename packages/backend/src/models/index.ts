import { Campaign } from './Campaign';
import { CampaignRecipient } from './CampaignRecipient';
import { Recipient } from './Recipient';
import { User } from './User';

User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Campaign.belongsToMany(Recipient, {
  through: CampaignRecipient,
  foreignKey: 'campaignId',
  otherKey: 'recipientId',
  as: 'recipients',
});
Recipient.belongsToMany(Campaign, {
  through: CampaignRecipient,
  foreignKey: 'recipientId',
  otherKey: 'campaignId',
  as: 'campaigns',
});

Campaign.hasMany(CampaignRecipient, { foreignKey: 'campaignId', as: 'deliveries' });
CampaignRecipient.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
CampaignRecipient.belongsTo(Recipient, { foreignKey: 'recipientId', as: 'recipient' });

export { Campaign, CampaignRecipient, Recipient, User };
export { CAMPAIGN_STATUSES, type CampaignStatus } from './Campaign';
export { DELIVERY_STATUSES, type DeliveryStatus } from './CampaignRecipient';
