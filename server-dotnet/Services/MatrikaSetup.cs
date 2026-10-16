using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Dapper;
namespace Matrika.Api.Services;
public static class MatrikaSetup
{
 public static async Task Run(IServiceProvider services,IConfiguration config)
 {
  var db=services.GetRequiredService<IDbService>();var encryption=services.GetRequiredService<IEncryptionService>();
  var password=config["Matrika:AdminPassword"];
  if(string.IsNullOrEmpty(password)||password.Length<8||System.Text.Encoding.UTF8.GetByteCount(password)>72)throw new ArgumentException("Set Matrika__AdminPassword (8+ characters; maximum 72 UTF-8 bytes).");
  var entityFilter=config["Matrika:EntityId"];var userFilter=config["Matrika:AdminUserId"];
  var admins=(await db.QueryAsync<dynamic>("SELECT u.entity_id,u.user_id FROM users u JOIN roles r USING(entity_id,role_id) WHERE r.is_superadmin=1 AND (@entityFilter IS NULL OR u.entity_id=@entityFilter) AND (@userFilter IS NULL OR u.user_id=@userFilter)",new{entityFilter,userFilter})).ToList();
  if(admins.Count!=1)throw new InvalidOperationException("Select exactly one existing superadmin with Matrika__EntityId and Matrika__AdminUserId. No accounts were changed.");
  long entityId=admins[0].entity_id;long userId=admins[0].user_id;
  var email=(config["Matrika:AdminEmail"]??"matrika843@gmail.com").Trim().ToLowerInvariant();
  if(!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))throw new ArgumentException("Invalid admin email.");
  if(await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM users WHERE LOWER(TRIM(user_name))=@email AND NOT(entity_id=@entityId AND user_id=@userId)",new{email,entityId,userId})>0)throw new InvalidOperationException("Admin email already assigned.");
  foreach(var statement in (await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,"Migrations","001_customer_portal.sql"))).Split(';',StringSplitOptions.RemoveEmptyEntries))if(!string.IsNullOrWhiteSpace(statement))await db.ExecuteAsync(statement);
  await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
  await c.ExecuteAsync("UPDATE users SET user_name=@email,full_name=@name,user_password=@hash,user_active=1 WHERE entity_id=@entityId AND user_id=@userId",new{email,name=encryption.Encrypt("Matrika"),hash=BCrypt.Net.BCrypt.HashPassword(password),entityId,userId},tx);
  await c.ExecuteAsync("UPDATE entity SET name='Matrika Technology Bangalore',short_desc='Matrika',address=@address,email=@email,default_home_page='/' WHERE entity_id=@entityId",new{address=encryption.Encrypt("Bangalore"),email=encryption.Encrypt(email),entityId},tx);
  var imageColumns=await c.QueryAsync<string>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entity' AND COLUMN_NAME IN ('imageFile','entity_image')",transaction:tx);
  foreach(var column in imageColumns)await c.ExecuteAsync($"UPDATE entity SET `{column}`=NULL WHERE entity_id=@entityId",new{entityId},tx);
  await c.ExecuteAsync("UPDATE session SET log_type='LO',logout_time=NOW() WHERE entity_id=@entityId AND user_id=@userId AND logout_time IS NULL",new{entityId,userId},tx);
  var pageSql=await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,"Migrations","002_page_master.sql"));
  foreach(var statement in pageSql.Split(';',StringSplitOptions.RemoveEmptyEntries))
   if(!string.IsNullOrWhiteSpace(statement)) await c.ExecuteAsync(statement,new{seedUserId=userId},tx);
  var reportsSql=await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,"Migrations","003_reports_page.sql"));
  foreach(var statement in reportsSql.Split(';',StringSplitOptions.RemoveEmptyEntries))
   if(!string.IsNullOrWhiteSpace(statement)) await c.ExecuteAsync(statement,transaction:tx);
  await tx.CommitAsync();var settings=services.GetRequiredService<IGeneralSettingsRepository>();await settings.GetAllAsync();
  foreach(var pair in new Dictionary<string,string?>{{"page_title","Matrika CRM"},{"pwa_name","Matrika CRM"},{"pwa_short_name","Matrika"},{"pwa_logo",null},{"login_image",null},{"pwa_theme_color","#0d0b12"},{"pwa_background_color","#0d0b12"}})await settings.UpsertSettingAsync(pair.Key,pair.Value);
  Console.WriteLine("Matrika setup completed: selected admin and entity updated; portal tables ready.");
 }
}
