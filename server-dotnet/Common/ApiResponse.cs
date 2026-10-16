using System.Text.Json.Serialization;

namespace Matrika.Api.Common;

public class ApiResponse
{
    [JsonPropertyName("statusCode")]
    public int StatusCode { get; set; }

    [JsonPropertyName("data")]
    public object? Data { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    public ApiResponse(int statusCode, object? data = null, string message = "Success")
    {
        StatusCode = statusCode;
        Data = data ?? new { };
        Message = message;
        Success = statusCode < 400;
    }
}

