using System.Threading.RateLimiting;
using System.Text.Json;
using Matrika.Api.Common;
using Matrika.Api.Middlewares;
using Matrika.Api.Repositories;
using Matrika.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0 }));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register Core Infrastructure & Services
builder.Services.AddSingleton<IDbService, DbService>();
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddSingleton<ITokenService, TokenService>();

// Register Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IGeneralSettingsRepository, GeneralSettingsRepository>();
builder.Services.AddScoped<IEntityRepository, EntityRepository>();
builder.Services.AddScoped<IBranchRepository, BranchRepository>();
builder.Services.AddScoped<IPageRepository, PageRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IMastersRepository, MastersRepository>();
builder.Services.AddScoped<IAccountingRepository, AccountingRepository>();
builder.Services.AddScoped<IPayrollAttendanceRepository, PayrollAttendanceRepository>();
builder.Services.AddScoped<ICrmRepository, CrmRepository>();

var app = builder.Build();
if (args.Contains("--init-local")) {
    using var scope=app.Services.CreateScope();
    await LocalSetup.Run(scope.ServiceProvider, builder.Configuration, app.Environment);
    return;
}
if (args.Contains("--setup-matrika")) {
    using var scope=app.Services.CreateScope();
    await MatrikaSetup.Run(scope.ServiceProvider, builder.Configuration);
    return;
}
if (args.Contains("--seed-dev") || args.Contains("--seed-local")) {
    using var scope = app.Services.CreateScope();
    await DevSeeder.Run(scope.ServiceProvider, builder.Configuration, app.Environment);
    return;
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseRateLimiter();

// Global Exception Handler Middleware
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled server error: {Message}", ex.Message);

        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = ex is ArgumentException ? 400 : 500;
            context.Response.ContentType = "application/json";
            var errResponse = new
            {
                success = false,
                message = ex is ArgumentException ? ex.Message : "The request could not be completed. Contact your administrator.",
                code = context.Response.StatusCode
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(errResponse));
        }
    }
});

// Custom Session & Token Validation Middleware
app.UseMiddleware<SessionValidationMiddleware>();

app.MapControllers();

app.MapGet("/", () => "Matrika CRM API");

app.Run();

