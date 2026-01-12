import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';
import { FuzzyMatcher } from './subscription-tracker/services/reconciliation/fuzzyMatcher.js';

loadEnv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fuzzyMatcher = new FuzzyMatcher({ vendorThreshold: 0.7, amountTolerance: 0.05, dateDaysWindow: 14, minConfidence: 0.6 });

// Get one Apple document
const { data: docs } = await supabase
  .from('email_financial_documents')
  .select('*')
  .eq('vendor', 'Apple')
  .limit(1);

const doc = docs[0];

console.log('Document:', {
  vendor: doc.vendor,
  amount: doc.amount,
  transaction_date: doc.transaction_date,
  date_type: typeof doc.transaction_date
});

// Create mock Xero transaction
const xeroTxn = {
  BankTransactionID: 'test-123',
  Contact: { Name: 'Apple' },
  Total: doc.amount,
  Date: doc.transaction_date + 'T00:00:00',  // Same date
  Reference: ''
};

console.log('\nXero Transaction:', {
  contact: xeroTxn.Contact.Name,
  amount: xeroTxn.Total,
  date: xeroTxn.Date,
  date_type: typeof xeroTxn.Date
});

// Transform like we do in reconcile-direct.js
const receipt = {
  ...doc,
  vendor: doc.vendor,
  amount: doc.amount,
  receipt_date: doc.transaction_date,
  date: doc.transaction_date
};

const transaction = {
  transaction_id: xeroTxn.BankTransactionID,
  contact_name: xeroTxn.Contact.Name,
  amount: parseFloat(xeroTxn.Total),
  date: xeroTxn.Date,
  reference: xeroTxn.Reference || ''
};

console.log('\nTransformed receipt:', {
  vendor: receipt.vendor,
  amount: receipt.amount,
  receipt_date: receipt.receipt_date,
  date: receipt.date
});

console.log('\nTransformed transaction:', {
  contact_name: transaction.contact_name,
  amount: transaction.amount,
  date: transaction.date
});

// Now try matching
const match = fuzzyMatcher.matchReceiptToTransaction(receipt, [transaction]);

console.log('\nMatch result:', {
  matched: match.matched,
  confidence: match.confidence,
  breakdown: match.breakdown
});
