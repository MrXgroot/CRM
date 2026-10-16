using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface ICrmRepository
{
    // Customers
    Task<IEnumerable<dynamic>> GetCustomersAsync(long entityId, long? branchId, string? search, string? status);
    Task<dynamic?> GetCustomerByIdAsync(long customerId, long entityId);
    Task<long> AddCustomerAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy);
    Task<bool> UpdateCustomerAsync(long customerId, IDictionary<string, object?> data, long entityId, long moBy);
    Task<bool> DeleteCustomerAsync(long customerId, long entityId);

    // Leads
    Task<IEnumerable<dynamic>> GetLeadsAsync(long entityId, long? branchId, string? search, string? status);
    Task<dynamic?> GetLeadByIdAsync(long leadId, long entityId);
    Task<long> AddLeadAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy);
    Task<bool> UpdateLeadAsync(long leadId, IDictionary<string, object?> data, long entityId, long moBy);
    Task<bool> DeleteLeadAsync(long leadId, long entityId);
    Task<dynamic> ConvertLeadAsync(long leadId, long entityId, long? branchId, long userId);

    // Deals
    Task<IEnumerable<dynamic>> GetDealsAsync(long entityId, long? branchId, string? search, string? stage);
    Task<dynamic?> GetDealByIdAsync(long dealId, long entityId);
    Task<long> AddDealAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy);
    Task<bool> UpdateDealAsync(long dealId, IDictionary<string, object?> data, long entityId, long moBy);
    Task<bool> DeleteDealAsync(long dealId, long entityId);
    Task<bool> UpdateDealStageAsync(long dealId, string stage, long entityId, long moBy);
    Task<bool> UpdateDealApprovalAsync(long dealId, string approvalStatus, string? notes, long entityId, long approvedBy);

    // Activities
    Task<IEnumerable<dynamic>> GetActivitiesAsync(long entityId, long? branchId, string? status, string? relatedToType, long? relatedToId);
    Task<long> AddActivityAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy);
    Task<bool> UpdateActivityAsync(long activityId, IDictionary<string, object?> data, long entityId, long moBy);
    Task<bool> DeleteActivityAsync(long activityId, long entityId);
    Task<bool> UpdateActivityStatusAsync(long activityId, string status, long entityId, long moBy);

    // Summary Metrics
    Task<dynamic> GetDashboardStatsAsync(long entityId, long? branchId);
}

public class CrmRepository : ICrmRepository
{
    private readonly IDbService _db;

    public CrmRepository(IDbService db)
    {
        _db = db;
    }

    // ================= CUSTOMERS =================
    public async Task<IEnumerable<dynamic>> GetCustomersAsync(long entityId, long? branchId, string? search, string? status)
    {
        var sql = @"
            SELECT c.*, b.name AS branch_name, u.full_name AS assigned_user_name
            FROM crm_customers c
            LEFT JOIN branch b ON b.branch_id = c.branch_id AND b.entity_id = c.entity_id
            LEFT JOIN users u ON u.user_id = c.assigned_to AND u.entity_id = c.entity_id
            WHERE c.entity_id = @entityId";

        var p = new DynamicParameters();
        p.Add("entityId", entityId);

        if (branchId.HasValue && branchId.Value > 0)
        {
            sql += " AND (c.branch_id = @branchId OR c.branch_id IS NULL)";
            p.Add("branchId", branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            sql += " AND c.status = @status";
            p.Add("status", status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (c.company_name LIKE @search OR c.contact_name LIKE @search OR c.email LIKE @search OR c.phone LIKE @search)";
            p.Add("search", $"%{search}%");
        }

        sql += " ORDER BY c.customer_id DESC";
        return await _db.QueryAsync<dynamic>(sql, p);
    }

    public async Task<dynamic?> GetCustomerByIdAsync(long customerId, long entityId)
    {
        var sql = @"
            SELECT c.*, b.name AS branch_name, u.full_name AS assigned_user_name
            FROM crm_customers c
            LEFT JOIN branch b ON b.branch_id = c.branch_id AND b.entity_id = c.entity_id
            LEFT JOIN users u ON u.user_id = c.assigned_to AND u.entity_id = c.entity_id
            WHERE c.customer_id = @customerId AND c.entity_id = @entityId";

        return await _db.QuerySingleOrDefaultAsync<dynamic>(sql, new { customerId, entityId });
    }

    public async Task<long> AddCustomerAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("crm_customers", "customer_id", new Dictionary<string, object?> { ["entity_id"] = entityId });

        var insertData = new Dictionary<string, object?>(data)
        {
            ["customer_id"] = nextId,
            ["entity_id"] = entityId,
            ["branch_id"] = data.ContainsKey("branch_id") && data["branch_id"] != null ? data["branch_id"] : branchId,
            ["cr_by"] = crBy,
            ["cr_on"] = DateTime.UtcNow
        };

        var skip = new[] { "branch_name", "assigned_user_name" };
        await _db.InsertTableAsync("crm_customers", insertData, skip);
        return nextId;
    }

    public async Task<bool> UpdateCustomerAsync(long customerId, IDictionary<string, object?> data, long entityId, long moBy)
    {
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy,
            ["mo_on"] = DateTime.UtcNow
        };

        var skip = new[] { "customer_id", "entity_id", "cr_by", "cr_on", "branch_name", "assigned_user_name" };
        var where = new Dictionary<string, object?>
        {
            ["customer_id"] = customerId,
            ["entity_id"] = entityId
        };

        var rows = await _db.UpdateTableAsync("crm_customers", updateData, where, skip);
        return rows > 0;
    }

    public async Task<bool> DeleteCustomerAsync(long customerId, long entityId)
    {
        var rows = await _db.ExecuteAsync(
            "DELETE FROM crm_customers WHERE customer_id = @customerId AND entity_id = @entityId",
            new { customerId, entityId }
        );
        return rows > 0;
    }

    // ================= LEADS =================
    public async Task<IEnumerable<dynamic>> GetLeadsAsync(long entityId, long? branchId, string? search, string? status)
    {
        var sql = @"
            SELECT l.*, b.name AS branch_name, u.full_name AS assigned_user_name
            FROM crm_leads l
            LEFT JOIN branch b ON b.branch_id = l.branch_id AND b.entity_id = l.entity_id
            LEFT JOIN users u ON u.user_id = l.assigned_to AND u.entity_id = l.entity_id
            WHERE l.entity_id = @entityId";

        var p = new DynamicParameters();
        p.Add("entityId", entityId);

        if (branchId.HasValue && branchId.Value > 0)
        {
            sql += " AND (l.branch_id = @branchId OR l.branch_id IS NULL)";
            p.Add("branchId", branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            sql += " AND l.status = @status";
            p.Add("status", status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (l.first_name LIKE @search OR l.last_name LIKE @search OR l.company LIKE @search OR l.email LIKE @search OR l.phone LIKE @search)";
            p.Add("search", $"%{search}%");
        }

        sql += " ORDER BY l.lead_id DESC";
        return await _db.QueryAsync<dynamic>(sql, p);
    }

    public async Task<dynamic?> GetLeadByIdAsync(long leadId, long entityId)
    {
        var sql = @"
            SELECT l.*, b.name AS branch_name, u.full_name AS assigned_user_name
            FROM crm_leads l
            LEFT JOIN branch b ON b.branch_id = l.branch_id AND b.entity_id = l.entity_id
            LEFT JOIN users u ON u.user_id = l.assigned_to AND u.entity_id = l.entity_id
            WHERE l.lead_id = @leadId AND l.entity_id = @entityId";

        return await _db.QuerySingleOrDefaultAsync<dynamic>(sql, new { leadId, entityId });
    }

    public async Task<long> AddLeadAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("crm_leads", "lead_id", new Dictionary<string, object?> { ["entity_id"] = entityId });

        var insertData = new Dictionary<string, object?>(data)
        {
            ["lead_id"] = nextId,
            ["entity_id"] = entityId,
            ["branch_id"] = data.ContainsKey("branch_id") && data["branch_id"] != null ? data["branch_id"] : branchId,
            ["cr_by"] = crBy,
            ["cr_on"] = DateTime.UtcNow
        };

        var skip = new[] { "branch_name", "assigned_user_name" };
        await _db.InsertTableAsync("crm_leads", insertData, skip);
        return nextId;
    }

    public async Task<bool> UpdateLeadAsync(long leadId, IDictionary<string, object?> data, long entityId, long moBy)
    {
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy,
            ["mo_on"] = DateTime.UtcNow
        };

        var skip = new[] { "lead_id", "entity_id", "cr_by", "cr_on", "branch_name", "assigned_user_name" };
        var where = new Dictionary<string, object?>
        {
            ["lead_id"] = leadId,
            ["entity_id"] = entityId
        };

        var rows = await _db.UpdateTableAsync("crm_leads", updateData, where, skip);
        return rows > 0;
    }

    public async Task<bool> DeleteLeadAsync(long leadId, long entityId)
    {
        var rows = await _db.ExecuteAsync(
            "DELETE FROM crm_leads WHERE lead_id = @leadId AND entity_id = @entityId",
            new { leadId, entityId }
        );
        return rows > 0;
    }

    public async Task<dynamic> ConvertLeadAsync(long leadId, long entityId, long? branchId, long userId)
    {
        var lead = await GetLeadByIdAsync(leadId, entityId);
        if (lead == null) throw new Exception("Lead not found");

        var leadDict = (IDictionary<string, object?>)lead;
        var companyName = leadDict["company"]?.ToString();
        var firstName = leadDict["first_name"]?.ToString() ?? "";
        var lastName = leadDict["last_name"]?.ToString() ?? "";
        var contactName = $"{firstName} {lastName}".Trim();
        if (string.IsNullOrWhiteSpace(companyName)) companyName = contactName;

        // 1. Create customer
        var customerData = new Dictionary<string, object?>
        {
            ["company_name"] = companyName,
            ["contact_name"] = contactName,
            ["email"] = leadDict["email"],
            ["phone"] = leadDict["phone"],
            ["status"] = "Active",
            ["assigned_to"] = leadDict["assigned_to"],
            ["notes"] = $"Converted from Lead #{leadId}. " + (leadDict["notes"] ?? "")
        };
        var customerId = await AddCustomerAsync(customerData, entityId, branchId, userId);

        // 2. Create deal if estimated value > 0
        long? dealId = null;
        var estValue = leadDict["estimated_value"] != null ? Convert.ToDecimal(leadDict["estimated_value"]) : 0;
        if (estValue > 0)
        {
            var dealData = new Dictionary<string, object?>
            {
                ["deal_name"] = $"{companyName} - Deal",
                ["customer_id"] = customerId,
                ["lead_id"] = leadId,
                ["stage"] = "Proposal Sent",
                ["amount"] = estValue,
                ["probability"] = 60,
                ["status"] = "Open",
                ["assigned_to"] = leadDict["assigned_to"]
            };
            dealId = await AddDealAsync(dealData, entityId, branchId, userId);
        }

        // 3. Update lead status to Converted
        await _db.ExecuteAsync(
            "UPDATE crm_leads SET status = 'Converted', converted_customer_id = @customerId, mo_by = @userId, mo_on = NOW() WHERE lead_id = @leadId AND entity_id = @entityId",
            new { customerId, userId, leadId, entityId }
        );

        return new
        {
            lead_id = leadId,
            customer_id = customerId,
            deal_id = dealId,
            message = "Lead successfully converted to Customer and Deal"
        };
    }

    // ================= DEALS =================
    public async Task<IEnumerable<dynamic>> GetDealsAsync(long entityId, long? branchId, string? search, string? stage)
    {
        var sql = @"
            SELECT d.*, c.company_name, c.contact_name, b.name AS branch_name, 
                   u.full_name AS assigned_user_name, ap.full_name AS approved_by_name
            FROM crm_deals d
            LEFT JOIN crm_customers c ON c.customer_id = d.customer_id AND c.entity_id = d.entity_id
            LEFT JOIN branch b ON b.branch_id = d.branch_id AND b.entity_id = d.entity_id
            LEFT JOIN users u ON u.user_id = d.assigned_to AND u.entity_id = d.entity_id
            LEFT JOIN users ap ON ap.user_id = d.approved_by AND ap.entity_id = d.entity_id
            WHERE d.entity_id = @entityId";

        var p = new DynamicParameters();
        p.Add("entityId", entityId);

        if (branchId.HasValue && branchId.Value > 0)
        {
            sql += " AND (d.branch_id = @branchId OR d.branch_id IS NULL)";
            p.Add("branchId", branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(stage) && stage != "All")
        {
            sql += " AND d.stage = @stage";
            p.Add("stage", stage);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (d.deal_name LIKE @search OR c.company_name LIKE @search)";
            p.Add("search", $"%{search}%");
        }

        sql += " ORDER BY d.deal_id DESC";
        return await _db.QueryAsync<dynamic>(sql, p);
    }

    public async Task<dynamic?> GetDealByIdAsync(long dealId, long entityId)
    {
        var sql = @"
            SELECT d.*, c.company_name, c.contact_name, b.name AS branch_name, 
                   u.full_name AS assigned_user_name, ap.full_name AS approved_by_name
            FROM crm_deals d
            LEFT JOIN crm_customers c ON c.customer_id = d.customer_id AND c.entity_id = d.entity_id
            LEFT JOIN branch b ON b.branch_id = d.branch_id AND b.entity_id = d.entity_id
            LEFT JOIN users u ON u.user_id = d.assigned_to AND u.entity_id = d.entity_id
            LEFT JOIN users ap ON ap.user_id = d.approved_by AND ap.entity_id = d.entity_id
            WHERE d.deal_id = @dealId AND d.entity_id = @entityId";

        return await _db.QuerySingleOrDefaultAsync<dynamic>(sql, new { dealId, entityId });
    }

    public async Task<long> AddDealAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("crm_deals", "deal_id", new Dictionary<string, object?> { ["entity_id"] = entityId });

        var insertData = new Dictionary<string, object?>(data)
        {
            ["deal_id"] = nextId,
            ["entity_id"] = entityId,
            ["branch_id"] = data.ContainsKey("branch_id") && data["branch_id"] != null ? data["branch_id"] : branchId,
            ["cr_by"] = crBy,
            ["cr_on"] = DateTime.UtcNow
        };

        var skip = new[] { "company_name", "contact_name", "branch_name", "assigned_user_name", "approved_by_name" };
        await _db.InsertTableAsync("crm_deals", insertData, skip);
        return nextId;
    }

    public async Task<bool> UpdateDealAsync(long dealId, IDictionary<string, object?> data, long entityId, long moBy)
    {
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy,
            ["mo_on"] = DateTime.UtcNow
        };

        var skip = new[] { "deal_id", "entity_id", "cr_by", "cr_on", "company_name", "contact_name", "branch_name", "assigned_user_name", "approved_by_name" };
        var where = new Dictionary<string, object?>
        {
            ["deal_id"] = dealId,
            ["entity_id"] = entityId
        };

        var rows = await _db.UpdateTableAsync("crm_deals", updateData, where, skip);
        return rows > 0;
    }

    public async Task<bool> DeleteDealAsync(long dealId, long entityId)
    {
        var rows = await _db.ExecuteAsync(
            "DELETE FROM crm_deals WHERE deal_id = @dealId AND entity_id = @entityId",
            new { dealId, entityId }
        );
        return rows > 0;
    }

    public async Task<bool> UpdateDealStageAsync(long dealId, string stage, long entityId, long moBy)
    {
        var status = "Open";
        var probability = 20;

        switch (stage)
        {
            case "Prospecting": probability = 20; break;
            case "Qualification": probability = 40; break;
            case "Proposal Sent": probability = 60; break;
            case "Negotiation": probability = 80; break;
            case "Won": probability = 100; status = "Won"; break;
            case "Lost": probability = 0; status = "Lost"; break;
        }

        var rows = await _db.ExecuteAsync(@"
            UPDATE crm_deals 
            SET stage = @stage, probability = @probability, status = @status, mo_by = @moBy, mo_on = NOW()
            WHERE deal_id = @dealId AND entity_id = @entityId",
            new { stage, probability, status, moBy, dealId, entityId }
        );

        if (status == "Won")
        {
            // Sync customer total revenue
            var deal = await GetDealByIdAsync(dealId, entityId);
            if (deal != null)
            {
                var dealDict = (IDictionary<string, object?>)deal;
                var custId = dealDict["customer_id"];
                if (custId != null)
                {
                    await _db.ExecuteAsync(@"
                        UPDATE crm_customers 
                        SET total_revenue = (SELECT IFNULL(SUM(amount), 0) FROM crm_deals WHERE entity_id = @entityId AND customer_id = @custId AND status = 'Won')
                        WHERE entity_id = @entityId AND customer_id = @custId",
                        new { custId, entityId }
                    );
                }
            }
        }

        return rows > 0;
    }

    public async Task<bool> UpdateDealApprovalAsync(long dealId, string approvalStatus, string? notes, long entityId, long approvedBy)
    {
        var rows = await _db.ExecuteAsync(@"
            UPDATE crm_deals 
            SET approval_status = @approvalStatus, approval_notes = @notes, approved_by = @approvedBy, mo_by = @approvedBy, mo_on = NOW()
            WHERE deal_id = @dealId AND entity_id = @entityId",
            new { approvalStatus, notes, approvedBy, dealId, entityId }
        );
        return rows > 0;
    }

    // ================= ACTIVITIES =================
    public async Task<IEnumerable<dynamic>> GetActivitiesAsync(long entityId, long? branchId, string? status, string? relatedToType, long? relatedToId)
    {
        var sql = @"
            SELECT a.*, b.name AS branch_name, u.full_name AS assigned_user_name
            FROM crm_activities a
            LEFT JOIN branch b ON b.branch_id = a.branch_id AND b.entity_id = a.entity_id
            LEFT JOIN users u ON u.user_id = a.assigned_to AND u.entity_id = a.entity_id
            WHERE a.entity_id = @entityId";

        var p = new DynamicParameters();
        p.Add("entityId", entityId);

        if (branchId.HasValue && branchId.Value > 0)
        {
            sql += " AND (a.branch_id = @branchId OR a.branch_id IS NULL)";
            p.Add("branchId", branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            sql += " AND a.status = @status";
            p.Add("status", status);
        }

        if (!string.IsNullOrWhiteSpace(relatedToType))
        {
            sql += " AND a.related_to_type = @relatedToType";
            p.Add("relatedToType", relatedToType);
        }

        if (relatedToId.HasValue && relatedToId.Value > 0)
        {
            sql += " AND a.related_to_id = @relatedToId";
            p.Add("relatedToId", relatedToId.Value);
        }

        sql += " ORDER BY a.due_date ASC, a.activity_id DESC";
        return await _db.QueryAsync<dynamic>(sql, p);
    }

    public async Task<long> AddActivityAsync(IDictionary<string, object?> data, long entityId, long? branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("crm_activities", "activity_id", new Dictionary<string, object?> { ["entity_id"] = entityId });

        var insertData = new Dictionary<string, object?>(data)
        {
            ["activity_id"] = nextId,
            ["entity_id"] = entityId,
            ["branch_id"] = data.ContainsKey("branch_id") && data["branch_id"] != null ? data["branch_id"] : branchId,
            ["cr_by"] = crBy,
            ["cr_on"] = DateTime.UtcNow
        };

        var skip = new[] { "branch_name", "assigned_user_name" };
        await _db.InsertTableAsync("crm_activities", insertData, skip);
        return nextId;
    }

    public async Task<bool> UpdateActivityAsync(long activityId, IDictionary<string, object?> data, long entityId, long moBy)
    {
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy,
            ["mo_on"] = DateTime.UtcNow
        };

        var skip = new[] { "activity_id", "entity_id", "cr_by", "cr_on", "branch_name", "assigned_user_name" };
        var where = new Dictionary<string, object?>
        {
            ["activity_id"] = activityId,
            ["entity_id"] = entityId
        };

        var rows = await _db.UpdateTableAsync("crm_activities", updateData, where, skip);
        return rows > 0;
    }

    public async Task<bool> DeleteActivityAsync(long activityId, long entityId)
    {
        var rows = await _db.ExecuteAsync(
            "DELETE FROM crm_activities WHERE activity_id = @activityId AND entity_id = @entityId",
            new { activityId, entityId }
        );
        return rows > 0;
    }

    public async Task<bool> UpdateActivityStatusAsync(long activityId, string status, long entityId, long moBy)
    {
        var rows = await _db.ExecuteAsync(@"
            UPDATE crm_activities 
            SET status = @status, mo_by = @moBy, mo_on = NOW()
            WHERE activity_id = @activityId AND entity_id = @entityId",
            new { status, moBy, activityId, entityId }
        );
        return rows > 0;
    }

    // ================= DASHBOARD METRICS =================
    public async Task<dynamic> GetDashboardStatsAsync(long entityId, long? branchId)
    {
        var branchFilter = branchId.HasValue && branchId.Value > 0 ? " AND (branch_id = @branchId OR branch_id IS NULL)" : "";
        var p = new DynamicParameters();
        p.Add("entityId", entityId);
        if (branchId.HasValue && branchId.Value > 0) p.Add("branchId", branchId.Value);

        var totalLeads = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_leads WHERE entity_id = @entityId{branchFilter}", p);
        var qualifiedLeads = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_leads WHERE entity_id = @entityId AND status = 'Qualified'{branchFilter}", p);
        var totalCustomers = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_customers WHERE entity_id = @entityId{branchFilter}", p);
        var activeCustomers = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_customers WHERE entity_id = @entityId AND status = 'Active'{branchFilter}", p);
        var totalDeals = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_deals WHERE entity_id = @entityId{branchFilter}", p);
        var wonDeals = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_deals WHERE entity_id = @entityId AND status = 'Won'{branchFilter}", p);
        var pipelineValue = await _db.QuerySingleOrDefaultAsync<decimal>($"SELECT IFNULL(SUM(amount), 0) FROM crm_deals WHERE entity_id = @entityId AND status = 'Open'{branchFilter}", p);
        var totalRevenue = await _db.QuerySingleOrDefaultAsync<decimal>($"SELECT IFNULL(SUM(amount), 0) FROM crm_deals WHERE entity_id = @entityId AND status = 'Won'{branchFilter}", p);
        var pendingActivities = await _db.QuerySingleOrDefaultAsync<int>($"SELECT COUNT(*) FROM crm_activities WHERE entity_id = @entityId AND status = 'Pending'{branchFilter}", p);

        return new
        {
            total_leads = totalLeads,
            qualified_leads = qualifiedLeads,
            total_customers = totalCustomers,
            active_customers = activeCustomers,
            total_deals = totalDeals,
            won_deals = wonDeals,
            pipeline_value = pipelineValue,
            total_revenue = totalRevenue,
            pending_activities = pendingActivities
        };
    }
}

