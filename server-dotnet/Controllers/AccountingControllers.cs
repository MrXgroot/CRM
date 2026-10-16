using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("glmaster")]
public class GlMasterController : ControllerBase
{
    private readonly IAccountingRepository _accountingRepository;
    public GlMasterController(IAccountingRepository accountingRepository) => _accountingRepository = accountingRepository;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] long entity_id,
        [FromQuery] long branch_id,
        [FromQuery] long? _branch_id = null,
        [FromQuery] string? gl_incm_exp = null,
        [FromQuery] string? bsc_code = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? page = null)
    {
        var data = await _accountingRepository.GetGlMasterAsync(entity_id, branch_id, _branch_id, gl_incm_exp, bsc_code, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id, [FromQuery] long branch_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var glCode = await _accountingRepository.AddGlMasterAsync(data, entity_id, branch_id, crBy);
        if (!string.IsNullOrEmpty(glCode))
        {
            return Ok(new ApiResponse(200, new { gl_code = glCode }, "GL Master added successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to add GL Master"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> data, [FromQuery] long entity_id, [FromQuery] long branch_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var success = await _accountingRepository.UpdateGlMasterAsync(data, entity_id, branch_id, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "GL Master updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to update GL Master"));
    }
}

[ApiController]
[Route("balancesheetcategory")]
public class BalanceSheetCategoryController : ControllerBase
{
    private readonly IAccountingRepository _accountingRepository;
    public BalanceSheetCategoryController(IAccountingRepository accountingRepository) => _accountingRepository = accountingRepository;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long entity_id, [FromQuery] int? limit = null, [FromQuery] int? page = null)
    {
        var data = await _accountingRepository.GetBalanceSheetCategoriesAsync(entity_id, limit, page);
        return Ok(new ApiResponse(200, data));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] Dictionary<string, string> body, [FromQuery] long entity_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var crBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var desc = body.GetValueOrDefault("category_desc", "");
        var type = body.GetValueOrDefault("category_type", "");

        var success = await _accountingRepository.AddBalanceSheetCategoryAsync(entity_id, desc, type, crBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Balance sheet Added successfully"));
        }

        return Ok(new ApiResponse(422, new { }, "Error while adding balance sheet"));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, object?> body, [FromQuery] long entity_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
        var moBy = long.TryParse(userIdClaim, out var uid) ? uid : 0;

        var code = Convert.ToInt64(body["category_code"]);
        var desc = body["category_desc"]?.ToString() ?? "";
        var type = body["category_type"]?.ToString() ?? "";

        var success = await _accountingRepository.UpdateBalanceSheetCategoryAsync(entityId: entity_id, code, desc, type, moBy);
        if (success)
        {
            return Ok(new ApiResponse(200, new { }, "Updated successfully"));
        }

        return Ok(new ApiResponse(400, new { }, "Failed to update"));
    }
}

[ApiController]
[Route("daybook")]
public class DayBookController : ControllerBase
{
    private readonly IAccountingRepository _accountingRepository;
    public DayBookController(IAccountingRepository accountingRepository) => _accountingRepository = accountingRepository;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] long entity_id,
        [FromQuery] long branch_id,
        [FromQuery] string? book_type = null,
        [FromQuery] long? gl_code = null,
        [FromQuery] string? from_date = null,
        [FromQuery] string? upto_date = null)
    {
        var data = await _accountingRepository.GetDayBookAsync(entity_id, branch_id, book_type, gl_code, from_date, upto_date);
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("trailbalance")]
public class TrailBalanceController : ControllerBase
{
    private readonly IAccountingRepository _accountingRepository;
    public TrailBalanceController(IAccountingRepository accountingRepository) => _accountingRepository = accountingRepository;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] long entity_id,
        [FromQuery] long branch_id,
        [FromQuery] string? from_date = null,
        [FromQuery] string? upto_date = null)
    {
        var data = await _accountingRepository.GetTrialBalanceAsync(entity_id, branch_id, from_date, upto_date);
        return Ok(new ApiResponse(200, data));
    }
}

[ApiController]
[Route("accountledger")]
public class AccountLedgerController : ControllerBase
{
    private readonly IAccountingRepository _accountingRepository;
    public AccountLedgerController(IAccountingRepository accountingRepository) => _accountingRepository = accountingRepository;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] long entity_id,
        [FromQuery] long branch_id,
        [FromQuery] string? gl_code = null,
        [FromQuery] string? from_date = null,
        [FromQuery] string? upto_date = null,
        [FromQuery] string? cust_type = null,
        [FromQuery] string? cust_code = null,
        [FromQuery] string? vend_code = null,
        [FromQuery] long? ord_code = null,
        [FromQuery] int? page = null,
        [FromQuery] int? limit = null)
    {
        var data = await _accountingRepository.GetAccountLedgerAsync(entity_id, branch_id, gl_code, from_date, upto_date, cust_type, cust_code, vend_code, ord_code, page, limit);
        return Ok(new ApiResponse(200, data));
    }
}

