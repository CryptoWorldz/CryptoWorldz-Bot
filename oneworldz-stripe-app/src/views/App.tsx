import React from 'react';
import {
  Box,
  ContextView,
  Divider,
  Inline,
  Text,
} from '@stripe/ui-extension-sdk/ui';

const Stream = ({name, status}: {name: string; status: string}) => (
  <Box css={{stack: 'y', gap: 'small', paddingY: 'small'}}>
    <Inline css={{gap: 'small', alignY: 'center'}}>
      <Text weight="semibold">{name}</Text>
      <Text>{status}</Text>
    </Inline>
  </Box>
);

const App = () => (
  <ContextView title="OneWorldz Full Support">
    <Box css={{stack: 'y', gap: 'medium'}}>
      <Text weight="bold">Helping People Who Help People in Need</Text>
      <Text>
        Private OneWorldz support control panel. Support streams remain separated and no bank details are stored in this app.
      </Text>

      <Divider />

      <Stream name="Reagan & Children" status="Setup pending" />
      <Stream name="Community Impact" status="Setup pending" />
      <Stream name="Davis Family" status="Setup pending" />
      <Stream name="OneWorldz / JayJayTeamDev Support" status="Existing OneWorldz stream" />

      <Divider />

      <Text>
        Next build stage: Connect account creation, compliant onboarding, payout routing, payment links, receipts and reporting.
      </Text>
    </Box>
  </ContextView>
);

export default App;
