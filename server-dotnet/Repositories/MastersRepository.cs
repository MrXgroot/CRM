using System.Collections.Concurrent;
using System.Text.Json;
using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IMastersRepository
{
    Task<IEnumerable<dynamic>> GetCountriesAsync();
    Task<IEnumerable<dynamic>> GetStatesAsync(string? countryCode);
    Task<IEnumerable<dynamic>> GetCitiesAsync(string? stateCode);
    Task<IEnumerable<dynamic>> GetBankNamesAsync();
    Task<IEnumerable<dynamic>> GetBankAccountTypesAsync();
    Task<dynamic?> GetIfscDetailsAsync(string ifsc);
    Task<IEnumerable<dynamic>> GetPincodesAsync(string? state, string? city, int page, int limit);
    Task<IEnumerable<dynamic>> GetPincodeDataAsync(long pincode);
    Task<IEnumerable<dynamic>> GetDesignationsAsync(long entityId, string? name, int? limit, int? page);
    Task<bool> AddDesignationAsync(long entityId, string name, long crBy);
    Task<bool> UpdateDesignationAsync(long entityId, long desigId, string name, bool isActive, long moBy);
    Task<IEnumerable<dynamic>> GetPlansAsync();
    Task<bool> AddPlanAsync(IDictionary<string, object?> data, long crBy);
    Task<bool> UpdatePlanAsync(IDictionary<string, object?> data, long moBy);
    Task<IEnumerable<dynamic>> GetVendorsAsync(long entityId, long branchId, long? vendorId, string? type, int? page, int? limit, long? selectedBranchId);
    Task<bool> AddVendorAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy);
    Task<bool> UpdateVendorAsync(IDictionary<string, object?> data, long entityId, long branchId, long moBy);
}

public class MastersRepository : IMastersRepository
{
    private static readonly ConcurrentDictionary<long, List<dynamic>> PostalCache = new();
    private readonly IDbService _db;
    private readonly HttpClient _httpClient;

    public MastersRepository(IDbService db)
    {
        _db = db;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
    }

    public async Task<IEnumerable<dynamic>> GetCountriesAsync()
    {
        return await _db.QueryAsync<dynamic>("SELECT COUNTRY_CODE, COUNTRY_ISO, COUNTRY_NAME, COUNTRY_PHONE FROM country ORDER BY COUNTRY_CODE");
    }

    public async Task<IEnumerable<dynamic>> GetStatesAsync(string? countryCode)
    {
        var sql = "SELECT STATE_CODE, TIN_CODE, STATE_NAME, STATE_GST_CODE, GST FROM states";
        var dynamicParams = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            sql += " WHERE COUNTRY_CODE = @countryCode";
            dynamicParams.Add("countryCode", countryCode);
        }

        sql += " ORDER BY STATE_CODE";
        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<IEnumerable<dynamic>> GetCitiesAsync(string? stateCode)
    {
        var sql = "SELECT CITY_CODE, CITY_NAME FROM cities";
        var dynamicParams = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(stateCode))
        {
            sql += " WHERE STATE_CODE = @stateCode";
            dynamicParams.Add("stateCode", stateCode);
        }

        sql += " ORDER BY CITY_CODE";
        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<IEnumerable<dynamic>> GetBankNamesAsync()
    {
        return await _db.QueryAsync<dynamic>("SELECT BANK_CODE, BANK_DESC, ORDER_SL FROM bank_master");
    }

    public async Task<IEnumerable<dynamic>> GetBankAccountTypesAsync()
    {
        return await _db.QueryAsync<dynamic>("SELECT ACNT_TYPE, ACNT_DESC FROM bank_account_type");
    }

    public async Task<dynamic?> GetIfscDetailsAsync(string ifsc)
    {
        try
        {
            var cleanIfsc = ifsc.Trim().ToUpperInvariant();
            var response = await _httpClient.GetAsync($"https://ifsc.razorpay.com/{cleanIfsc}");
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<dynamic>(json);
        }
        catch
        {
            return null;
        }
    }

    public async Task<IEnumerable<dynamic>> GetPincodesAsync(string? state, string? city, int page, int limit)
    {
        var sql = "SELECT * FROM pincode_master WHERE is_active = 1";
        var dynamicParams = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(state))
        {
            sql += " AND state LIKE @state";
            dynamicParams.Add("state", $"%{state}%");
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            sql += " AND city LIKE @city";
            dynamicParams.Add("city", $"%{city}%");
        }

        sql += " ORDER BY pincode ASC";

        if (limit > 0)
        {
            var offset = page * limit;
            sql += $" LIMIT {limit} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<IEnumerable<dynamic>> GetPincodeDataAsync(long pincode)
    {
        if (PostalCache.TryGetValue(pincode, out var cached))
        {
            return cached;
        }

        try
        {
            var response = await _httpClient.GetAsync($"https://api.postalpincode.in/pincode/{pincode}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    var status = root[0].GetProperty("Status").GetString();
                    if (status == "Success" && root[0].TryGetProperty("PostOffice", out var po) && po.ValueKind == JsonValueKind.Array)
                    {
                        var list = new List<dynamic>();
                        foreach (var item in po.EnumerateArray())
                        {
                            list.Add(new
                            {
                                district = item.GetProperty("District").GetString(),
                                state = item.GetProperty("State").GetString(),
                                city = item.GetProperty("Block").GetString() ?? item.GetProperty("District").GetString(),
                                country = item.GetProperty("Country").GetString(),
                                area = item.GetProperty("Name").GetString()
                            });
                        }

                        if (list.Count > 0)
                        {
                            PostalCache[pincode] = list;
                            return list;
                        }
                    }
                }
            }
        }
        catch
        {
            // Fallback to database
        }

        // DB Fallback
        var dbRows = (await _db.QueryAsync<dynamic>(
            "SELECT district, state, city, country, area FROM pincode_master WHERE pincode = @pincode AND is_active = 1",
            new { pincode }
        )).ToList();

        if (dbRows.Count > 0)
        {
            PostalCache[pincode] = dbRows;
        }

        return dbRows;
    }

    public async Task<IEnumerable<dynamic>> GetDesignationsAsync(long entityId, string? name, int? limit, int? page)
    {
        var sql = "SELECT * FROM designation WHERE entity_id = @entityId";
        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);

        if (!string.IsNullOrWhiteSpace(name))
        {
            sql += " AND name LIKE @name";
            dynamicParams.Add("name", $"%{name}%");
        }

        sql += " ORDER BY desig_id";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<bool> AddDesignationAsync(long entityId, string name, long crBy)
    {
        var nextId = await _db.GetIdAsync("designation", "desig_id", new Dictionary<string, object?> { ["entity_id"] = entityId });
        var insertData = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["desig_id"] = nextId,
            ["name"] = name,
            ["cr_by"] = crBy,
            ["is_active"] = 1
        };

        var rows = await _db.InsertTableAsync("designation", insertData);
        return rows > 0;
    }

    public async Task<bool> UpdateDesignationAsync(long entityId, long desigId, string name, bool isActive, long moBy)
    {
        var updateData = new Dictionary<string, object?>
        {
            ["name"] = name,
            ["is_active"] = isActive ? 1 : 0,
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["desig_id"] = desigId
        };

        var rows = await _db.UpdateTableAsync("designation", updateData, where);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetPlansAsync()
    {
        return await _db.QueryAsync<dynamic>("SELECT * FROM plans ORDER BY plan_id");
    }

    public async Task<bool> AddPlanAsync(IDictionary<string, object?> data, long crBy)
    {
        var nextId = await _db.GetIdAsync("plans", "plan_id", new Dictionary<string, object?>());
        var insertData = new Dictionary<string, object?>(data)
        {
            ["plan_id"] = nextId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("plans", insertData);
        return rows > 0;
    }

    public async Task<bool> UpdatePlanAsync(IDictionary<string, object?> data, long moBy)
    {
        var planId = Convert.ToInt64(data["plan_id"]);
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?> { ["plan_id"] = planId };
        var rows = await _db.UpdateTableAsync("plans", updateData, where);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetVendorsAsync(long entityId, long branchId, long? vendorId, string? type, int? page, int? limit, long? selectedBranchId)
    {
        var targetBranchId = selectedBranchId ?? branchId;
        var sql = "SELECT * FROM vendor WHERE entity_id = @entityId AND branch_id = @branchId";
        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", targetBranchId);

        if (vendorId.HasValue && vendorId.Value > 0)
        {
            sql += " AND vendor_id = @vendorId";
            dynamicParams.Add("vendorId", vendorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            sql += " AND type = @type";
            dynamicParams.Add("type", type);
        }

        sql += " ORDER BY vendor_id";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<bool> AddVendorAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("vendor", "vendor_id", new Dictionary<string, object?> { ["entity_id"] = entityId, ["branch_id"] = branchId });
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId,
            ["vendor_id"] = nextId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("vendor", insertData);
        return rows > 0;
    }

    public async Task<bool> UpdateVendorAsync(IDictionary<string, object?> data, long entityId, long branchId, long moBy)
    {
        var vendorId = Convert.ToInt64(data["vendor_id"]);
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId,
            ["vendor_id"] = vendorId
        };

        var rows = await _db.UpdateTableAsync("vendor", updateData, where);
        return rows > 0;
    }
}

