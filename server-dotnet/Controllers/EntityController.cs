using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("entity")]
public class EntityController : ControllerBase
{
    private readonly IEntityRepository _entityRepository;

    public EntityController(IEntityRepository entityRepository)
    {
        _entityRepository = entityRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? entity_id = null)
    {
        var scopedId = User.FindFirst("is_superadmin")?.Value == "1" ? (long?)null : long.Parse(User.FindFirst("entity_id")!.Value);
        var data = await _entityRepository.GetAllEntitiesAsync(scopedId);
        return Ok(new ApiResponse(200, data, "success"));
    }

    [HttpGet("getentitybyid")]
    public async Task<IActionResult> GetById([FromQuery] long entity_id)
    {
        if (User.FindFirst("is_superadmin")?.Value != "1" && User.FindFirst("entity_id")?.Value != entity_id.ToString()) return StatusCode(403);
        var data = await _entityRepository.GetEntityByIdAsync(entity_id);
        return Ok(new ApiResponse(200, data != null ? new[] { data } : Array.Empty<object>(), "success"));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data)
    {
        if (User.FindFirst("is_superadmin")?.Value != "1") return StatusCode(403, new ApiResponse(403, null, "Superadmin access required."));
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var entityId = await _entityRepository.AddEntityAsync(data, crBy);
        if (entityId > 0)
        {
            return Ok(new ApiResponse(200, new { entity_id = entityId.ToString() }, "Added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data)
    {
        if (User.FindFirst("is_superadmin")?.Value != "1") return StatusCode(403, new ApiResponse(403, null, "Superadmin access required."));
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var success = await _entityRepository.UpdateEntityAsync(data, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed"));
    }
}

