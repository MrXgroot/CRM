using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("page")]
public class PageController : ControllerBase
{
    private readonly IPageRepository _pageRepository;

    public PageController(IPageRepository pageRepository)
    {
        _pageRepository = pageRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var isSuperadminClaim = User.Claims.FirstOrDefault(c => c.Type == "is_superadmin")?.Value;
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;

        var isSuperadmin = int.TryParse(isSuperadminClaim, out var sa) ? sa : 0;
        var entityId = long.TryParse(entityIdClaim, out var eid) ? eid : 0;

        var pages = await _pageRepository.GetAllPagesAsync(isSuperadmin, entityId);
        return Ok(new ApiResponse(200, pages));
    }

    [HttpPost("set-default-home")]
    public async Task<IActionResult> SetDefaultHome([FromBody] Dictionary<string, string> body)
    {
        if (!IsSuperadmin()) return StatusCode(403);
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var entityId = long.TryParse(entityIdClaim, out var eid) ? eid : 0;

        if (!body.TryGetValue("page_name", out var pageName) || string.IsNullOrWhiteSpace(pageName))
        {
            return Ok(new ApiResponse(400, new { }, "page_name is required"));
        }

        var success = await _pageRepository.SetDefaultHomePageAsync(entityId, pageName);
        if (success)
        {
            return Ok(new ApiResponse(200, new { default_home_page = pageName }, "Default home page set successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to set default home page"));
    }

    [HttpGet("toGiveAccess")]
    public async Task<IActionResult> GetToGiveAccess()
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var roleIdClaim = User.Claims.FirstOrDefault(c => c.Type == "role_id")?.Value;
        var isSuperadminClaim = User.Claims.FirstOrDefault(c => c.Type == "is_superadmin")?.Value;

        var entityId = long.TryParse(entityIdClaim, out var eid) ? eid : 0;
        var roleId = long.TryParse(roleIdClaim, out var rid) ? rid : 0;
        var isSuperadmin = int.TryParse(isSuperadminClaim, out var sa) ? sa : 0;

        var pages = await _pageRepository.GetPagesToGiveAccessAsync(entityId, roleId, isSuperadmin);
        return Ok(new ApiResponse(200, pages));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data)
    {
        if (!IsSuperadmin()) return StatusCode(403);
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var success = await _pageRepository.AddPageAsync(data, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Page added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Page already exists or failed to add"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data)
    {
        if (!IsSuperadmin()) return StatusCode(403);
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var success = await _pageRepository.UpdatePageAsync(data, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Page updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to update page"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!IsSuperadmin()) return StatusCode(403);
        var success = await _pageRepository.DeletePageAsync(id);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Page deleted successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to delete page"));
    }
    private bool IsSuperadmin()=>User.FindFirst("is_superadmin")?.Value=="1";
}

