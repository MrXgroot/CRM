using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("role")]
public class RoleController : ControllerBase
{
    private readonly IRoleRepository _roleRepository;
    private readonly IDbService _db;

    public RoleController(IRoleRepository roleRepository, IDbService db)
    {
        _roleRepository = roleRepository;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? entity_id = null, [FromQuery] string? role_name = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == "is_admin")?.Value;
        var isStaffClaim = User.Claims.FirstOrDefault(c => c.Type == "is_staff")?.Value;

        var targetEntityId = !string.IsNullOrEmpty(entity_id) && long.TryParse(entity_id, out var parsedEid)
            ? parsedEid
            : (long.TryParse(entityIdClaim, out var eid) ? eid : 0);

        var isAdmin = isAdminClaim == "1" || isAdminClaim?.ToLower() == "true";
        var isStaff = isStaffClaim == "1" || isStaffClaim?.ToLower() == "true";

        var data = await _roleRepository.GetRolesAsync(targetEntityId, role_name, limit, page, isAdmin, isStaff);
        return Ok(new ApiResponse(200, data, ""));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long? entity_id = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var targetEntityId = entity_id ?? (long.TryParse(entityIdClaim, out var eid) ? eid : 0);
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        if (!await CanManage(data, targetEntityId, false)) return StatusCode(403);
        var roleId = await _roleRepository.AddRoleAsync(data, targetEntityId, crBy);
        if (roleId > 0)
        {
            return Ok(new ApiResponse(200, new { role_id = roleId }, "Role added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add role"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data, [FromQuery] long? entity_id = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var targetEntityId = entity_id ?? (long.TryParse(entityIdClaim, out var eid) ? eid : 0);
        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        if (!await CanManage(data, targetEntityId, true)) return StatusCode(403);
        var success = await _roleRepository.UpdateRoleAsync(data, targetEntityId, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Role updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to update role"));
    }
    private async Task<bool> CanManage(Dictionary<string,object?> data,long entityId,bool edit)
    {
        if(User.FindFirst("is_superadmin")?.Value=="1")return true;
        if(User.FindFirst("is_admin")?.Value!="1")return false;
        if(data.TryGetValue("is_superadmin",out var flag)&&flag?.ToString() is "1" or "True" or "true")return false;
        if(edit && (!data.TryGetValue("role_id",out var raw)||!long.TryParse(raw?.ToString(),out var id)||await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM roles WHERE entity_id=@entityId AND role_id=@id AND is_superadmin=0",new{entityId,id})!=1))return false;
        if(data.TryGetValue("page_access",out var pages)&&pages is System.Text.Json.JsonElement j && j.ValueKind==System.Text.Json.JsonValueKind.Array)
            foreach(var item in j.EnumerateArray())
                if(!item.TryGetProperty("page_id",out var page)||!long.TryParse(page.ToString(),out var pageId)||await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM pages WHERE page_id=@pageId AND superadmin_only=0",new{pageId})!=1)return false;
        return true;
    }
}

