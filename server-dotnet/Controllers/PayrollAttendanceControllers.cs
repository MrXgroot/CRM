using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("holidaymaster")]
public class HolidayMasterController : ControllerBase
{
    private readonly IPayrollAttendanceRepository _repository;
    public HolidayMasterController(IPayrollAttendanceRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long? entity_id = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var targetEntityId = entity_id ?? (long.TryParse(entityIdClaim, out var eid) ? eid : 0);

        var data = await _repository.GetHolidaysAsync(targetEntityId, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long? entity_id = null)
    {
        var entityIdClaim = User.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;

        var targetEntityId = entity_id ?? (long.TryParse(entityIdClaim, out var eid) ? eid : 0);
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _repository.AddHolidayAsync(data, targetEntityId, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Holiday added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add holiday"));
    }
}

[ApiController]
[Route("leavemaster")]
public class LeaveMasterController : ControllerBase
{
    private readonly IPayrollAttendanceRepository _repository;
    public LeaveMasterController(IPayrollAttendanceRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long entity_id, [FromQuery] string? effective_year = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _repository.GetLeaveMasterAsync(entity_id, effective_year, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _repository.AddLeaveMasterAsync(data, entity_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Leave added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add leave"));
    }
}

[ApiController]
[Route("timeshift")]
public class TimeShiftController : ControllerBase
{
    private readonly IPayrollAttendanceRepository _repository;
    public TimeShiftController(IPayrollAttendanceRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long entity_id, [FromQuery] long branch_id, [FromQuery] string? shift_code = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _repository.GetTimeShiftsAsync(entity_id, branch_id, shift_code, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id, [FromQuery] long branch_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _repository.AddTimeShiftAsync(data, entity_id, branch_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Timeshift Added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add timeshift"));
    }
}

[ApiController]
[Route("salarymaster")]
public class SalaryMasterController : ControllerBase
{
    private readonly IPayrollAttendanceRepository _repository;
    public SalaryMasterController(IPayrollAttendanceRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long entity_id, [FromQuery] int? is_lop = null, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _repository.GetSalariesAsync(entity_id, is_lop, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _repository.AddSalaryMasterAsync(data, entity_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Salary Added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add salary"));
    }
}

[ApiController]
[Route("salarystructure")]
public class SalaryStructureController : ControllerBase
{
    private readonly IPayrollAttendanceRepository _repository;
    public SalaryStructureController(IPayrollAttendanceRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long entity_id, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _repository.GetSalaryStructuresAsync(entity_id, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _repository.AddSalaryStructureAsync(data, entity_id, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Salary structure added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add salary structure"));
    }
}

