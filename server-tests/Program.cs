using System.Data;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Matrika.Api.Common;
using Matrika.Api.Controllers;
using Matrika.Api.Models;
using Matrika.Api.Repositories;
using Matrika.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
