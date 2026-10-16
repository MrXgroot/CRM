using Matrika.Api.Common;
using Matrika.Api.Models;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("user")]
public class UserController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IDbService _db;

    public UserController(IUserRepository userRepository, IDbService db)
    {
        _userRepository = userRepository;
        _db = db;
    }

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var (success, data, errorMessage) = await _userRepository.LoginAsync(request);

        if (!success || errorMessage != null)
        {
            return Ok(new ApiResponse(401, new { }, errorMessage ?? "Login failed"));
        }

        return Ok(new ApiResponse(200, data));
    }

    [HttpPost("check-active-session")]
    public async Task<IActionResult> CheckActiveSession([FromBody] CheckSessionRequest request)
    {
        if (request.UserName != User.FindFirst("user_name")?.Value) return StatusCode(403);
        var hasActiveSession = await _userRepository.CheckSessionAsync(request.UserName);
        return Ok(new { hasActiveSession });
    }

    [HttpPost("force-logout")]
    public async Task<IActionResult> ForceLogout([FromBody] ForceLogoutRequest request)
    {
        if (request.UserName != User.FindFirst("user_name")?.Value) return StatusCode(403);
        var success = await _userRepository.ForceLogoutAsync(request.UserName);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "success"));
        }
        return Ok(new ApiResponse(400, new { }, "Failed to force logout"));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        request.UserName = User.FindFirst("user_name")!.Value;
        request.EntityId = long.Parse(User.FindFirst("entity_id")!.Value);
        var success = await _userRepository.LogoutAsync(request.UserName, request.EntityId);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "success"));
        }
        return Ok(new ApiResponse(400, new { }, "Failed to logout"));
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        request.UserName = User.FindFirst("user_name")!.Value;
        request.EntityId = long.Parse(User.FindFirst("entity_id")!.Value);
        if (request.UserPassword.Length < 8 || System.Text.Encoding.UTF8.GetByteCount(request.UserPassword) > 72) return BadRequest(new ApiResponse(400,null,"Use at least 8 characters and at most 72 UTF-8 bytes."));
        var success = await _userRepository.ChangePasswordAsync(request);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Password changed successfully"));
        }
        return Ok(new ApiResponse(400, new { }, "Failed to change password"));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromHeader] long entity_id,
        [FromQuery] string? user_name,
        [FromQuery] long? role_id,
        [FromQuery] int? limit,
        [FromQuery] int? page)
    {
        var data = await _userRepository.GetAllUsersAsync(entity_id, user_name, role_id, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromForm] IFormCollection form, [FromHeader] long entity_id)
    {
        if (!IsAdministrator()) return StatusCode(403);
        var crBy = Convert.ToInt64(User.FindFirst("user_id")?.Value ?? "1");
        var dataDict = new Dictionary<string, object?>();

        if (form.ContainsKey("data"))
        {
            var json = form["data"].ToString();
            dataDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(json) ?? new();
        }
        else
        {
            foreach (var key in form.Keys)
            {
                dataDict[key] = form[key].ToString();
            }
        }

        if (!await SafeRole(dataDict, entity_id)) return StatusCode(403);
        var success = await _userRepository.AddUserAsync(dataDict, entity_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "User added successfully"));
        }
        return Ok(new ApiResponse(400, new { }, "Failed to add user"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] IDictionary<string, object?> data, [FromHeader] long entity_id)
    {
        if (!IsAdministrator()) return StatusCode(403);
        var moBy = Convert.ToInt64(User.FindFirst("user_id")?.Value ?? "1");
        if (!await SafeRole(data, entity_id)) return StatusCode(403);
        var success = await _userRepository.UpdateUserAsync(data, entity_id, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "User updated successfully"));
        }
        return Ok(new ApiResponse(400, new { }, "Failed to update user"));
    }
    private bool IsAdministrator()=>User.FindFirst("is_superadmin")?.Value=="1"||User.FindFirst("is_admin")?.Value=="1";
    private async Task<bool> SafeRole(IDictionary<string,object?> data,long entityId)
    {
        if (User.FindFirst("is_superadmin")?.Value=="1") return true;
        if (!data.TryGetValue("role_id",out var role) || !long.TryParse(role?.ToString(),out var roleId)) return false;
        if (await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM roles WHERE entity_id=@entityId AND role_id=@roleId AND is_superadmin=0",new{entityId,roleId})!=1)return false;
        if (data.TryGetValue("user_id",out var id) && long.TryParse(id?.ToString(),out var userId))
            return await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM users u JOIN roles r USING(entity_id,role_id) WHERE u.entity_id=@entityId AND u.user_id=@userId AND r.is_superadmin=1",new{entityId,userId})==0;
        return true;
    }

}

