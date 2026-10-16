using Matrika.Api.Common;
using Dapper;
namespace Matrika.Api.Services;

// Explicitly invoked, empty-database-only setup. Normal startup never creates users.
public static class LocalSetup
{
 public static async Task Run(IServiceProvider services, IConfiguration config, IHostEnvironment env)
 {
  if (!env.IsDevelopment()) throw new InvalidOperationException("Local initialization requires the Development environment.");
  var password = config["Matrika:AdminPassword"];
  if (string.IsNullOrEmpty(password) || password.Length < 8 || System.Text.Encoding.UTF8.GetByteCount(password)>72) throw new ArgumentException("Set Matrika__AdminPassword (8+ characters, maximum 72 UTF-8 bytes).");
  var db=services.GetRequiredService<IDbService>();
  if (await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()") != 0) throw new InvalidOperationException("Local initialization requires an EMPTY database. Existing data was not changed.");
  foreach(var statement in (await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,"Migrations","000_local_schema.sql"))).Split(';',StringSplitOptions.RemoveEmptyEntries))
   if (!string.IsNullOrWhiteSpace(statement)) await db.ExecuteAsync(statement);
  await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
  await c.ExecuteAsync("INSERT INTO entity(entity_id,name,expiry_date) VALUES(1,'Matrika Technology Bangalore',DATE_ADD(CURDATE(),INTERVAL 1 YEAR))",transaction:tx);
  await c.ExecuteAsync("INSERT INTO branch(entity_id,branch_id,name) VALUES(1,1,'Bangalore')",transaction:tx);
  await c.ExecuteAsync("INSERT INTO roles(entity_id,role_id,role_name,is_superadmin,is_admin,is_staff) VALUES(1,1,'Superadmin',1,0,0)",transaction:tx);
  await c.ExecuteAsync("INSERT INTO users(entity_id,user_id,user_name,user_password,role_id,branch_id) VALUES(1,1,@email,@hash,1,1)",new{email=config["Matrika:AdminEmail"]??"matrika843@gmail.com",hash=BCrypt.Net.BCrypt.HashPassword(password)},tx);
  await tx.CommitAsync();
  await MatrikaSetup.Run(services, config);
 }
}
