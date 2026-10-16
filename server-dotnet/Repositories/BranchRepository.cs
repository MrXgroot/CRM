using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IBranchRepository
{
    Task<IEnumerable<dynamic>> GetAllBranchesAsync(long? entityId, string? name, int? limit, int? page);
    Task<long> AddBranchAsync(IDictionary<string, object?> data, long crBy);
    Task<bool> UpdateBranchAsync(IDictionary<string, object?> data, long moBy);
}

public class BranchRepository : IBranchRepository
{
    private readonly IDbService _db;

    public BranchRepository(IDbService db)
    {
        _db = db;
    }

    public async Task<IEnumerable<dynamic>> GetAllBranchesAsync(long? entityId, string? name, int? limit, int? page)
    {
        var sql = @"
            SELECT entity_id, branch_id, name, branch_incharge_name, address1, address2, 
                   pincode, country, state, city, area, allow_yend_entry, is_active 
            FROM branch";

        var dynamicParams = new DynamicParameters();
        var whereClauses = new List<string>();

        if (entityId.HasValue && entityId.Value > 0)
        {
            whereClauses.Add("entity_id = @entityId");
            dynamicParams.Add("entityId", entityId.Value);
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            whereClauses.Add("LOWER(name) LIKE @name");
            dynamicParams.Add("name", $"%{name.ToLower()}%");
        }

        if (whereClauses.Count > 0)
        {
            sql += " WHERE " + string.Join(" AND ", whereClauses);
        }

        sql += " ORDER BY entity_id";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<long> AddBranchAsync(IDictionary<string, object?> data, long crBy)
    {
        var entityId = Convert.ToInt64(data["entity_id"]);
        var nextId = await _db.GetIdAsync("branch", "branch_id", new Dictionary<string, object?> { ["entity_id"] = entityId });

        var insertData = new Dictionary<string, object?>(data)
        {
            ["branch_id"] = nextId,
            ["cr_by"] = crBy,
            ["is_active"] = data.ContainsKey("is_active") ? data["is_active"] : 1,
            ["allow_yend_entry"] = data.ContainsKey("allow_yend_entry") ? data["allow_yend_entry"] : "N"
        };

        await _db.InsertTableAsync("branch", insertData);
        return nextId;
    }

    public async Task<bool> UpdateBranchAsync(IDictionary<string, object?> data, long moBy)
    {
        var entityId = Convert.ToInt64(data["entity_id"]);
        var branchId = Convert.ToInt64(data["branch_id"]);

        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId
        };

        var rows = await _db.UpdateTableAsync("branch", updateData, where);
        return rows > 0;
    }
}

