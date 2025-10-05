import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) return null;
  // Lazy require to avoid dependency when not configured
   
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

async function resolveTenantId() {
  // Reuse Xero tenant if configured; otherwise default
  return (await redis.get('xero:tenantId')) || 'default';
}

async function ensureSchemaForStripe() {
  const alter = `
    alter table if exists public.billing_products
      add column if not exists stripe_product_id text;
  `;
  try { await supabase.rpc('exec_sql', { query: alter }); } catch (_) {}
}

async function upsertProduct(tenantId, p) {
  await ensureSchemaForStripe();
  const payload = {
    tenant_id: tenantId,
    name: p.name || 'Product',
    description: p.description || null,
    metadata: p.metadata || {},
    stripe_product_id: p.id,
    active: p.active
  };
  // Try update by stripe_product_id else insert
  const { data: existing } = await supabase
    .from('billing_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('stripe_product_id', p.id)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from('billing_products').update(payload).eq('id', existing.id);
    return existing.id;
  }
  const { data: ins } = await supabase.from('billing_products').insert(payload).select('id').single();
  return ins?.id;
}

async function upsertPrice(productId, price) {
  const payload = {
    product_id: productId,
    currency: price.currency?.toUpperCase() || 'USD',
    unit_amount: (price.unit_amount || 0) / 100,
    billing_period: price.recurring?.interval === 'year' ? 'year' : (price.recurring?.interval === 'month' ? 'month' : 'one_time'),
    usage_type: price.recurring?.usage_type === 'metered' ? 'metered' : 'licensed',
    trial_days: price.recurring?.trial_period_days || null,
    stripe_price_id: price.id,
    active: price.active,
    metadata: price.metadata || {}
  };
  const { data: existing } = await supabase
    .from('billing_prices')
    .select('*')
    .eq('product_id', productId)
    .eq('stripe_price_id', price.id)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from('billing_prices').update(payload).eq('id', existing.id);
    return existing.id;
  }
  const { data: ins } = await supabase.from('billing_prices').insert(payload).select('id').single();
  return ins?.id;
}

// Simple status/health endpoint
router.get('/status', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ configured: false, reason: 'STRIPE_SECRET_KEY missing' });
  try {
    const acct = await stripe.accounts.retrieve();
    return res.json({ configured: true, account: { id: acct.id, type: acct.type, email: acct.email || null } });
  } catch (e) {
    return res.status(200).json({ configured: false, reason: 'invalid_key_or_api_error', message: e?.message || String(e) });
  }
});

// Sync Stripe products and prices → DB
router.post('/sync-products', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(200).json({ ok: false, reason: 'not_configured' });
  try {
    const tenantId = await resolveTenantId();
    const products = await stripe.products.list({ limit: 100 });
    let synced = 0;
    for (const p of products.data) {
      const productId = await upsertProduct(tenantId, p);
      const prices = await stripe.prices.list({ product: p.id, limit: 100 });
      for (const pr of prices.data) {
        await upsertPrice(productId, pr);
        synced++;
      }
    }
    res.json({ ok: true, products: products.data.length, prices: synced });
  } catch (e) {
    res.status(500).json({ error: 'sync_failed', message: e?.message || String(e) });
  }
});

// Create Checkout Session
router.post('/checkout', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(200).json({ ok: false, reason: 'not_configured' });

  try {
    const { email, priceId, successUrl, cancelUrl } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'priceId_required' });
    const tenantId = await resolveTenantId();

    // Ensure or create billing customer
    let stripeCustomerId;
    if (email) {
      const { data: existing } = await supabase
        .from('billing_customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('email', email)
        .limit(1)
        .maybeSingle();
      if (existing?.stripe_customer_id) {
        stripeCustomerId = existing.stripe_customer_id;
      } else {
        const sc = await stripe.customers.create({ email });
        stripeCustomerId = sc.id;
        await supabase.from('billing_customers').insert({ tenant_id: tenantId, email, name: email, stripe_customer_id: sc.id });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || 'http://localhost:5173/?checkout=success',
      cancel_url: cancelUrl || 'http://localhost:5173/?checkout=cancel',
      allow_promotion_codes: true,
    });
    return res.json({ ok: true, url: session.url });
  } catch (e) {
    return res.status(500).json({ error: 'checkout_failed', message: e?.message || String(e) });
  }
});

// Billing portal session
router.post('/portal', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(200).json({ ok: false, reason: 'not_configured' });
  try {
    const { email, returnUrl } = req.body || {};
    const tenantId = await resolveTenantId();
    if (!email) return res.status(400).json({ error: 'email_required' });
    const { data: existing, error } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing?.stripe_customer_id) return res.status(404).json({ error: 'not_found' });
    const ps = await stripe.billingPortal.sessions.create({
      customer: existing.stripe_customer_id,
      return_url: returnUrl || 'http://localhost:5173/',
    });
    return res.json({ ok: true, url: ps.url });
  } catch (e) {
    return res.status(500).json({ error: 'portal_failed', message: e?.message || String(e) });
  }
});

// Webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(200).send('[ok] not configured');
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  let event;
  try {
    if (!endpointSecret) {
      event = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'product.created':
      case 'product.updated': {
        const p = event.data.object;
        const tenantId = await resolveTenantId();
        await upsertProduct(tenantId, p);
        break;
      }
      case 'price.created':
      case 'price.updated': {
        const pr = event.data.object;
        const tenantId = await resolveTenantId();
        // Need product row id first
        const { data: prod } = await supabase
          .from('billing_products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('stripe_product_id', pr.product)
          .limit(1)
          .maybeSingle();
        if (prod?.id) await upsertPrice(prod.id, pr);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        try {
          const tenantId = await resolveTenantId();
          const customerEmail = session.customer_details?.email || null;
          const stripeCustomerId = session.customer || null;
          const stripeSubscriptionId = session.subscription || null;

          // Ensure billing_customer
          let customerRowId = null;
          if (customerEmail || stripeCustomerId) {
            const { data: existing } = await supabase
              .from('billing_customers')
              .select('id')
              .eq('tenant_id', tenantId)
              .or(`email.eq.${customerEmail || ''},stripe_customer_id.eq.${stripeCustomerId || ''}`)
              .limit(1)
              .maybeSingle();
            if (existing?.id) customerRowId = existing.id;
            else {
              const { data: ins } = await supabase
                .from('billing_customers')
                .insert({ tenant_id: tenantId, email: customerEmail, name: customerEmail, stripe_customer_id: stripeCustomerId })
                .select('id')
                .single();
              customerRowId = ins?.id || null;
            }
          }

          if (stripeSubscriptionId && customerRowId) {
            // Upsert subscription row
            const { data: subExisting } = await supabase
              .from('billing_subscriptions')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('stripe_subscription_id', stripeSubscriptionId)
              .limit(1)
              .maybeSingle();
            const payload = {
              tenant_id: tenantId,
              customer_id: customerRowId,
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              current_period_start: new Date().toISOString()
            };
            if (subExisting?.id) await supabase.from('billing_subscriptions').update(payload).eq('id', subExisting.id);
            else await supabase.from('billing_subscriptions').insert(payload);
          }
        } catch (_) {}
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        try {
          const tenantId = await resolveTenantId();
          // Upsert invoice
          const { data: invExisting } = await supabase
            .from('billing_invoices')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('stripe_invoice_id', inv.id)
            .limit(1)
            .maybeSingle();
          const invoicePayload = {
            tenant_id: tenantId,
            invoice_number: inv.number || null,
            currency: inv.currency?.toUpperCase() || 'USD',
            subtotal: (inv.subtotal || 0) / 100,
            tax_total: (inv.tax || 0) / 100,
            total: (inv.total || 0) / 100,
            status: 'paid',
            due_date: inv.due_date ? new Date(inv.due_date) : null,
            issued_at: inv.created ? new Date(inv.created * 1000) : null,
            stripe_invoice_id: inv.id,
          };
          let invoiceId = invExisting?.id;
          if (invoiceId) await supabase.from('billing_invoices').update(invoicePayload).eq('id', invoiceId);
          else {
            const { data: ins } = await supabase.from('billing_invoices').insert(invoicePayload).select('id').single();
            invoiceId = ins?.id;
          }

          // Insert payment
          const payPayload = {
            invoice_id: invoiceId,
            amount: (inv.amount_paid || inv.total || 0) / 100,
            status: 'succeeded',
            paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : new Date().toISOString(),
            stripe_payment_intent_id: inv.payment_intent || null
          };
          await supabase.from('billing_payments').insert(payPayload);
        } catch (_) {}
        break;
      }
      case 'invoice.payment_failed': {
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).json({ error: 'webhook_handler_failed', message: e?.message || String(e) });
  }
});

export default router;

