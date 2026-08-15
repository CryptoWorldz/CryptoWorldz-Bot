import React from 'react';
import {Box, Divider, SettingsView, Text} from '@stripe/ui-extension-sdk/ui';

const AppSettings = () => (
  <SettingsView>
    <Box css={{stack: 'y', gap: 'medium'}}>
      <Text weight="bold">OneWorldz Full Support</Text>
      <Text>Private account-only Stripe app.</Text>

      <Divider />

      <Box css={{stack: 'y', gap: 'small'}}>
        <Text weight="semibold">Security mode</Text>
        <Text>Bank account numbers are never stored in GitHub or app source.</Text>
        <Text>Stripe secret keys are never stored in GitHub or app source.</Text>
        <Text>Beneficiary bank setup must use Stripe-secured onboarding or payout-account controls.</Text>
      </Box>

      <Divider />

      <Box css={{stack: 'y', gap: 'small'}}>
        <Text weight="semibold">Routing lock</Text>
        <Text>Reagan & Children: separate payout required.</Text>
        <Text>Community Impact: separate payout required.</Text>
        <Text>Davis Family: separate payout required.</Text>
        <Text>OneWorldz / JayJayTeamDev Support: OneWorldz route permitted.</Text>
      </Box>

      <Divider />

      <Text>
        Current build mode is verification-first. Write controls stay locked until the Connect account model and payout routing are verified in sandbox.
      </Text>
    </Box>
  </SettingsView>
);

export default AppSettings;
