using System.Net;
using System.Text.Json;
using Matrika.Api.Common;
using Matrika.Api.Services;

namespace Matrika.Api.Middlewares;

public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SessionValidationMiddleware> _logger;

    public SessionValidationMiddleware(RequestDelegate _next, ILogger<SessionValidationMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITokenService tokenService, IDbService dbService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        var method = context.Request.Method.ToUpperInvariant();

        // Allow public routes
        if (path == "/" ||
            path.StartsWith("/swagger") ||
            path == "/user/login" ||
            path.StartsWith("/portal/") ||
            path == "/user/verify-2fa" ||
            path.StartsWith("/user/forgot-password") ||
            (path.StartsWith("/generalsettings") && method == "GET"))
        {
            await _next(context);
            return;
        }

        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            await SendAuthError(context, "Invalid Token", 120);
            return;
        }

        var token = authHeader["Bearer ".Length..].Trim();

        try
        {
            var principal = tokenService.ValidateToken(token);
            if (principal == null)
            {
                // Attempt decode to see if it was expired
                var jwt = tokenService.ReadToken(token);
                if (jwt != null && jwt.ValidTo < DateTime.UtcNow)
                {
                    var userIdClaim = jwt.Claims.FirstOrDefault(c => c.Type == "user_id")?.Value;
                    var entityIdClaim = jwt.Claims.FirstOrDefault(c => c.Type == "entity_id")?.Value;

                    if (!string.IsNullOrEmpty(userIdClaim) && !string.IsNullOrEmpty(entityIdClaim))
                    {
                        await dbService.ExecuteAsync(
                            "UPDATE session SET log_type = 'LO', logout_time = NOW() WHERE user_id = @userId AND entity_id = @entityId AND token = @token AND log_type = 'LI'",
                            new { userId = userIdClaim, entityId = entityIdClaim, token }
                        );
                    }

                    await SendAuthError(context, "Token Expired", 120);
                    return;
                }

                await SendAuthError(context, "Invalid Token", 120);
                return;
            }

            // Verify active session in DB
            var activeSession = await dbService.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT session_id FROM session WHERE token = @token AND logout_time IS NULL AND log_type = 'LI'",
                new { token }
            );

            if (activeSession == null)
            {
                await SendAuthError(context, "Session expired or logged out", 120);
                return;
            }


            var claimedEntity = principal.FindFirst("entity_id")?.Value;
            var requestedEntity = context.Request.Headers["entity_id"].FirstOrDefault() ?? context.Request.Query["entity_id"].FirstOrDefault() ?? claimedEntity;
            if (!long.TryParse(requestedEntity, out var selectedEntity) || selectedEntity <= 0 ||
                (principal.FindFirst("is_superadmin")?.Value != "1" && (requestedEntity != claimedEntity || (context.Request.Query.TryGetValue("entity_id", out var queryEntity) && queryEntity.ToString() != claimedEntity))))
            {
                context.Response.StatusCode = 403; return;
            }
            context.Request.Headers["entity_id"] = requestedEntity;
            // Attach user claims to HttpContext
            context.Items["User"] = principal;
            context.User = principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Auth middleware exception");
            await SendAuthError(context, ex.Message, 120);
            return;
        }

        await _next(context);
    }

    private static async Task SendAuthError(HttpContext context, string message, int code)
    {
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/json";

        var response = new
        {
            message,
            code
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

