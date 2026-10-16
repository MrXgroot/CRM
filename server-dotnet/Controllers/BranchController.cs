using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("branch")]
public class BranchController : ControllerBase
{
    private readonly IBranchRepository _branchRepository;

    public BranchController(IBranchRepository branchRepository)
    {
        _branchRepository = branchRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? entity_id = null, [FromQuery] string? name = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _branchRepository.GetAllBranchesAsync(entity_id, name, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var branchId = await _branchRepository.AddBranchAsync(data, crBy);
        if (branchId > 0)
        {
            return Ok(new ApiResponse(200, new { branch_id = branchId }, "Branch added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add branch"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var id) ? id : 0;

        var success = await _branchRepository.UpdateBranchAsync(data, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to update branch"));
    }
}

