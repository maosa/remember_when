import { headers } from 'next/headers'
import { resolveCurrency } from '@/lib/pricing/currency'
import { PricingClient } from './pricing-client'

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // QA/testing hook: `?cc=GB` forces a country locally (the Vercel header is
  // absent in dev) and lets us spot-check any geo in production.
  const override = (await searchParams).cc
  const headerCountry = (await headers()).get('x-vercel-ip-country')
  const country = (typeof override === 'string' ? override : undefined) ?? headerCountry

  return <PricingClient currency={resolveCurrency(country)} />
}
