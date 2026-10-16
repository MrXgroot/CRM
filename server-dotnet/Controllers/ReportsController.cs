using Dapper;
using Matrika.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("crm/reports")]
public class ReportsController(IDbService db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var start = (from ?? DateTime.UtcNow.Date.AddMonths(-11).AddDays(1 - DateTime.UtcNow.Day)).Date;
        var end = (to ?? DateTime.UtcNow.Date).Date;
        if (start > end || end >= DateTime.MaxValue.Date || end > DateTime.UtcNow.Date || end > start.AddMonths(24))
            return BadRequest(new ApiResponse(400, new { }, "Choose a valid date range of up to 24 months ending today or earlier."));

        var entityId = long.Parse(Request.Headers["entity_id"]!);
        var userId = long.Parse(User.FindFirst("user_id")!.Value);
        long? branchId = long.TryParse(Request.Headers["branch_id"], out var branch) && branch > 0 ? branch : null;
        var isSuperadmin = User.FindFirst("is_superadmin")?.Value == "1";
        var identityEntityId = isSuperadmin ? long.Parse(User.FindFirst("entity_id")!.Value) : entityId;
        await using var connection = db.CreateConnection();
        await connection.OpenAsync();
        var role = await connection.QuerySingleOrDefaultAsync<(long RoleId, int IsAdmin)>(
            "SELECT u.role_id AS RoleId, r.is_admin AS IsAdmin FROM users u JOIN roles r ON r.entity_id=u.entity_id AND r.role_id=u.role_id WHERE u.entity_id=@entityId AND u.user_id=@userId AND u.user_active=1 AND r.is_active=1",
            new { entityId = identityEntityId, userId });
        if (role.RoleId == 0) return Forbid();
        var pageAccess = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM page_access pa JOIN pages p ON p.page_id=pa.page_id WHERE pa.entity_id=@entityId AND pa.role_id=@roleId AND p.page_name='/crm/reports'",
            new { entityId, roleId = role.RoleId });
        if (!isSuperadmin && role.IsAdmin != 1 && pageAccess == 0) return Forbid();
        if (!branchId.HasValue && !isSuperadmin && role.IsAdmin != 1) return Forbid();
        if (branchId.HasValue && !isSuperadmin && role.IsAdmin != 1)
        {
            var branchAccess = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM role_branch_access WHERE entity_id=@entityId AND role_id=@roleId AND branch_id=@branchId",
                new { entityId, roleId = role.RoleId, branchId });
            if (branchAccess == 0) return Forbid();
        }

        var args = new { entityId, branchId, start, endExclusive = end.AddDays(1) };
        const string scope = "entity_id=@entityId AND (@branchId IS NULL OR branch_id=@branchId OR branch_id IS NULL) AND cr_on>=@start AND cr_on<@endExclusive";
        var customers = (await connection.QueryAsync<dynamic>($"SELECT COALESCE(NULLIF(status,''),'Unspecified') AS label,COUNT(*) AS count FROM crm_customers WHERE {scope} GROUP BY label ORDER BY count DESC", args)).ToList();
        var leads = (await connection.QueryAsync<dynamic>($"SELECT COALESCE(NULLIF(status,''),'Unspecified') AS label,COUNT(*) AS count FROM crm_leads WHERE {scope} GROUP BY label ORDER BY count DESC", args)).ToList();
        var sources = (await connection.QueryAsync<dynamic>($"SELECT COALESCE(NULLIF(lead_source,''),'Unspecified') AS label,COUNT(*) AS count FROM crm_leads WHERE {scope} GROUP BY label ORDER BY count DESC", args)).ToList();
        var deals = (await connection.QueryAsync<dynamic>($"SELECT COALESCE(NULLIF(stage,''),'Unspecified') AS label,COUNT(*) AS count,COALESCE(SUM(amount),0) AS amount FROM crm_deals WHERE {scope} GROUP BY label ORDER BY amount DESC", args)).ToList();
        var activities = (await connection.QueryAsync<dynamic>($"SELECT COALESCE(NULLIF(status,''),'Unspecified') AS label,COUNT(*) AS count FROM crm_activities WHERE {scope} GROUP BY label ORDER BY count DESC", args)).ToList();
        var monthly = (await connection.QueryAsync<dynamic>($"""
            SELECT month, SUM(customers) AS customers, SUM(leads) AS leads, SUM(deals) AS deals, SUM(deal_value) AS deal_value FROM (
              SELECT DATE_FORMAT(cr_on,'%Y-%m') AS month, COUNT(*) AS customers, 0 AS leads, 0 AS deals, 0 AS deal_value FROM crm_customers WHERE {scope} GROUP BY month
              UNION ALL SELECT DATE_FORMAT(cr_on,'%Y-%m'),0,COUNT(*),0,0 FROM crm_leads WHERE {scope} GROUP BY 1
              UNION ALL SELECT DATE_FORMAT(cr_on,'%Y-%m'),0,0,COUNT(*),COALESCE(SUM(amount),0) FROM crm_deals WHERE {scope} GROUP BY 1
            ) m GROUP BY month ORDER BY month
            """, args)).ToList();
        var totals = await connection.QuerySingleAsync<dynamic>($"""
            SELECT
             (SELECT COUNT(*) FROM crm_customers WHERE {scope}) AS customers,
             (SELECT COUNT(*) FROM crm_leads WHERE {scope}) AS leads,
             (SELECT COUNT(*) FROM crm_leads WHERE {scope} AND converted_customer_id IS NOT NULL) AS converted_leads,
             (SELECT COUNT(*) FROM crm_deals WHERE {scope}) AS deals,
             (SELECT COALESCE(SUM(amount),0) FROM crm_deals WHERE {scope}) AS deal_value,
             (SELECT COALESCE(SUM(amount),0) FROM crm_deals WHERE {scope} AND stage='Won') AS won_value,
             (SELECT COUNT(*) FROM crm_activities WHERE {scope} AND due_date<UTC_TIMESTAMP() AND status NOT IN ('Completed','Cancelled')) AS overdue_activities
            """, args);
        // Tickets have no branch_id: this section is always scoped to the entity, not the selected branch.
        var ticketArgs = new { entityId, start, endExclusive = end.AddDays(1) };
        var tickets = (await connection.QueryAsync<dynamic>("SELECT status AS label,COUNT(*) AS count FROM crm_support_tickets WHERE entity_id=@entityId AND created_at>=@start AND created_at<@endExclusive GROUP BY status ORDER BY count DESC", ticketArgs)).ToList();
        var ticketMonthly = (await connection.QueryAsync<dynamic>("SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,COUNT(*) AS count FROM crm_support_tickets WHERE entity_id=@entityId AND created_at>=@start AND created_at<@endExclusive GROUP BY month ORDER BY month", ticketArgs)).ToList();
        return Ok(new ApiResponse(200, new { from = start.ToString("yyyy-MM-dd"), to = end.ToString("yyyy-MM-dd"), tickets_entity_wide = true, totals, monthly, customers, leads, sources, deals, activities, tickets, ticket_monthly = ticketMonthly }));
    }
}
