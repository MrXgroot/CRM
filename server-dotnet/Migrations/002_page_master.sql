-- Staff routes registered by the React application. Safe to run repeatedly.
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/','CRM overview','CRM dashboard',0,1,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/leads','Leads','Lead management',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/leads');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/customers','Customers','Customer relationships',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/customers');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/deals','Deals and pipeline','Sales pipeline',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/deals');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/activities','Activities','CRM tasks and follow-ups',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/activities');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/support','Customer support','Customer access and support inbox',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/support');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/entity','Entities','Business identity',1,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/entity');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/branch','Branches','Branches',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/branch');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/roles','Roles and permissions','Team access control',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/roles');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/users','Users','Team accounts',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/users');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/designation','Designations','Team designations',0,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/designation');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/pages','Pages master','Page URLs and access settings',1,0,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/pages');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/profile','My profile','Account information',0,1,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/profile');
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/changePassword','Change password','Account security',0,1,0,@seedUserId,NOW() FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/changePassword');
