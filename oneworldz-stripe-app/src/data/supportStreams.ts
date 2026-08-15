export type SupportStreamKey =
  | 'reagan_direct_impact'
  | 'community_impact'
  | 'davis_family'
  | 'oneworldz_project_support';

export type SupportStreamDefinition = {
  key: SupportStreamKey;
  label: string;
  campaignCode?: string;
  requiresSeparatePayout: boolean;
  expectedExistingLink: boolean;
};

export const SUPPORT_STREAMS: SupportStreamDefinition[] = [
  {
    key: 'reagan_direct_impact',
    label: 'Reagan & Children',
    campaignCode: 'OWZ-REG-001',
    requiresSeparatePayout: true,
    expectedExistingLink: true,
  },
  {
    key: 'community_impact',
    label: 'Community Impact',
    requiresSeparatePayout: true,
    expectedExistingLink: true,
  },
  {
    key: 'davis_family',
    label: 'Davis Family',
    campaignCode: 'OWZ-DAVIS-001',
    requiresSeparatePayout: true,
    expectedExistingLink: false,
  },
  {
    key: 'oneworldz_project_support',
    label: 'OneWorldz / JayJayTeamDev Support',
    campaignCode: 'OWZ-OPS-001',
    requiresSeparatePayout: false,
    expectedExistingLink: true,
  },
];
