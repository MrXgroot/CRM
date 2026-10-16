using System.Data;
using System.Text;
using Dapper;
using MySqlConnector;

namespace Matrika.Api.Common;

public interface IDbService
{
    MySqlConnection CreateConnection();
    Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null);
    Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null);
    Task<int> ExecuteAsync(string sql, object? param = null, IDbTransaction? transaction = null);
    Task<long> GetIdAsync(string table, string column, IDictionary<string, object?> where);
    Task<int> InsertTableAsync(string table, IDictionary<string, object?> data, IEnumerable<string>? skip = null, IDbTransaction? transaction = null);
    Task<int> UpdateTableAsync(string table, IDictionary<string, object?> data, IDictionary<string, object?> where, IEnumerable<string>? skip = null, IDbTransaction? transaction = null);
}

public class DbService : IDbService
{
    private readonly string _connectionString;
    private readonly ILogger<DbService> _logger;

    public DbService(IConfiguration configuration, ILogger<DbService> logger)
    {
        var raw = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        var dbPassword = configuration["Production:DatabasePassword"]
            ?? configuration["Production__DatabasePassword"]
            ?? configuration["Matrika:DatabasePassword"]
            ?? configuration["Matrika__DatabasePassword"]
            ?? configuration["DB_PASSWORD"]
            ?? configuration["DatabasePassword"]
            ?? Environment.GetEnvironmentVariable("Production__DatabasePassword")
            ?? Environment.GetEnvironmentVariable("Matrika__DatabasePassword")
            ?? Environment.GetEnvironmentVariable("DB_PASSWORD")
            ?? Environment.GetEnvironmentVariable("Production:DatabasePassword")
            ?? Environment.GetEnvironmentVariable("DatabasePassword");

        if (!string.IsNullOrEmpty(dbPassword))
        {
            var builder = new MySqlConnectionStringBuilder(raw);
            builder.Password = dbPassword;
            _connectionString = builder.ConnectionString;
        }
        else
        {
            _connectionString = raw;
        }

        _logger = logger;
    }

    public MySqlConnection CreateConnection()
    {
        return new MySqlConnection(_connectionString);
    }

    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null)
    {
        if (transaction != null)
        {
            return await transaction.Connection!.QueryAsync<T>(sql, param, transaction);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.QueryAsync<T>(sql, param);
    }

    public async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null)
    {
        if (transaction != null)
        {
            return await transaction.Connection!.QuerySingleOrDefaultAsync<T>(sql, param, transaction);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.QuerySingleOrDefaultAsync<T>(sql, param);
    }

    public async Task<int> ExecuteAsync(string sql, object? param = null, IDbTransaction? transaction = null)
    {
        if (transaction != null)
        {
            return await transaction.Connection!.ExecuteAsync(sql, param, transaction);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.ExecuteAsync(sql, param);
    }

    public async Task<long> GetIdAsync(string table, string column, IDictionary<string, object?> where)
    {
        var sb = new StringBuilder();
        sb.Append($"SELECT COALESCE(MAX({column}), 0) + 1 FROM {table}");

        var dynamicParams = new DynamicParameters();
        if (where.Count > 0)
        {
            sb.Append(" WHERE ");
            var i = 0;
            foreach (var kv in where)
            {
                if (i > 0) sb.Append(" AND ");
                sb.Append($"{kv.Key} = @where_{kv.Key}");
                dynamicParams.Add($"where_{kv.Key}", Unwrap(kv.Value));
                i++;
            }
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.ExecuteScalarAsync<long>(sb.ToString(), dynamicParams);
    }

    public async Task<int> InsertTableAsync(string table, IDictionary<string, object?> data, IEnumerable<string>? skip = null, IDbTransaction? transaction = null)
    {
        var skipSet = new HashSet<string>(skip ?? Enumerable.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var filteredData = data.Where(kv => !skipSet.Contains(kv.Key)).ToDictionary(kv => kv.Key, kv => kv.Value);

        var columns = new List<string>();
        var valueParams = new List<string>();
        var dynamicParams = new DynamicParameters();

        foreach (var kv in filteredData)
        {
            columns.Add($"`{kv.Key}`");
            valueParams.Add($"@{kv.Key}");
            dynamicParams.Add(kv.Key, Unwrap(kv.Value));
        }

        if (!filteredData.ContainsKey("cr_on"))
        {
            columns.Add("`cr_on`");
            valueParams.Add("NOW()");
        }

        var sql = $"INSERT INTO `{table}` ({string.Join(", ", columns)}) VALUES ({string.Join(", ", valueParams)})";

        if (transaction != null)
        {
            return await transaction.Connection!.ExecuteAsync(sql, dynamicParams, transaction);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.ExecuteAsync(sql, dynamicParams);
    }

    public async Task<int> UpdateTableAsync(string table, IDictionary<string, object?> data, IDictionary<string, object?> where, IEnumerable<string>? skip = null, IDbTransaction? transaction = null)
    {
        var skipSet = new HashSet<string>(skip ?? Enumerable.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var whereKeys = new HashSet<string>(where.Keys, StringComparer.OrdinalIgnoreCase);

        var filteredData = data.Where(kv => !skipSet.Contains(kv.Key) && !whereKeys.Contains(kv.Key))
                               .ToDictionary(kv => kv.Key, kv => kv.Value);

        var setClauses = new List<string>();
        var dynamicParams = new DynamicParameters();

        foreach (var kv in filteredData)
        {
            setClauses.Add($"`{kv.Key}` = @set_{kv.Key}");
            dynamicParams.Add($"set_{kv.Key}", Unwrap(kv.Value));
        }

        setClauses.Add("`mo_on` = NOW()");

        var whereClauses = new List<string>();
        foreach (var kv in where)
        {
            whereClauses.Add($"`{kv.Key}` = @where_{kv.Key}");
            dynamicParams.Add($"where_{kv.Key}", Unwrap(kv.Value));
        }

        var whereSql = whereClauses.Count > 0 ? " WHERE " + string.Join(" AND ", whereClauses) : "";
        var sql = $"UPDATE `{table}` SET {string.Join(", ", setClauses)}{whereSql}";

        if (transaction != null)
        {
            return await transaction.Connection!.ExecuteAsync(sql, dynamicParams, transaction);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        return await connection.ExecuteAsync(sql, dynamicParams);
    }

    private static object? Unwrap(object? val)
    {
        if (val is System.Text.Json.JsonElement je)
        {
            switch (je.ValueKind)
            {
                case System.Text.Json.JsonValueKind.String:
                    return je.GetString();
                case System.Text.Json.JsonValueKind.Number:
                    if (je.TryGetInt64(out var l)) return l;
                    if (je.TryGetDecimal(out var d)) return d;
                    return je.GetDouble();
                case System.Text.Json.JsonValueKind.True:
                    return true;
                case System.Text.Json.JsonValueKind.False:
                    return false;
                case System.Text.Json.JsonValueKind.Null:
                case System.Text.Json.JsonValueKind.Undefined:
                    return null;
                default:
                    return je.ToString();
            }
        }
        return val;
    }
}

