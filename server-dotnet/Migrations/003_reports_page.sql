-- Add the staff Reports route to Page Master on existing and fresh databases.
-- Safe to run repeatedly. Staff roles receive access through Roles and permissions.
INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
SELECT (SELECT COALESCE(MAX(page_id),0)+1 FROM pages),'/crm/reports','Reports and insights','Customer, lead, deal, activity and support analytics',0,0,0,
  COALESCE((SELECT u.user_id FROM users u JOIN roles r ON r.entity_id=u.entity_id AND r.role_id=u.role_id WHERE r.is_superadmin=1 ORDER BY u.entity_id,u.user_id LIMIT 1),0),NOW()
FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM pages WHERE page_name='/crm/reports');
