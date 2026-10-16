// Opt-in checks against an isolated local database, never production.
const assert = require('node:assert/strict');
const { chromium } = require('../client/node_modules/playwright');
const base = process.env.MATRIKA_TEST_API || 'http://127.0.0.1:5007';
const email = process.env.Matrika__AdminEmail || 'matrika843@gmail.com';
const password = process.env.Matrika__AdminPassword;
if (!password) throw new Error('Set Matrika__AdminPassword for the local test account.');
let token;
async function api(path, method='GET', body, auth=token) {
 const form = path === '/user' && method === 'POST' ? new FormData() : null;
 if(form)form.append('data',JSON.stringify(body));
 const r = await fetch(base+path, { method, headers:{...(!form?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+auth}:{}),'entity_id':'1'},body:form || (body?JSON.stringify(body):undefined) });
 const text=await r.text(); let json; try{json=JSON.parse(text);}catch{json={message:text}}
 assert(r.ok && json.success!==false, `${method} ${path}: ${r.status} ${json.message}`);
 return json.data;
}
(async()=>{
 const session=await api('/user/login','POST',{email,password}); token=session.token;
 assert.equal(session.user.is_superadmin,1);console.log('PASS real superadmin email/password login');
 for(const route of ['/entity','/branch','/role','/user','/page','/crm/stats','/crm/customers','/crm/leads','/crm/deals','/crm/activities','/crm/support/accounts','/crm/support/tickets']){ await api(route);console.log('PASS '+route); }
 const pages=await api('/page');for(const path of ['/', '/crm/leads','/crm/customers','/crm/deals','/crm/activities','/crm/support','/entity','/branch','/roles','/users','/designation','/pages','/profile','/changePassword'])assert(pages.some(p=>p.page_name===path),'Missing Page Master URL '+path);console.log('PASS all 14 staff routes appear in Page Master');
 const entities=await api('/entity');const entity=entities[0];assert(!('s3_secret_access_key' in entity));assert(!('entityImage' in entity));
 await api('/entity','PUT',entity);console.log('PASS entity JSON update, private integration fields excluded');

 if (process.env.MATRIKA_TEST_WRITES === '1') {
  const pageAdd=await api('/page','POST',{page_name:'/integration-page',name:'Integration page',description:'Test page',superadmin_only:1,access_for_all:0,offline_enabled:0,extra_actions:[{action_name:'Review',action_desc:'Review record'}]});
  let pageRows=await api('/page');let integration=pageRows.find(p=>p.page_name==='/integration-page');assert(integration?.extra_actions?.some(a=>a.action_name==='Review'));
  await api('/page','PUT',{page_id:integration.page_id,page_name:'/integration-page',name:'Integration revised',description:'Test page',superadmin_only:1,access_for_all:0,offline_enabled:0,extra_actions:[]});
  pageRows=await api('/page');assert.equal(pageRows.find(p=>p.page_name==='/integration-page').name,'Integration revised');
  await api('/page/'+integration.page_id,'DELETE');console.log('PASS Page Master create, action, edit, remove and reload');
  const support=pages.find(p=>p.page_name==='/crm/support');
  const role=await api('/role','POST',{role_name:'Integration support',is_staff:1,is_admin:0,is_superadmin:0,page_access:[{page_id:support.page_id,access_to_update:1}],extra_actions:[],branch_access:[1]});
  const roles=await api('/role');const saved=roles.find(r=>r.role_id===role.role_id);assert.equal(saved.page_access[0].access_to_update,1);assert.deepEqual(saved.branch_access,[1]);
  await api('/user','POST',{user_name:'integration-staff@example.test',user_password:'integration-password',full_name:'Integration staff',role_id:role.role_id,user_active:1,branch_id:1});
  const staff=await api('/user/login','POST',{email:'integration-staff@example.test',password:'integration-password'});
  await api('/crm/support/tickets','GET',undefined,staff.token);
  const forbidden=await fetch(base+'/entity',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+staff.token},body:JSON.stringify(entity)});assert.equal(forbidden.status,403);
  console.log('PASS persisted role permissions, new staff email login, support access and entity write denial');
  const customer=await api('/crm/customers','POST',{company_name:'Integration customer',contact_name:'Integration contact',email:'integration-customer@example.test',status:'Active'});
  await api('/crm/support/access/'+customer.customer_id,'PUT',{email:'integration-customer@example.test',password:'integration-password',active:true});
  const portal=await api('/portal/login','POST',{email:'integration-customer@example.test',password:'integration-password'});
  const ticket=await api('/portal/tickets','POST',{subject:'Integration request',message:'Please help',priority:'Normal'},portal.token);
  await api('/portal/tickets/'+ticket.ticket_id+'/messages','POST',{message:'More details'},portal.token);
  await api('/crm/support/tickets/'+ticket.ticket_id+'/messages','POST',{message:'We can help'},staff.token);
  await api('/crm/support/tickets/'+ticket.ticket_id,'PATCH',{status:'Resolved'},staff.token);
  const tickets=await api('/portal/tickets','GET',undefined,portal.token);assert.equal(tickets[0].status,'Resolved');
  await api('/crm/support/access/'+customer.customer_id,'DELETE');
  const revoked=await fetch(base+'/portal/overview',{headers:{Authorization:'Bearer '+portal.token}});assert.equal(revoked.status,401);
  console.log('PASS real customer access, ticket creation, replies, staff resolution and revocation');
 }
 let browser;
 try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('http://127.0.0.1:5173/');
  for (const route of ['/','/entity','/crm/support','/users']) {
    await page.goto('http://127.0.0.1:5173'+route);await page.waitForTimeout(600);
    assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
    assert(!/\bACT\b|arisecraft|santekatte/i.test(await page.locator('body').innerText()));
  }
  await page.goto('http://127.0.0.1:5173/entity');await page.getByRole('button',{name:'Add entity',exact:true}).click();
  assert.equal(await page.locator('.entity-fields input').count(),6);
  await page.screenshot({path:'/tmp/matrika-entity-live.png',fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS actual browser login, dashboard, entity form, users and support');
 } finally { await browser?.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
