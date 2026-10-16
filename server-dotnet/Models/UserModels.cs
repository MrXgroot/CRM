using System.Text.Json.Serialization;

namespace Matrika.Api.Models;

public class LoginRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.EmailAddress]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

public class CheckSessionRequest
{
    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;
}

public class ForceLogoutRequest
{
    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;
}

public class LogoutRequest
{
    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("entity_id")]
    public long EntityId { get; set; }
}

public class ChangePasswordRequest
{
    [JsonPropertyName("current_password")]
    public string CurrentPassword { get; set; } = string.Empty;
    [JsonPropertyName("entity_id")]
    public long EntityId { get; set; }

    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("user_password")]
    public string UserPassword { get; set; } = string.Empty;

    [JsonPropertyName("branch_id")]
    public long BranchId { get; set; }
}

public class VerifyTwofaRequest
{
    [JsonPropertyName("entity_id")]
    public long EntityId { get; set; }

    [JsonPropertyName("user_id")]
    public long UserId { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}

public class UserDto
{
    [JsonPropertyName("entity_id")]
    public long EntityId { get; set; }

    [JsonPropertyName("user_id")]
    public long UserId { get; set; }

    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    [JsonPropertyName("role_name")]
    public string? RoleName { get; set; }

    [JsonPropertyName("role_id")]
    public long RoleId { get; set; }

    [JsonPropertyName("is_superadmin")]
    public int IsSuperadmin { get; set; }

    [JsonPropertyName("is_admin")]
    public int IsAdmin { get; set; }

    [JsonPropertyName("is_staff")]
    public int IsStaff { get; set; }

    [JsonPropertyName("is_active")]
    public int IsActive { get; set; }

    [JsonPropertyName("user_active")]
    public int UserActive { get; set; }

    [JsonPropertyName("branch_id")]
    public long? BranchId { get; set; }

    [JsonPropertyName("desig_id")]
    public long? DesigId { get; set; }

    [JsonPropertyName("imageFile")]
    public string? ImageFile { get; set; }

    [JsonPropertyName("twofa_enabled")]
    public int TwofaEnabled { get; set; }

    [JsonPropertyName("additional_info")]
    public int AdditionalInfo { get; set; }

    [JsonPropertyName("s3_cloudfront_url")]
    public string? S3CloudfrontUrl { get; set; }

    [JsonPropertyName("default_home_page")]
    public string? DefaultHomePage { get; set; }

    [JsonPropertyName("entityImage")]
    public string? EntityImage { get; set; }

    [JsonPropertyName("expiry_date")]
    public string? ExpiryDate { get; set; }
}

