using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("crm")]
public class CrmController : ControllerBase
{
    private readonly ICrmRepository _crmRepository;

    public CrmController(ICrmRepository crmRepository)
    {
        _crmRepository = crmRepository;
    }

    private (long entityId, long? branchId, long userId) GetContext()
    {
        var entityIdClaim = Request.Headers["entity_id"].FirstOrDefault();
        var branchIdHeader = Request.Headers["branch_id"].FirstOrDefault();
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var entityId = long.TryParse(entityIdClaim, out var eid) ? eid : 0;
        long? branchId = long.TryParse(branchIdHeader, out var bid) && bid > 0 ? bid : null;
        var userId = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        return (entityId, branchId, userId);
    }

    // ================= STATS =================
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var (entityId, branchId, _) = GetContext();
        var stats = await _crmRepository.GetDashboardStatsAsync(entityId, branchId);
        return Ok(new ApiResponse(200, stats));
    }

    // ================= CUSTOMERS =================
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search, [FromQuery] string? status)
    {
        var (entityId, branchId, _) = GetContext();
        var data = await _crmRepository.GetCustomersAsync(entityId, branchId, search, status);
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("customers/{id}")]
    public async Task<IActionResult> GetCustomerById(long id)
    {
        var (entityId, _, _) = GetContext();
        var customer = await _crmRepository.GetCustomerByIdAsync(id, entityId);
        if (customer == null) return Ok(new ApiResponse(404, new { }, "Customer not found"));
        return Ok(new ApiResponse(200, customer));
    }

    [HttpPost("customers")]
    public async Task<IActionResult> AddCustomer([FromBody] Dictionary<string, object?> data)
    {
        var (entityId, branchId, userId) = GetContext();
        var id = await _crmRepository.AddCustomerAsync(data, entityId, branchId, userId);
        return Ok(new ApiResponse(200, new { customer_id = id }, "Customer added successfully"));
    }

    [HttpPut("customers/{id}")]
    public async Task<IActionResult> UpdateCustomer(long id, [FromBody] Dictionary<string, object?> data)
    {
        var (entityId, _, userId) = GetContext();
        var success = await _crmRepository.UpdateCustomerAsync(id, data, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Customer updated successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to update customer"));
    }

    [HttpDelete("customers/{id}")]
    public async Task<IActionResult> DeleteCustomer(long id)
    {
        var (entityId, _, _) = GetContext();
        var success = await _crmRepository.DeleteCustomerAsync(id, entityId);
        if (success) return Ok(new ApiResponse(200, new { }, "Customer deleted successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to delete customer"));
    }

    // ================= LEADS =================
    [HttpGet("leads")]
    public async Task<IActionResult> GetLeads([FromQuery] string? search, [FromQuery] string? status)
    {
        var (entityId, branchId, _) = GetContext();
        var data = await _crmRepository.GetLeadsAsync(entityId, branchId, search, status);
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("leads/{id}")]
    public async Task<IActionResult> GetLeadById(long id)
    {
        var (entityId, _, _) = GetContext();
        var lead = await _crmRepository.GetLeadByIdAsync(id, entityId);
        if (lead == null) return Ok(new ApiResponse(404, new { }, "Lead not found"));
        return Ok(new ApiResponse(200, lead));
    }

    [HttpPost("leads")]
    public async Task<IActionResult> AddLead([FromBody] Dictionary<string, object?> data)
    {
        var (entityId, branchId, userId) = GetContext();
        var id = await _crmRepository.AddLeadAsync(data, entityId, branchId, userId);
        return Ok(new ApiResponse(200, new { lead_id = id }, "Lead created successfully"));
    }

    [HttpPut("leads/{id}")]
    public async Task<IActionResult> UpdateLead(long id, [FromBody] Dictionary<string, object?> data)
    {
        var (entityId, _, userId) = GetContext();
        var success = await _crmRepository.UpdateLeadAsync(id, data, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Lead updated successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to update lead"));
    }

    [HttpDelete("leads/{id}")]
    public async Task<IActionResult> DeleteLead(long id)
    {
        var (entityId, _, _) = GetContext();
        var success = await _crmRepository.DeleteLeadAsync(id, entityId);
        if (success) return Ok(new ApiResponse(200, new { }, "Lead deleted successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to delete lead"));
    }

    [HttpPost("leads/{id}/convert")]
    public async Task<IActionResult> ConvertLead(long id)
    {
        var (entityId, branchId, userId) = GetContext();
        try
        {
            var res = await _crmRepository.ConvertLeadAsync(id, entityId, branchId, userId);
            return Ok(new ApiResponse(200, res, "Lead successfully converted"));
        }
        catch (Exception ex)
        {
            return Ok(new ApiResponse(400, new { }, ex.Message));
        }
    }

    // ================= DEALS =================
    [HttpGet("deals")]
    public async Task<IActionResult> GetDeals([FromQuery] string? search, [FromQuery] string? stage)
    {
        var (entityId, branchId, _) = GetContext();
        var data = await _crmRepository.GetDealsAsync(entityId, branchId, search, stage);
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("deals/{id}")]
    public async Task<IActionResult> GetDealById(long id)
    {
        var (entityId, _, _) = GetContext();
        var deal = await _crmRepository.GetDealByIdAsync(id, entityId);
        if (deal == null) return Ok(new ApiResponse(404, new { }, "Deal not found"));
        return Ok(new ApiResponse(200, deal));
    }

    [HttpPost("deals")]
    public async Task<IActionResult> AddDeal([FromBody] Dictionary<string, object?> data)
    {
        var (entityId, branchId, userId) = GetContext();
        var id = await _crmRepository.AddDealAsync(data, entityId, branchId, userId);
        return Ok(new ApiResponse(200, new { deal_id = id }, "Deal created successfully"));
    }

    [HttpPut("deals/{id}")]
    public async Task<IActionResult> UpdateDeal(long id, [FromBody] Dictionary<string, object?> data)
    {
        var (entityId, _, userId) = GetContext();
        var success = await _crmRepository.UpdateDealAsync(id, data, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Deal updated successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to update deal"));
    }

    [HttpDelete("deals/{id}")]
    public async Task<IActionResult> DeleteDeal(long id)
    {
        var (entityId, _, _) = GetContext();
        var success = await _crmRepository.DeleteDealAsync(id, entityId);
        if (success) return Ok(new ApiResponse(200, new { }, "Deal deleted successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to delete deal"));
    }

    [HttpPost("deals/{id}/stage")]
    public async Task<IActionResult> UpdateDealStage(long id, [FromBody] Dictionary<string, object?> body)
    {
        var (entityId, _, userId) = GetContext();
        if (!body.TryGetValue("stage", out var stageObj) || stageObj == null || string.IsNullOrWhiteSpace(stageObj.ToString()))
        {
            return Ok(new ApiResponse(400, new { }, "stage is required"));
        }

        var success = await _crmRepository.UpdateDealStageAsync(id, stageObj.ToString()!, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Deal stage updated"));
        return Ok(new ApiResponse(400, new { }, "Failed to update deal stage"));
    }

    [HttpPost("deals/{id}/approval")]
    public async Task<IActionResult> UpdateDealApproval(long id, [FromBody] Dictionary<string, object?> body)
    {
        var (entityId, _, userId) = GetContext();
        if (!body.TryGetValue("approval_status", out var approvalStatusObj) || approvalStatusObj == null || string.IsNullOrWhiteSpace(approvalStatusObj.ToString()))
        {
            return Ok(new ApiResponse(400, new { }, "approval_status is required"));
        }

        var approvalStatus = approvalStatusObj.ToString()!;
        var notes = body.TryGetValue("notes", out var notesObj) ? notesObj?.ToString() : null;
        var success = await _crmRepository.UpdateDealApprovalAsync(id, approvalStatus, notes, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, $"Deal {approvalStatus.ToLower()} successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to update deal approval"));
    }

    // ================= ACTIVITIES =================
    [HttpGet("activities")]
    public async Task<IActionResult> GetActivities([FromQuery] string? status, [FromQuery] string? related_to_type, [FromQuery] long? related_to_id)
    {
        var (entityId, branchId, _) = GetContext();
        var data = await _crmRepository.GetActivitiesAsync(entityId, branchId, status, related_to_type, related_to_id);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost("activities")]
    public async Task<IActionResult> AddActivity([FromBody] Dictionary<string, object?> data)
    {
        var (entityId, branchId, userId) = GetContext();
        var id = await _crmRepository.AddActivityAsync(data, entityId, branchId, userId);
        return Ok(new ApiResponse(200, new { activity_id = id }, "Activity created successfully"));
    }

    [HttpPut("activities/{id}")]
    public async Task<IActionResult> UpdateActivity(long id, [FromBody] Dictionary<string, object?> data)
    {
        var (entityId, _, userId) = GetContext();
        var success = await _crmRepository.UpdateActivityAsync(id, data, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Activity updated successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to update activity"));
    }

    [HttpDelete("activities/{id}")]
    public async Task<IActionResult> DeleteActivity(long id)
    {
        var (entityId, _, _) = GetContext();
        var success = await _crmRepository.DeleteActivityAsync(id, entityId);
        if (success) return Ok(new ApiResponse(200, new { }, "Activity deleted successfully"));
        return Ok(new ApiResponse(400, new { }, "Failed to delete activity"));
    }

    [HttpPost("activities/{id}/status")]
    public async Task<IActionResult> UpdateActivityStatus(long id, [FromBody] Dictionary<string, string> body)
    {
        var (entityId, _, userId) = GetContext();
        if (!body.TryGetValue("status", out var status) || string.IsNullOrWhiteSpace(status))
        {
            return Ok(new ApiResponse(400, new { }, "status is required"));
        }

        var success = await _crmRepository.UpdateActivityStatusAsync(id, status, entityId, userId);
        if (success) return Ok(new ApiResponse(200, new { }, "Activity status updated"));
        return Ok(new ApiResponse(400, new { }, "Failed to update activity status"));
    }
}

