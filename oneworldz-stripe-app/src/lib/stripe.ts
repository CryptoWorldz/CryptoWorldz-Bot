import Stripe from 'stripe';
import {
  createHttpClient,
  STRIPE_API_KEY,
} from '@stripe/ui-extension-sdk/http_client';

export const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient() as Stripe.HttpClient,
});

export type OneWorldzStripeSnapshot = {
  connectedAccounts: Stripe.Account[];
  paymentLinks: Stripe.PaymentLink[];
};

export async function loadOneWorldzStripeSnapshot(): Promise<OneWorldzStripeSnapshot> {
  const [connectedAccounts, paymentLinks] = await Promise.all([
    stripe.accounts.list({limit: 100}),
    stripe.paymentLinks.list({limit: 100}),
  ]);

  return {
    connectedAccounts: connectedAccounts.data,
    paymentLinks: paymentLinks.data,
  };
}
