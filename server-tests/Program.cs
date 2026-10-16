using System.Data;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.RegularExpressions;
using Matrika.Api.Common;
using Matrika.Api.Controllers;
using Matrika.Api.Models;
using Matrika.Api.Repositories;
using Matrika.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

int passed=0;
void Assert(bool condition,string name){if(!condition)throw new Exception("FAIL: "+name);Console.WriteLine("PASS: "+name);passed++;}
PortalController Portal(FakeDb db){var p=new PortalController(db){ControllerContext=new ControllerContext{HttpContext=new DefaultHttpContext()}};p.Request.Headers.Authorization="Bearer test-token";return p;}
SupportController Support(FakeDb db,bool admin=false){var c=new DefaultHttpContext();c.User=new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim("entity_id","10"),new Claim("role_id","3"),new Claim("is_admin",admin?"1":"0")},"test"));c.Request.Headers["entity_id"]="10";return new SupportController(db){ControllerContext=new ControllerContext{HttpContext=c}};}
var unauth=new FakeDb();Assert(await Portal(unauth).Overview() is UnauthorizedResult,"Anonymous customer cannot read overview");
Assert(await Portal(unauth).Tickets() is UnauthorizedResult,"Anonymous customer cannot list tickets");
var db=new FakeDb{Identity=new(1,10,7),Owned=0};
Assert(await Portal(db).Messages(999) is NotFoundResult,"Customer cannot read another customer's ticket");
Assert(!db.Queries.Any(q=>q.Contains("FROM crm_support_messages")),"Denied ticket reads do not query messages");
Assert(await Portal(db).Reply(999,new TicketReply("hello")) is NotFoundResult,"Customer cannot reply to another customer's ticket");
Assert(db.Writes.Count==0,"Cross-customer reply writes nothing");
db.Owned=1;Assert(await Portal(db).CreateTicket(new NewTicket("Question","hello","Invalid")) is BadRequestObjectResult,"Invalid priorities rejected before writing");
Assert(await Portal(db).CreateTicket(new NewTicket(" ","hello")) is BadRequestObjectResult,"Blank subjects rejected");
await Portal(db).Overview();Assert(db.Queries.Any(q=>q.Contains("crm_deals WHERE entity_id=@EntityId AND customer_id=@CustomerId")),"Deal progress scoped to authenticated entity and customer");
Assert(!db.Queries.Any(q=>q.Contains("SELECT * FROM crm_deals")),"Customer deal response excludes internal notes");
var staffDb=new FakeDb();Assert(await Support(staffDb).Access(7,new PortalAccess("customer@example.com","password123")) is StatusCodeResult{StatusCode:403},"Non-admin cannot provision customer access");
Assert(await Support(staffDb).Revoke(7) is StatusCodeResult{StatusCode:403},"Non-admin cannot revoke customer access");
Assert(await Support(staffDb).Tickets() is StatusCodeResult{StatusCode:403},"Staff without support permission cannot read inbox");
Assert(await Support(staffDb,true).Messages(999) is NotFoundResult,"Admin cannot read a ticket outside selected entity");
var login=JsonSerializer.Deserialize<LoginRequest>("{\"email\":\"hello@example.com\",\"password\":\"test\"}");Assert(login?.Email=="hello@example.com","Login payload binds email");
var invalidLogin=new LoginRequest{Email="username",Password="test"};Assert(!Validator.TryValidateObject(invalidLogin,new ValidationContext(invalidLogin),new List<ValidationResult>(),true),"Username-only login rejected");
var userDb=new FakeDb();var repo=new UserRepository(userDb,new FakeTokens(),new FakeEncryption(),NullLogger<UserRepository>.Instance);
var payload=JsonSerializer.Deserialize<Dictionary<string,object?>>("{\"user_name\":\"NEW@EXAMPLE.COM\",\"user_password\":\"test-password123\",\"full_name\":\"Name\",\"role_id\":3}")!;
await repo.AddUserAsync(payload,10,1);Assert((string)userDb.Inserted!["user_name"]! == "new@example.com","New user email normalized");Assert(BCrypt.Net.BCrypt.Verify("test-password123",(string)userDb.Inserted["user_password"]!),"JSON passwords are hashed before persistence");

// ================= PRODUCTION BOOTSTRAP TESTS =================
var env = new FakeHostEnv();
var fakeSp = new FakeServiceProvider(new FakeDb(), new FakeEncryption());

// 1. Refusal when confirmation flag is omitted
bool threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Matrika:AdminPassword"] = "SuperSecureProdPassword2026!",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (InvalidOperationException ex) when (ex.Message.Contains("explicit confirmation")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when confirmation flag is omitted");

// 2. Refusal when admin password is missing
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (ArgumentException ex) when (ex.Message.Contains("Missing admin password")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when admin password is missing");

// 3. Refusal when admin password is too short (< 8 chars)
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["Matrika:AdminPassword"] = "short",
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (ArgumentException ex) when (ex.Message.Contains("at least 8 characters")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when admin password is too short (< 8 chars)");

// 4. Refusal when admin password exceeds 72 UTF-8 bytes
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["Matrika:AdminPassword"] = new string('A', 73),
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (ArgumentException ex) when (ex.Message.Contains("at most 72 UTF-8 bytes")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when admin password exceeds 72 bytes");

// 5. Refusal when admin password is a common placeholder
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["Matrika:AdminPassword"] = "password123!",
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (ArgumentException ex) when (ex.Message.Contains("too common or a placeholder")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when admin password is weak placeholder");

// 6. Refusal when JWT key is < 32 bytes
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["Matrika:AdminPassword"] = "SuperSecureProdPassword2026!",
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "short-key-16-bytes",
        ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (InvalidOperationException ex) when (ex.Message.Contains("Jwt__Key") && ex.Message.Contains("32 bytes")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when JWT key is < 32 bytes");

// 7. Refusal when encryption key is not 64-hex string
threw = false;
try {
    var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Matrika:ConfirmProductionBootstrap"] = "true",
        ["Matrika:AdminPassword"] = "SuperSecureProdPassword2026!",
        ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=matrika_crm;User=root;Password=;",
        ["Jwt:Key"] = "12345678901234567890123456789012",
        ["Security:EncryptionKeyHex"] = "invalid-hex-key"
    }).Build();
    await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
} catch (InvalidOperationException ex) when (ex.Message.Contains("Security__EncryptionKeyHex") && ex.Message.Contains("64-character hexadecimal key")) {
    threw = true;
}
Assert(threw, "Bootstrap: Refusal when encryption key is invalid hex string");

// 8. Refusal when connection string points to forbidden databases
foreach (var forbidden in new[] { "act-base", "act_base", "hms_dev", "hms-dev" })
{
    threw = false;
    try {
        var c = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Matrika:ConfirmProductionBootstrap"] = "true",
            ["Matrika:AdminPassword"] = "SuperSecureProdPassword2026!",
            ["ConnectionStrings:DefaultConnection"] = $"Server=localhost;Database={forbidden};User=root;Password=;",
            ["Jwt:Key"] = "12345678901234567890123456789012",
            ["Security:EncryptionKeyHex"] = "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"
        }).Build();
        await ProductionSetup.Run(fakeSp, c, env, Array.Empty<string>());
    } catch (InvalidOperationException ex) when (ex.Message.Contains("forbidden database name")) {
        threw = true;
    }
    Assert(threw, $"Bootstrap: Refusal when connection string points to forbidden db '{forbidden}'");
}

// 9. SQL Compatibility: Check that no migration file uses MariaDB-only 'ADD COLUMN IF NOT EXISTS'
var migrationsDir = Path.Combine(AppContext.BaseDirectory, "Migrations");
if (!Directory.Exists(migrationsDir)) migrationsDir = Path.Combine(Directory.GetCurrentDirectory(), "server-dotnet", "Migrations");
var sqlFiles = Directory.GetFiles(migrationsDir, "*.sql");
Assert(sqlFiles.Length >= 4, "Bootstrap: At least 4 migration SQL files discovered on disk");

bool hasAddColumnIfNotExists = false;
foreach (var file in sqlFiles)
{
    var content = File.ReadAllText(file);
    var sqlNoComments = Regex.Replace(content, @"--.*$", "", RegexOptions.Multiline);
    if (Regex.IsMatch(sqlNoComments, @"ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS", RegexOptions.IgnoreCase))
    {
        hasAddColumnIfNotExists = true;
        Console.WriteLine($"Found incompatible ADD COLUMN IF NOT EXISTS in: {Path.GetFileName(file)}");
    }
}
Assert(!hasAddColumnIfNotExists, "Bootstrap: Zero 'ADD COLUMN IF NOT EXISTS' in all migration files (MySQL 8.4 compatible)");

// 10. Check that session table is backticked in 000_local_schema.sql
var schemaContent = File.ReadAllText(Path.Combine(migrationsDir, "000_local_schema.sql"));
Assert(schemaContent.Contains("CREATE TABLE `session`"), "Bootstrap: Session table identifier is properly quoted for MySQL 8.4");
Assert(schemaContent.Contains("CREATE TABLE IF NOT EXISTS `general_settings`"), "Bootstrap: general_settings table defined in schema");

// 11. Check that exactly 15 pages are registered across 002 and 003
var pageSql = File.ReadAllText(Path.Combine(migrationsDir, "002_page_master.sql"));
var reportsSql = File.ReadAllText(Path.Combine(migrationsDir, "003_reports_page.sql"));
var pageMatches = Regex.Matches(pageSql + "\n" + reportsSql, @"WHERE\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+pages\s+WHERE\s+page_name\s*=\s*'([^']+)'\)");
Assert(pageMatches.Count == 15, $"Bootstrap: Exactly 15 system pages defined across 002 & 003 (found {pageMatches.Count})");

// 12. Check that no demo data is inserted in 000, 001, 002, 003
var allSql = string.Join("\n", sqlFiles.Select(File.ReadAllText));
bool hasDemoInserts = Regex.IsMatch(allSql, @"INSERT\s+INTO\s+`?crm_(customers|leads|deals|activities)`?", RegexOptions.IgnoreCase);
Assert(!hasDemoInserts, "Bootstrap: Migrations contain zero demo CRM inserts");

Console.WriteLine($"{passed} checks passed.");

sealed class FakeDb:IDbService
{
 public PortalIdentity? Identity;public int Owned;public List<string> Queries=new();public List<string> Writes=new();public Dictionary<string,object?>? Inserted;
 public MySqlConnection CreateConnection()=>throw new Exception("Unexpected transactional write in denied request");
 public Task<T?> QuerySingleOrDefaultAsync<T>(string sql,object? param=null,IDbTransaction? transaction=null){Queries.Add(sql);object? value=typeof(T)==typeof(PortalIdentity)?Identity:typeof(T)==typeof(int)?(sql.Contains("crm_support_tickets")?Owned:0):null;return Task.FromResult(value==null?default:(T)value);}
 public Task<IEnumerable<T>> QueryAsync<T>(string sql,object? param=null,IDbTransaction? transaction=null){Queries.Add(sql);return Task.FromResult(Enumerable.Empty<T>());}
 public Task<int> ExecuteAsync(string sql,object? param=null,IDbTransaction? transaction=null){Writes.Add(sql);return Task.FromResult(1);}
 public Task<long> GetIdAsync(string table,string column,IDictionary<string,object?> where)=>Task.FromResult(1L);
 public Task<int> InsertTableAsync(string table,IDictionary<string,object?> data,IEnumerable<string>? skip=null,IDbTransaction? transaction=null){Inserted=new(data);return Task.FromResult(1);}
 public Task<int> UpdateTableAsync(string table,IDictionary<string,object?> data,IDictionary<string,object?> where,IEnumerable<string>? skip=null,IDbTransaction? transaction=null)=>Task.FromResult(1);
}
sealed class FakeEncryption:IEncryptionService
{
 public string? Encrypt(string? text)=>text;public string? Decrypt(string? text)=>text;
 public T DecryptFields<T>(T data,IEnumerable<string> fields)=>data;public T EncryptFields<T>(T data,IEnumerable<string> fields)=>data;
}
sealed class FakeTokens:ITokenService
{
 public string GenerateToken(IDictionary<string,object> claims,TimeSpan? expiresIn=null)=>"test";
 public ClaimsPrincipal? ValidateToken(string token)=>null;
 public System.IdentityModel.Tokens.Jwt.JwtSecurityToken? ReadToken(string token)=>null;
}

sealed class FakeHostEnv : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Production";
    public string ApplicationName { get; set; } = "Matrika.Api";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
}

sealed class FakeServiceProvider : IServiceProvider
{
    private readonly IDbService _db;
    private readonly IEncryptionService _encryption;
    public FakeServiceProvider(IDbService db, IEncryptionService encryption)
    {
        _db = db;
        _encryption = encryption;
    }
    public object? GetService(Type serviceType)
    {
        if (serviceType == typeof(IDbService)) return _db;
        if (serviceType == typeof(IEncryptionService)) return _encryption;
        return null;
    }
}
