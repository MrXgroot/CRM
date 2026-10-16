using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("country")]
public class CountryController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public CountryController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var data = await _mastersRepository.GetCountriesAsync();
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("state")]
public class StateController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public StateController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? country_code = null)
    {
        var data = await _mastersRepository.GetStatesAsync(country_code);
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("city")]
public class CityController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public CityController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? state_code = null)
    {
        var data = await _mastersRepository.GetCitiesAsync(state_code);
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("bank")]
public class BankController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public BankController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> GetBankName()
    {
        var data = await _mastersRepository.GetBankNamesAsync();
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("accounttype")]
    public async Task<IActionResult> GetBankAccountType()
    {
        var data = await _mastersRepository.GetBankAccountTypesAsync();
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("ifsc/{ifsc}")]
    public async Task<IActionResult> GetIfsc(string ifsc)
    {
        if (string.IsNullOrWhiteSpace(ifsc) || ifsc.Trim().Length != 11)
        {
            return BadRequest(new ApiResponse(400, null, "Invalid IFSC code format"));
        }

        var data = await _mastersRepository.GetIfscDetailsAsync(ifsc);
        if (data != null)
        {
            return Ok(new ApiResponse(200, data, "IFSC details fetched successfully"));
        }

        return NotFound(new ApiResponse(404, null, "IFSC code not found"));
    }
}

[ApiController]
[Route("pincode")]
public class PincodeController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public PincodeController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? state = null, [FromQuery] string? city = null, [FromQuery] int page = 0, [FromQuery] int limit = 15)
    {
        var data = await _mastersRepository.GetPincodesAsync(state, city, page, limit);
        return Ok(new ApiResponse(200, data));
    }

    [HttpGet("getdata")]
    public async Task<IActionResult> GetData([FromQuery] long pincode)
    {
        var data = await _mastersRepository.GetPincodeDataAsync(pincode);
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("designation")]
public class DesignationController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public DesignationController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? entity_id = null, [FromQuery] string? name = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var targetEntityId = !string.IsNullOrEmpty(entity_id) && long.TryParse(entity_id, out var parsedEid)
            ? parsedEid
            : (long.TryParse(entityIdClaim, out var eid) ? eid : 0);

        var data = await _mastersRepository.GetDesignationsAsync(targetEntityId, name, limit, page);
        return Ok(new ApiResponse(200, data, ""));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, string> body, [FromQuery] string? entity_id = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var targetEntityId = !string.IsNullOrEmpty(entity_id) && long.TryParse(entity_id, out var parsedEid)
            ? parsedEid
            : (long.TryParse(entityIdClaim, out var eid) ? eid : 0);

        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;
        var name = body.TryGetValue("name", out var n) ? n : "";

        var success = await _mastersRepository.AddDesignationAsync(targetEntityId, name, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Designation added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "failed"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> body, [FromQuery] string? entity_id = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var targetEntityId = !string.IsNullOrEmpty(entity_id) && long.TryParse(entity_id, out var parsedEid)
            ? parsedEid
            : (long.TryParse(entityIdClaim, out var eid) ? eid : 0);

        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;
        var desigId = Convert.ToInt64(body["desig_id"]);
        var name = body["name"]?.ToString() ?? "";
        var isActive = Convert.ToBoolean(body["is_active"]);

        var success = await _mastersRepository.UpdateDesignationAsync(targetEntityId, desigId, name, isActive, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "could not update"));
    }
}

[ApiController]
[Route("plan")]
public class PlanController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public PlanController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var data = await _mastersRepository.GetPlansAsync();
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _mastersRepository.AddPlanAsync(data, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "failed to add"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _mastersRepository.UpdatePlanAsync(data, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "failed to update"));
    }
}

[ApiController]
[Route("vendor")]
public class VendorController : ControllerBase
{
    private readonly IMastersRepository _mastersRepository;
    public VendorController(IMastersRepository mastersRepository) => _mastersRepository = mastersRepository;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] long entity_id,
        [FromQuery] long branch_id,
        [FromQuery] long? vendor_id = null,
        [FromQuery] string? type = null,
        [FromQuery] int? page = null,
        [FromQuery] int? limit = null,
        [FromQuery] long? selectedbranchid = null)
    {
        var data = await _mastersRepository.GetVendorsAsync(entity_id, branch_id, vendor_id, type, page, limit, selectedbranchid);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id, [FromQuery] long branch_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _mastersRepository.AddVendorAsync(data, entity_id, branch_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "vendor added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Cannot add try Again!"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id, [FromQuery] long branch_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _mastersRepository.UpdateVendorAsync(data, entity_id, branch_id, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Vendor updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Cannot update try Again!"));
    }
}

