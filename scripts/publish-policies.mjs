#!/usr/bin/env node
// Publishes the refund, shipping and terms policies from uscode-policies.html to Shopify,
// then checks each public policy page returns 200 and mentions the support email.
//
// Usage (Node 18+, from the repo root):
//   SHOPIFY_ADMIN_TOKEN=shpat_... node scripts/publish-policies.mjs
// The token comes from a custom app (Settings > Apps > Develop apps) with the
// write_legal_policies and read_legal_policies scopes. Never commit it.

import { readFileSync } from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '1rf41e-sz.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const FILE = process.argv[2] || 'uscode-policies.html';
const SUPPORT = 'support@theuscode.com';

if (!TOKEN) {
  console.error('Set SHOPIFY_ADMIN_TOKEN (Admin API access token with write_legal_policies, read_legal_policies).');
  process.exit(1);
}

const html = readFileSync(FILE, 'utf8');
const body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));

// Everything between one <h1> and the next (or the end of <body>), without the <h1> itself.
function section(title) {
  const re = new RegExp(`<h1>\\s*${title}\\s*</h1>([\\s\\S]*?)(?=<h1>|$)`, 'i');
  const m = body.match(re);
  if (!m) throw new Error(`No <h1>${title}</h1> in ${FILE}`);
  return m[1].trim();
}

const POLICIES = [
  { type: 'REFUND_POLICY', title: 'Refund policy', path: '/policies/refund-policy' },
  { type: 'SHIPPING_POLICY', title: 'Shipping policy', path: '/policies/shipping-policy' },
  { type: 'TERMS_OF_SERVICE', title: 'Terms of service', path: '/policies/terms-of-service' },
];

const MUTATION = `mutation($body: String!, $type: ShopPolicyType!) {
  shopPolicyUpdate(shopPolicy: { type: $type, body: $body }) {
    shopPolicy { type url }
    userErrors { field message }
  }
}`;

async function gql(variables) {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query: MUTATION, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json.errors || json)}`);
  return json.data.shopPolicyUpdate;
}

let failed = false;
for (const p of POLICIES) {
  const result = await gql({ type: p.type, body: section(p.title) });
  if (result.userErrors.length) {
    failed = true;
    console.log(`${p.type}: userErrors ${JSON.stringify(result.userErrors)}`);
  } else {
    console.log(`${p.type}: ${result.shopPolicy.url}`);
  }
}

console.log('\nChecking public pages');
for (const p of POLICIES) {
  const res = await fetch(`https://${SHOP}${p.path}`, { redirect: 'follow' });
  const text = await res.text();
  const ok = res.status === 200 && text.includes(SUPPORT);
  if (!ok) failed = true;
  console.log(`${p.path}: ${res.status}, contains ${SUPPORT}: ${text.includes(SUPPORT)}`);
}
process.exit(failed ? 1 : 0);
