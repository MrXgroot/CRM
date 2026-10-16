using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using Matrika.Api.Common;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Matrika.Api.Controllers;

public record PortalLogin([Required, EmailAddress] string Email, [Required] string Password);
public record PortalAccess([Required, EmailAddress, MaxLength(254)] string Email, [Required, MinLength(8), MaxLength(72)] string Password, bool Active = true);
public record NewTicket([Required, MaxLength(160)] string Subject, [Required, MaxLength(10000)] string Message, string Priority = "Normal");
public record TicketReply([Required, MaxLength(10000)] string Message);
public record TicketStatus([Required] string Status);
public record PortalIdentity(long AccountId, long EntityId, long CustomerId);

[ApiController]
[Route("portal")]
public class PortalController(IDbService db) : ControllerBase
{
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private string Bearer => Request.Headers.Authorization.ToString().Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();
    private async Task<PortalIdentity?> Identity() => await db.QuerySingleOrDefaultAsync<PortalIdentity>(@"
      SELECT a.account_id AccountId, a.entity_id EntityId, a.customer_id CustomerId
      FROM crm_portal_sessions s JOIN crm_portal_accounts a ON a.account_id=s.account_id
      JOIN crm_customers c ON c.entity_id=a.entity_id AND c.customer_id=a.customer_id
      WHERE s.token_hash=@hash AND s.expires_at>UTC_TIMESTAMP() AND a.is_active=1 AND c.status<>'Inactive'", new {hash=Hash(Bearer)});

    [HttpPost("login"), EnableRateLimiting("login")]
    public async Task<IActionResult> Login(PortalLogin input)
    {
        var row = await db.QuerySingleOrDefaultAsync<dynamic>(@"SELECT a.* FROM crm_portal_accounts a
          JOIN crm_customers c ON c.entity_id=a.entity_id AND c.customer_id=a.customer_id
          WHERE a.email=@email AND a.is_active=1 AND c.status<>'Inactive'", new {email=input.Email.Trim().ToLowerInvariant()});
        if(row == null || !BCrypt.Net.BCrypt.Verify(input.Password, (string)row.password_hash))
            return Unauthorized(new ApiResponse(401, null, "Invalid email or password"));
        var token=Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        await db.ExecuteAsync("INSERT INTO crm_portal_sessions(token_hash,account_id,expires_at) VALUES(@hash,@id,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 12 HOUR))",new {hash=Hash(token),id=(long)row.account_id});
        return Ok(new ApiResponse(200,new {token}));
    }
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(){await db.ExecuteAsync("DELETE FROM crm_portal_sessions WHERE token_hash=@hash",new{hash=Hash(Bearer)});return Ok(new ApiResponse(200));}

    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var who=await Identity();if(who==null)return Unauthorized();
        var customer=await db.QuerySingleOrDefaultAsync<dynamic>("SELECT company_name,contact_name,email,phone,status FROM crm_customers WHERE entity_id=@EntityId AND customer_id=@CustomerId",who);
        // Explicit public fields only. Internal notes and staff-only activities never leave this endpoint.
        var deals=await db.QueryAsync<dynamic>("SELECT deal_id,deal_name,stage,status,amount,expected_close_date FROM crm_deals WHERE entity_id=@EntityId AND customer_id=@CustomerId ORDER BY deal_id DESC",who);
        return Ok(new ApiResponse(200,new{customer,deals}));
    }
    [HttpGet("tickets")]
    public async Task<IActionResult> Tickets(){var who=await Identity();if(who==null)return Unauthorized();return Ok(new ApiResponse(200,await db.QueryAsync<dynamic>("SELECT * FROM crm_support_tickets WHERE entity_id=@EntityId AND customer_id=@CustomerId ORDER BY updated_at DESC,ticket_id DESC",who)));}

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket(NewTicket input)
    {
        var who=await Identity();if(who==null)return Unauthorized();
        if(string.IsNullOrWhiteSpace(input.Subject)||string.IsNullOrWhiteSpace(input.Message)||!new[]{"Low","Normal","High","Urgent"}.Contains(input.Priority))return BadRequest(new ApiResponse(400,null,"Provide a subject, message and valid priority."));
        await using var connection=db.CreateConnection();await connection.OpenAsync();await using var tx=await connection.BeginTransactionAsync();
        var id=await connection.ExecuteScalarAsync<long>("INSERT INTO crm_support_tickets(entity_id,customer_id,subject,priority) VALUES(@EntityId,@CustomerId,@Subject,@Priority); SELECT LAST_INSERT_ID();",new{who.EntityId,who.CustomerId,Subject=input.Subject.Trim(),input.Priority},tx);
        await connection.ExecuteAsync("INSERT INTO crm_support_messages(ticket_id,author_type,body) VALUES(@id,'Customer',@body)",new{id,body=input.Message.Trim()},tx);await tx.CommitAsync();
        return Ok(new ApiResponse(200,new{ticket_id=id}));
    }
    [HttpGet("tickets/{id:long}/messages")]
    public async Task<IActionResult> Messages(long id)
    {
        var who=await Identity();if(who==null)return Unauthorized();
        if(!await Owns(who,id))return NotFound();
        return Ok(new ApiResponse(200,await db.QueryAsync<dynamic>("SELECT message_id,author_type,body,created_at FROM crm_support_messages WHERE ticket_id=@id ORDER BY message_id",new{id})));
    }
    [HttpPost("tickets/{id:long}/messages")]
    public async Task<IActionResult> Reply(long id,TicketReply input)
    {
        var who=await Identity();if(who==null)return Unauthorized();if(!await Owns(who,id))return NotFound();if(string.IsNullOrWhiteSpace(input.Message))return BadRequest();
        await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        await c.ExecuteAsync("INSERT INTO crm_support_messages(ticket_id,author_type,body) VALUES(@id,'Customer',@body)",new{id,body=input.Message.Trim()},tx);
        await c.ExecuteAsync("UPDATE crm_support_tickets SET status='Open',updated_at=UTC_TIMESTAMP() WHERE ticket_id=@id",new{id},tx);await tx.CommitAsync();
        return Ok(new ApiResponse(200));
    }
    private async Task<bool> Owns(PortalIdentity who,long id)=>await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM crm_support_tickets WHERE ticket_id=@id AND entity_id=@EntityId AND customer_id=@CustomerId",new{id,who.EntityId,who.CustomerId})==1;
}

[ApiController]
[Route("crm/support")]
public class SupportController(IDbService db) : ControllerBase
{
    private long EntityId=>long.Parse(Request.Headers["entity_id"].ToString());
    private async Task<bool> Allowed(bool write=false)
    {
        if(User.FindFirst("is_superadmin")?.Value=="1"||User.FindFirst("is_admin")?.Value=="1")return true;
        var roleId=User.FindFirst("role_id")?.Value;
        var permission=write?" AND pa.access_to_update=1":"";
        return await db.QuerySingleOrDefaultAsync<int>(@"SELECT COUNT(*) FROM page_access pa JOIN pages p ON p.page_id=pa.page_id
          WHERE pa.entity_id=@EntityId AND pa.role_id=@roleId AND p.page_name='/crm/support'"+permission,new{EntityId,roleId})>0;
    }
    [HttpPut("access/{customerId:long}")]
    public async Task<IActionResult> Access(long customerId,PortalAccess input)
    {
        if(User.FindFirst("is_superadmin")?.Value!="1"&&User.FindFirst("is_admin")?.Value!="1")return StatusCode(403);
        if(await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM crm_customers WHERE entity_id=@EntityId AND customer_id=@customerId",new{EntityId,customerId})!=1)return NotFound();
        var email=input.Email.Trim().ToLowerInvariant();
        var existing=await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM crm_portal_accounts WHERE email=@email AND NOT(entity_id=@EntityId AND customer_id=@customerId)",new{email,EntityId,customerId});
        if(existing>0)return Conflict(new ApiResponse(409,null,"This email already has customer access."));
        await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        var accountId=await c.ExecuteScalarAsync<long?>("SELECT account_id FROM crm_portal_accounts WHERE entity_id=@EntityId AND customer_id=@customerId FOR UPDATE",new{EntityId,customerId},tx);
        var values=new{EntityId,customerId,email,hash=BCrypt.Net.BCrypt.HashPassword(input.Password),active=input.Active?1:0,accountId};
        try {
            if(accountId.HasValue) await c.ExecuteAsync("UPDATE crm_portal_accounts SET email=@email,password_hash=@hash,is_active=@active WHERE account_id=@accountId AND entity_id=@EntityId AND customer_id=@customerId",values,tx);
            else await c.ExecuteAsync("INSERT INTO crm_portal_accounts(entity_id,customer_id,email,password_hash,is_active) VALUES(@EntityId,@customerId,@email,@hash,@active)",values,tx);
        } catch(MySqlConnector.MySqlException ex) when(ex.Number==1062) {
            await tx.RollbackAsync();return Conflict(new ApiResponse(409,null,"This email or customer already has access. Refresh and retry."));
        }
        await c.ExecuteAsync("DELETE s FROM crm_portal_sessions s JOIN crm_portal_accounts a ON a.account_id=s.account_id WHERE a.entity_id=@EntityId AND a.customer_id=@customerId",new{EntityId,customerId},tx);await tx.CommitAsync();
        return Ok(new ApiResponse(200,null,"Customer access saved. Share the credentials securely."));
    }
    [HttpDelete("access/{customerId:long}")]
    public async Task<IActionResult> Revoke(long customerId)
    {
        if(User.FindFirst("is_superadmin")?.Value!="1"&&User.FindFirst("is_admin")?.Value!="1")return StatusCode(403);
        await db.ExecuteAsync("UPDATE crm_portal_accounts SET is_active=0 WHERE entity_id=@EntityId AND customer_id=@customerId",new{EntityId,customerId});return Ok(new ApiResponse(200));
    }
    [HttpGet("accounts")]
    public async Task<IActionResult> Accounts(){if(User.FindFirst("is_superadmin")?.Value!="1"&&User.FindFirst("is_admin")?.Value!="1")return StatusCode(403);return Ok(new ApiResponse(200,await db.QueryAsync<dynamic>("SELECT c.customer_id,c.company_name,c.contact_name,c.email,a.email AS login_email,a.is_active FROM crm_customers c LEFT JOIN crm_portal_accounts a ON a.entity_id=c.entity_id AND a.customer_id=c.customer_id WHERE c.entity_id=@EntityId ORDER BY c.company_name",new{EntityId})));}
    [HttpGet("tickets")]
    public async Task<IActionResult> Tickets(){if(!await Allowed())return StatusCode(403);return Ok(new ApiResponse(200,await db.QueryAsync<dynamic>("SELECT t.*,c.company_name FROM crm_support_tickets t JOIN crm_customers c ON c.entity_id=t.entity_id AND c.customer_id=t.customer_id WHERE t.entity_id=@EntityId ORDER BY t.updated_at DESC,t.ticket_id DESC",new{EntityId})));}
    private async Task<bool> Owns(long id)=>await db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM crm_support_tickets WHERE ticket_id=@id AND entity_id=@EntityId",new{id,EntityId})==1;
    [HttpGet("tickets/{id:long}/messages")]
    public async Task<IActionResult> Messages(long id){if(!await Allowed())return StatusCode(403);if(!await Owns(id))return NotFound();return Ok(new ApiResponse(200,await db.QueryAsync<dynamic>("SELECT message_id,author_type,body,created_at FROM crm_support_messages WHERE ticket_id=@id ORDER BY message_id",new{id})));}
    [HttpPost("tickets/{id:long}/messages")]
    public async Task<IActionResult> Reply(long id,TicketReply input)
    {
        if(!await Allowed(true))return StatusCode(403);if(!await Owns(id))return NotFound();if(string.IsNullOrWhiteSpace(input.Message))return BadRequest();
        await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        await c.ExecuteAsync("INSERT INTO crm_support_messages(ticket_id,author_type,body) VALUES(@id,'Team',@body)",new{id,body=input.Message.Trim()},tx);
        await c.ExecuteAsync("UPDATE crm_support_tickets SET updated_at=UTC_TIMESTAMP(),status=CASE WHEN status='Open' THEN 'In progress' ELSE status END WHERE ticket_id=@id",new{id},tx);await tx.CommitAsync();return Ok(new ApiResponse(200));
    }
    [HttpPatch("tickets/{id:long}")]
    public async Task<IActionResult> Status(long id,TicketStatus input)
    {
        if(!await Allowed(true))return StatusCode(403);if(!await Owns(id))return NotFound();if(!new[]{"Open","In progress","Waiting for customer","Resolved","Closed"}.Contains(input.Status))return BadRequest();
        await using var c=db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        await c.ExecuteAsync("UPDATE crm_support_tickets SET status=@Status,updated_at=UTC_TIMESTAMP() WHERE ticket_id=@id AND entity_id=@EntityId",new{id,EntityId,input.Status},tx);
        await c.ExecuteAsync("INSERT INTO crm_support_messages(ticket_id,author_type,body) VALUES(@id,'System',@body)",new{id,body=$"Status changed to {input.Status}."},tx);await tx.CommitAsync();return Ok(new ApiResponse(200));
    }
}
