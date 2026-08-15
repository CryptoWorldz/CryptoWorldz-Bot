import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Box,
  Button,
  ContextView,
  Divider,
  Inline,
  Text,
} from '@stripe/ui-extension-sdk/ui';
import type Stripe from 'stripe';
import {
  SUPPORT_STREAMS,
  type SupportStreamDefinition,
} from '../data/supportStreams';
import {
  loadOneWorldzStripeSnapshot,
  type OneWorldzStripeSnapshot,
} from '../lib/stripe';

const findPaymentLink = (
  stream: SupportStreamDefinition,
  links: Stripe.PaymentLink[],
) =>
  links.find(
    (link) =>
      link.metadata?.funding_stream === stream.key ||
      (stream.campaignCode && link.metadata?.campaign_code === stream.campaignCode),
  );

const StreamCard = ({
  stream,
  link,
}: {
  stream: SupportStreamDefinition;
  link?: Stripe.PaymentLink;
}) => {
  const hasConnectedDestination = Boolean(link?.transfer_data?.destination);
  const isSafelyRouted =
    !stream.requiresSeparatePayout || (Boolean(link) && hasConnectedDestination);

  let status = 'Setup pending';
  if (link?.active && isSafelyRouted) status = 'Verified link found';
  if (link?.active && !isSafelyRouted) status = 'HOLD — separate payout routing required';
  if (!link && stream.key === 'davis_family') status = 'Waiting for Davis connected account';

  return (
    <Box
      css={{
        stack: 'y',
        gap: 'small',
        padding: 'medium',
        backgroundColor: 'container',
        borderRadius: 'small',
      }}
    >
      <Inline css={{gap: 'small', alignY: 'center'}}>
        <Text weight="semibold">{stream.label}</Text>
      </Inline>
      <Text>{status}</Text>
      {link ? (
        <>
          <Text>Payment Link: {link.active ? 'active' : 'inactive'}</Text>
          <Text>
            Payout route: {hasConnectedDestination ? 'connected account' : 'OneWorldz account'}
          </Text>
          {isSafelyRouted && link.url ? (
            <Button href={link.url} target="_blank" size="small">
              Open payment link
            </Button>
          ) : null}
        </>
      ) : (
        <Text>No live payment link assigned.</Text>
      )}
    </Box>
  );
};

const App = () => {
  const [snapshot, setSnapshot] = useState<OneWorldzStripeSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await loadOneWorldzStripeSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read Stripe state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connectedAccountCount = snapshot?.connectedAccounts.length ?? 0;
  const links = useMemo(() => snapshot?.paymentLinks ?? [], [snapshot]);

  return (
    <ContextView
      title="OneWorldz Full Support"
      description="Verified support streams, Connect routing and payment-link status"
      actions={
        <Button onPress={() => void refresh()} pending={loading}>
          Refresh Stripe state
        </Button>
      }
    >
      <Box css={{stack: 'y', gap: 'medium'}}>
        <Text weight="bold">Helping People Who Help People in Need</Text>
        <Text>
          This private control panel reads live Stripe state. It never stores bank account numbers or Stripe secret keys in source code.
        </Text>

        <Divider />

        <Text weight="semibold">Connected accounts: {connectedAccountCount}</Text>
        {connectedAccountCount === 0 ? (
          <Text>
            No Connect connected accounts are currently visible. Separate beneficiary payout routing is not ready yet.
          </Text>
        ) : null}
        {error ? <Text>Stripe read error: {error}</Text> : null}

        <Divider />

        {SUPPORT_STREAMS.map((stream) => (
          <StreamCard
            key={stream.key}
            stream={stream}
            link={findPaymentLink(stream, links)}
          />
        ))}

        <Divider />

        <Text>
          Safety lock: Reagan, Community Impact and Davis Family cannot be marked ready while their payment route falls back to the OneWorldz payout account.
        </Text>
      </Box>
    </ContextView>
  );
};

export default App;
