using Matrika.Api.Common;
using Matrika.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Matrika.Api.Controllers;

[ApiController]
[Route("generalsettings")]
public class GeneralSettingsController : ControllerBase
{
    private readonly IGeneralSettingsRepository _generalSettingsRepository;

    public GeneralSettingsController(IGeneralSettingsRepository generalSettingsRepository)
    {
        _generalSettingsRepository = generalSettingsRepository;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _generalSettingsRepository.GetAllAsync();
        return Ok(new ApiResponse(200, settings, "Success"));
    }
}

