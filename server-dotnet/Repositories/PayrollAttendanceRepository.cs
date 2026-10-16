using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IPayrollAttendanceRepository
{
    Task<IEnumerable<dynamic>> GetHolidaysAsync(long entityId, int? limit, int? page);
    Task<bool> AddHolidayAsync(IDictionary<string, object?> data, long entityId, long crBy);
    Task<IEnumerable<dynamic>> GetLeaveMasterAsync(long entityId, string? effectiveYear, int? limit, int? page);
    Task<bool> AddLeaveMasterAsync(IDictionary<string, object?> data, long entityId, long crBy);
    Task<IEnumerable<dynamic>> GetTimeShiftsAsync(long entityId, long branchId, string? shiftCode, int? limit, int? page);
    Task<bool> AddTimeShiftAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy);
    Task<IEnumerable<dynamic>> GetSalariesAsync(long entityId, int? isLop, int? limit, int? page);
    Task<bool> AddSalaryMasterAsync(IDictionary<string, object?> data, long entityId, long crBy);
    Task<IEnumerable<dynamic>> GetSalaryStructuresAsync(long entityId, int? limit, int? page);
    Task<bool> AddSalaryStructureAsync(IDictionary<string, object?> data, long entityId, long crBy);
}

public class PayrollAttendanceRepository : IPayrollAttendanceRepository
{
    private readonly IDbService _db;

    public PayrollAttendanceRepository(IDbService db)
    {
        _db = db;
    }

    public async Task<IEnumerable<dynamic>> GetHolidaysAsync(long entityId, int? limit, int? page)
    {
        var sql = "SELECT * FROM holiday_master WHERE entity_id = @entityId ORDER BY hol_date DESC";
        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, new { entityId });
    }

    public async Task<bool> AddHolidayAsync(IDictionary<string, object?> data, long entityId, long crBy)
    {
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("holiday_master", insertData);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetLeaveMasterAsync(long entityId, string? effectiveYear, int? limit, int? page)
    {
        var sql = "SELECT * FROM leave_master WHERE entity_id = @entityId";
        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);

        if (!string.IsNullOrWhiteSpace(effectiveYear))
        {
            sql += " AND effective_year = @effectiveYear";
            dynamicParams.Add("effectiveYear", effectiveYear);
        }

        sql += " ORDER BY leave_code";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<bool> AddLeaveMasterAsync(IDictionary<string, object?> data, long entityId, long crBy)
    {
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("leave_master", insertData);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetTimeShiftsAsync(long entityId, long branchId, string? shiftCode, int? limit, int? page)
    {
        var sql = "SELECT * FROM timeshift_master WHERE entity_id = @entityId AND branch_id = @branchId";
        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", branchId);

        if (!string.IsNullOrWhiteSpace(shiftCode))
        {
            sql += " AND shift_code = @shiftCode";
            dynamicParams.Add("shiftCode", shiftCode);
        }

        sql += " ORDER BY shift_code";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<bool> AddTimeShiftAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy)
    {
        var nextId = await _db.GetIdAsync("timeshift_master", "shift_code", new Dictionary<string, object?> { ["entity_id"] = entityId, ["branch_id"] = branchId });
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId,
            ["shift_code"] = nextId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("timeshift_master", insertData);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetSalariesAsync(long entityId, int? isLop, int? limit, int? page)
    {
        var sql = "SELECT * FROM salary_master WHERE entity_id = @entityId";
        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);

        if (isLop.HasValue)
        {
            sql += " AND is_lop = @isLop";
            dynamicParams.Add("isLop", isLop.Value);
        }

        sql += " ORDER BY salary_code";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<bool> AddSalaryMasterAsync(IDictionary<string, object?> data, long entityId, long crBy)
    {
        var nextId = await _db.GetIdAsync("salary_master", "salary_code", new Dictionary<string, object?> { ["entity_id"] = entityId });
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["salary_code"] = nextId,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("salary_master", insertData);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetSalaryStructuresAsync(long entityId, int? limit, int? page)
    {
        var sql = "SELECT * FROM salary_structure WHERE entity_id = @entityId ORDER BY effective_date DESC";
        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, new { entityId });
    }

    public async Task<bool> AddSalaryStructureAsync(IDictionary<string, object?> data, long entityId, long crBy)
    {
        var nextId = await _db.GetIdAsync("salary_structure", "structure_code", new Dictionary<string, object?> { ["entity_id"] = entityId });
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["structure_code"] = nextId,
            ["cr_by"] = crBy
        };

        var skip = new[] { "data" };
        var rows = await _db.InsertTableAsync("salary_structure", insertData, skip);
        return rows > 0;
    }
}

