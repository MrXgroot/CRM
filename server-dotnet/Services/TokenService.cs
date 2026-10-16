using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Matrika.Api.Services;

public interface ITokenService
{
    string GenerateToken(IDictionary<string, object> claims, TimeSpan? expiresIn = null);
    ClaimsPrincipal? ValidateToken(string token);
    JwtSecurityToken? ReadToken(string token);
}

public class TokenService : ITokenService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expireDays;

    public TokenService(IConfiguration configuration)
    {
        _secretKey = configuration["Jwt:Key"] ?? "";
        if (Encoding.UTF8.GetByteCount(_secretKey) < 32) throw new InvalidOperationException("Configure Jwt__Key with at least 32 bytes.");
        _issuer = configuration["Jwt:Issuer"] ?? "matrika_crm";
        _audience = configuration["Jwt:Audience"] ?? "matrika-client";
        _expireDays = int.TryParse(configuration["Jwt:ExpireDays"], out var days) ? days : 1;
    }

    public string GenerateToken(IDictionary<string, object> claims, TimeSpan? expiresIn = null)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);

        var claimList = new List<Claim>();
        foreach (var kv in claims)
        {
            claimList.Add(new Claim(kv.Key, kv.Value?.ToString() ?? ""));
        }

        var expires = DateTime.UtcNow.Add(expiresIn ?? TimeSpan.FromDays(_expireDays));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claimList),
            Expires = expires,
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false, // flexible to accept both Node and .NET issued tokens
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public JwtSecurityToken? ReadToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            return handler.CanReadToken(token) ? handler.ReadJwtToken(token) : null;
        }
        catch
        {
            return null;
        }
    }
}

