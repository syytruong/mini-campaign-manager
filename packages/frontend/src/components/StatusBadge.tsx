import { Badge } from '@chakra-ui/react';
import type { CampaignStatus } from '../types';

const STATUS_TO_COLOR: Record<CampaignStatus, string> = {
  draft: 'gray',
  scheduled: 'blue',
  sending: 'orange',
  sent: 'green',
};

interface Props {
  status: CampaignStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <Badge colorScheme={STATUS_TO_COLOR[status]} textTransform="capitalize">
      {status}
    </Badge>
  );
}
