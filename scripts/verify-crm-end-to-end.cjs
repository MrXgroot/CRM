const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

// Load .env safely without printing secrets
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const baseApi = process.env.MATRIKA_TEST_API || 'http://127.0.0.1:5007';
const baseWeb = process.env.MATRIKA_TEST_WEB || 'http://127.0.0.1:5173';
const email = process.env.Matrika__AdminEmail || 'matrika843@gmail.com';
const password = process.env.Matrika__AdminPassword;

if (!password) {
  console.error('ERROR: Matrika__AdminPassword not configured in .env or environment.');
  process.exit(1);
}

let staffToken = '';

async function api(endpoint, method = 'GET', body = null, token = staffToken) {
  const headers = {
    'entity_id': '1',
    'branch_id': '1',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(baseApi + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!res.ok || json.success === false) {
    throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${json.message || text}`);
  }
  return json.data;
}

async function run() {
  console.log('--- Step 1: Authenticate with Local Superadmin ---');
  const session = await api('/user/login', 'POST', { email, password });
  staffToken = session.token;
  assert(staffToken, 'Expected staff JWT token');
  console.log('PASS: Logged in successfully. User ID:', session.user.user_id);

  console.log('\n--- Step 2: Verify Dashboard Statistics Scoped to Entity 1, Branch 1 ---');
  const stats = await api('/crm/stats');
  console.log('Fetched CRM Stats:', JSON.stringify(stats, null, 2));

  assert.equal(Number(stats.total_leads), 6, 'Total leads should be 6');
  assert.equal(Number(stats.qualified_leads), 2, 'Qualified leads should be 2');
  assert.equal(Number(stats.total_customers), 5, 'Total customers should be 5');
  assert.equal(Number(stats.active_customers), 4, 'Active customers should be 4');
  assert.equal(Number(stats.total_deals), 6, 'Total deals should be 6');
  assert.equal(Number(stats.won_deals), 2, 'Won deals should be 2');
  assert.equal(Number(stats.pipeline_value), 1000000, 'Pipeline value should be 1,000,000');
  assert.equal(Number(stats.total_revenue), 1450000, 'Total revenue should be 1,450,000');
  assert.equal(Number(stats.pending_activities), 3, 'Pending activities should be 3');
  console.log('PASS: Dashboard metrics match seeded values precisely.');

  console.log('\n--- Step 3: Verify Decryption & Details on CRM Endpoints ---');
  // Customers
  const customers = await api('/crm/customers');
  assert.equal(customers.length, 5, 'Should have 5 demo customers');
  for (const c of customers) {
    if (c.assigned_user_name) {
      assert(!c.assigned_user_name.startsWith('ENC:'), `User name should be decrypted, got ${c.assigned_user_name}`);
    }
  }
  console.log('PASS: 5 customers fetched, user names decrypted properly.');

  // Leads
  const leads = await api('/crm/leads');
  assert.equal(leads.length, 6, 'Should have 6 demo leads');
  for (const l of leads) {
    if (l.assigned_user_name) {
      assert(!l.assigned_user_name.startsWith('ENC:'), `Lead assigned user name should be decrypted, got ${l.assigned_user_name}`);
    }
  }
  console.log('PASS: 6 leads fetched, user names decrypted properly.');

  // Deals
  const deals = await api('/crm/deals');
  assert.equal(deals.length, 6, 'Should have 6 demo deals');
  for (const d of deals) {
    if (d.assigned_user_name) {
      assert(!d.assigned_user_name.startsWith('ENC:'), `Deal assigned user name should be decrypted, got ${d.assigned_user_name}`);
    }
  }
  console.log('PASS: 6 deals fetched, user names decrypted properly.');

  // Activities
  const activities = await api('/crm/activities');
  assert.equal(activities.length, 6, 'Should have 6 demo activities');
  for (const a of activities) {
    if (a.assigned_user_name) {
      assert(!a.assigned_user_name.startsWith('ENC:'), `Activity assigned user name should be decrypted, got ${a.assigned_user_name}`);
    }
  }
  console.log('PASS: 6 activities fetched, user names decrypted properly.');

  // Reports
  const reports = await api('/crm/reports');
  assert(reports, 'Reports endpoint should return data');
  console.log('PASS: Reports endpoint functional.');

  console.log('\n--- Step 4: Verify CRUD & Lead Conversion Flow ---');
  // 1. Create a lead
  const testLead = await api('/crm/leads', 'POST', {
    first_name: 'E2E',
    last_name: 'Test Lead',
    company: 'E2E Testing Ventures',
    email: 'test.lead@e2e-testing.test',
    phone: '9876543210',
    status: 'Qualified',
    lead_source: 'Website',
    estimated_value: 75000,
    notes: 'Created via automated E2E test',
  });
  console.log('Created test lead ID:', testLead.lead_id);
  assert(testLead.lead_id, 'Lead ID should be returned');

  // 2. Convert lead to customer & deal
  const convertRes = await api(`/crm/leads/${testLead.lead_id}/convert`, 'POST', {});
  console.log('Converted lead result:', convertRes);
  const testCustId = convertRes.customer_id;
  const testDealId = convertRes.deal_id;
  assert(testCustId, 'Customer ID should be returned after conversion');
  assert(testDealId, 'Deal ID should be returned after conversion');

  // Verify converted customer branch
  const custDetails = await api(`/crm/customers/${testCustId}`);
  assert.equal(custDetails.branch_id, 1, 'Converted customer should preserve branch_id 1');

  // 3. Update deal stage to Won and check revenue sync
  await api(`/crm/deals/${testDealId}/stage`, 'POST', {
    stage: 'Won',
  });
  const updatedCust = await api(`/crm/customers/${testCustId}`);
  assert.equal(Number(updatedCust.total_revenue), 75000, 'Customer revenue should sync to 75000 on Won deal');
  console.log('PASS: Deal stage moved to Won and customer revenue automatically synced.');

  // 4. Create an activity
  const testAct = await api('/crm/activities', 'POST', {
    title: 'E2E Follow-up Call',
    activity_type: 'Call',
    status: 'Pending',
    priority: 'High',
    due_date: '2026-10-25 15:00:00',
    related_to_type: 'customer',
    related_to_id: testCustId,
    notes: 'Follow up call with customer',
  });
  console.log('Created test activity ID:', testAct.activity_id);

  // 5. Complete activity
  await api(`/crm/activities/${testAct.activity_id}/status`, 'POST', { status: 'Completed' });
  const actList = await api(`/crm/activities?related_to_type=customer&related_to_id=${testCustId}`);
  const updatedAct = actList.find(a => a.activity_id === testAct.activity_id);
  assert(updatedAct, 'Activity should be found in list');
  assert.equal(updatedAct.status, 'Completed', 'Activity status should be Completed');
  console.log('PASS: Activity created and marked completed.');

  // 6. Clean up the test records
  await api(`/crm/activities/${testAct.activity_id}`, 'DELETE');
  await api(`/crm/deals/${testDealId}`, 'DELETE');
  await api(`/crm/customers/${testCustId}`, 'DELETE');
  await api(`/crm/leads/${testLead.lead_id}`, 'DELETE');
  console.log('PASS: Test CRUD records deleted and cleaned up.');

  // Verify dashboard stats are restored to initial seeded values
  const statsAfter = await api('/crm/stats');
  assert.equal(Number(statsAfter.total_leads), 6, 'Total leads restored to 6');
  assert.equal(Number(statsAfter.total_customers), 5, 'Total customers restored to 5');
  assert.equal(Number(statsAfter.total_deals), 6, 'Total deals restored to 6');
  console.log('PASS: Dashboard metrics restored cleanly after cleanup.');

  console.log('\n--- Step 5: Verify Frontend UI with Headless Browser ---');
  const { chromium } = require('../client/node_modules/playwright');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 1. Login to UI
    await page.goto(`${baseWeb}/login`);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`${baseWeb}/`);

    // 2. Verify Dashboard View
    await page.waitForSelector('text=RELATIONSHIP OVERVIEW', { timeout: 10000 });
    const bodyText = await page.locator('body').innerText();
    assert(!bodyText.includes('ENC:'), 'UI Dashboard should not contain ENC: ciphertext');
    console.log('PASS: Dashboard loaded in browser without errors or ciphertext.');

    // 3. Customers Page
    await page.goto(`${baseWeb}/crm/customers`);
    await page.waitForSelector('text=[Demo] Acme Cloud Solutions', { timeout: 10000 });
    const custPageText = await page.locator('body').innerText();
    assert(!custPageText.includes('ENC:'), 'Customers page should not contain ENC: ciphertext');
    console.log('PASS: Customers page displays seeded data.');

    // 4. Leads Page
    await page.goto(`${baseWeb}/crm/leads`);
    await page.waitForSelector('text=[Demo] Radiant Infotech', { timeout: 10000 });
    const leadPageText = await page.locator('body').innerText();
    assert(!leadPageText.includes('ENC:'), 'Leads page should not contain ENC: ciphertext');
    console.log('PASS: Leads page displays seeded data.');

    // 5. Deals Page
    await page.goto(`${baseWeb}/crm/deals`);
    await page.waitForSelector('text=[Demo] Cloud Migration Suite', { timeout: 10000 });
    console.log('PASS: Deals page displays seeded deals.');

    // 6. Activities Page
    await page.goto(`${baseWeb}/crm/activities`);
    await page.waitForSelector('text=[Demo] Review Cloud Architecture Specs', { timeout: 10000 });
    console.log('PASS: Activities page displays seeded activities.');

    // 7. Reports Page
    await page.goto(`${baseWeb}/crm/reports`);
    await page.waitForSelector('text=Reports & insights', { timeout: 10000 });
    console.log('PASS: Reports page rendered successfully.');

    // 8. Customer Portal Login Check
    const portalPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    portalPage.on('pageerror', err => errors.push(err.message));
    await portalPage.goto(`${baseWeb}/customer/login`);
    await portalPage.getByLabel('Email address').fill('demo.customer1@example.test');
    await portalPage.getByLabel('Password', { exact: true }).fill('Password123!');
    await portalPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await portalPage.waitForURL(`${baseWeb}/portal`, { timeout: 10000 });
    await portalPage.waitForSelector('text=[Demo] Acme Cloud Solutions', { timeout: 10000 });
    const portalBody = await portalPage.locator('body').innerText();
    assert(portalBody.includes('[Demo] Acme Cloud Solutions'), 'Portal should show customer company name');
    assert(portalBody.includes('[Demo] API Rate Limiting Inquiry'), 'Portal should show support tickets');
    console.log('PASS: Customer portal login, overview, and support verified.');

    assert.equal(errors.length, 0, `Page errors encountered: ${errors.join('; ')}`);
    console.log('\n>>> ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY! <<<');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('\nFAILURE during verification:', err);
  process.exit(1);
});
