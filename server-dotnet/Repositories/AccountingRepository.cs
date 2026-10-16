using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IAccountingRepository
{
    Task<IEnumerable<dynamic>> GetGlMasterAsync(long entityId, long branchId, long? selectedBranchId, string? glIncmExp, string? bscCode, int? limit, int? page);
    Task<string?> AddGlMasterAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy);
    Task<bool> UpdateGlMasterAsync(IDictionary<string, object?> data, long entityId, long branchId, long moBy);
    Task<IEnumerable<dynamic>> GetBalanceSheetCategoriesAsync(long entityId, int? limit, int? page);
    Task<bool> AddBalanceSheetCategoryAsync(long entityId, string desc, string type, long crBy);
    Task<bool> UpdateBalanceSheetCategoryAsync(long entityId, long categoryCode, string desc, string type, long moBy);
    Task<IEnumerable<dynamic>> GetDayBookAsync(long entityId, long branchId, string? bookType, long? glCode, string? fromDate, string? uptoDate);
    Task<IEnumerable<dynamic>> GetTrialBalanceAsync(long entityId, long branchId, string? fromDate, string? uptoDate);
    Task<IEnumerable<dynamic>> GetAccountLedgerAsync(long entityId, long branchId, string? glCode, string? fromDate, string? uptoDate, string? custType, string? custCode, string? vendCode, long? ordCode, int? page, int? limit);
}

public class AccountingRepository : IAccountingRepository
{
    private readonly IDbService _db;

    public AccountingRepository(IDbService db)
    {
        _db = db;
    }

    public async Task<IEnumerable<dynamic>> GetGlMasterAsync(long entityId, long branchId, long? selectedBranchId, string? glIncmExp, string? bscCode, int? limit, int? page)
    {
        var targetBranchId = (selectedBranchId.HasValue && selectedBranchId.Value > 0) ? selectedBranchId.Value : branchId;
        var systemDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var sql = $@"
            SELECT 
                g.entity_id, 
                g.branch_id, 
                g.purchase_gl, 
                g.sales_gl, 
                g.stock_adjustment_gl,
                g.gl_code, 
                DATE_FORMAT(g.gl_eff_date, '%Y-%m-%d') AS gl_eff_date, 
                g.gl_desc, 
                g.bsc_code, 
                g.gl_incm_exp, 
                g.gl_type, 
                g.gl_open_bal, 
                g.gl_open_bal_drcr, 
                g.salary_gl, 
                g.profit_loss_gl, 
                g.round_off_gl,
                g.admin_gl, 
                g.gl_active, 
                g.cgst, 
                g.igst, 
                g.sgst, 
                b.category_desc, 
                (
                    SELECT CONCAT(ROUND(g2.glsum_opng_bal, 2), ' ', g2.glsum_open_bal_drcr, 'R')
                    FROM glsum g2 
                    WHERE 
                        g.entity_id = g2.entity_id AND g.branch_id = g2.branch_id 
                        AND g.gl_code = g2.glsum_gl_code 
                        AND g2.glsum_opng_bal > 0 
                        AND g2.glsum_fin_year = FN_GETFINYEAR(DATE('{systemDate}'))
                    LIMIT 1
                ) AS opbal
            FROM gl_master g
            JOIN balance_sheet_category b 
                ON g.entity_id = b.entity_id 
                AND g.bsc_code = b.category_code
            WHERE g.entity_id = @entityId 
            AND g.branch_id = @branchId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", targetBranchId);

        if (!string.IsNullOrWhiteSpace(glIncmExp))
        {
            sql += " AND g.gl_incm_exp = @glIncmExp";
            dynamicParams.Add("glIncmExp", glIncmExp);
        }

        if (!string.IsNullOrWhiteSpace(bscCode))
        {
            sql += " AND g.bsc_code = @bscCode";
            dynamicParams.Add("bscCode", bscCode);
        }

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<string?> AddGlMasterAsync(IDictionary<string, object?> data, long entityId, long branchId, long crBy)
    {
        var maxRow = await _db.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(gl_code, 3) AS UNSIGNED)), 0) + 1 AS next_code FROM gl_master WHERE entity_id = @entityId AND branch_id = @branchId",
            new { entityId, branchId }
        );

        long nextCode = 1;
        if (maxRow != null)
        {
            var d = (IDictionary<string, object?>)maxRow;
            nextCode = Convert.ToInt64(d["next_code"]);
        }

        var glCode = $"AH{nextCode:D4}";

        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId,
            ["gl_code"] = glCode,
            ["cr_by"] = crBy,
            ["gl_active"] = data.ContainsKey("gl_active") ? data["gl_active"] : "1"
        };

        var rows = await _db.InsertTableAsync("gl_master", insertData);
        return rows > 0 ? glCode : null;
    }

    public async Task<bool> UpdateGlMasterAsync(IDictionary<string, object?> data, long entityId, long branchId, long moBy)
    {
        var glCode = data["gl_code"]?.ToString() ?? "";
        var updateData = new Dictionary<string, object?>(data)
        {
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["branch_id"] = branchId,
            ["gl_code"] = glCode
        };

        var rows = await _db.UpdateTableAsync("gl_master", updateData, where);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetBalanceSheetCategoriesAsync(long entityId, int? limit, int? page)
    {
        var sql = "SELECT * FROM balance_sheet_category WHERE entity_id = @entityId ORDER BY category_code";
        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, new { entityId });
    }

    public async Task<bool> AddBalanceSheetCategoryAsync(long entityId, string desc, string type, long crBy)
    {
        var nextId = await _db.GetIdAsync("balance_sheet_category", "category_code", new Dictionary<string, object?> { ["entity_id"] = entityId });
        var insertData = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["category_code"] = nextId,
            ["category_desc"] = desc,
            ["category_type"] = type,
            ["cr_by"] = crBy
        };

        var rows = await _db.InsertTableAsync("balance_sheet_category", insertData);
        return rows > 0;
    }

    public async Task<bool> UpdateBalanceSheetCategoryAsync(long entityId, long categoryCode, string desc, string type, long moBy)
    {
        var updateData = new Dictionary<string, object?>
        {
            ["category_desc"] = desc,
            ["category_type"] = type,
            ["mo_by"] = moBy
        };

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["category_code"] = categoryCode
        };

        var rows = await _db.UpdateTableAsync("balance_sheet_category", updateData, where);
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetDayBookAsync(long entityId, long branchId, string? bookType, long? glCode, string? fromDate, string? uptoDate)
    {
        var sql = @"
            SELECT d.entity_id, d.branch_id, d.trans_date, d.vouch_type, d.vouch_num, d.gl_code,
                   d.amt_type, d.amount, d.narration, g.gl_desc 
            FROM daybook d
            LEFT JOIN gl_master g ON d.entity_id = g.entity_id AND d.branch_id = g.branch_id AND d.gl_code = g.gl_code
            WHERE d.entity_id = @entityId AND d.branch_id = @branchId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", branchId);

        if (!string.IsNullOrWhiteSpace(bookType))
        {
            sql += " AND d.vouch_type = @bookType";
            dynamicParams.Add("bookType", bookType);
        }

        if (glCode.HasValue && glCode.Value > 0)
        {
            sql += " AND d.gl_code = @glCode";
            dynamicParams.Add("glCode", glCode.Value);
        }

        if (!string.IsNullOrWhiteSpace(fromDate))
        {
            sql += " AND d.trans_date >= @fromDate";
            dynamicParams.Add("fromDate", fromDate);
        }

        if (!string.IsNullOrWhiteSpace(uptoDate))
        {
            sql += " AND d.trans_date <= @uptoDate";
            dynamicParams.Add("uptoDate", uptoDate);
        }

        sql += " ORDER BY d.trans_date, d.vouch_num";
        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<IEnumerable<dynamic>> GetTrialBalanceAsync(long entityId, long branchId, string? fromDate, string? uptoDate)
    {
        var sql = @"
            SELECT g.gl_code, g.gl_desc, g.gl_incm_exp, g.gl_type, b.category_desc,
                   SUM(CASE WHEN d.amt_type = 'DR' THEN d.amount ELSE 0 END) AS total_debit,
                   SUM(CASE WHEN d.amt_type = 'CR' THEN d.amount ELSE 0 END) AS total_credit
            FROM gl_master g
            JOIN balance_sheet_category b ON g.entity_id = b.entity_id AND g.bsc_code = b.category_code
            LEFT JOIN daybook d ON g.entity_id = d.entity_id AND g.branch_id = d.branch_id AND g.gl_code = d.gl_code
            WHERE g.entity_id = @entityId AND g.branch_id = @branchId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", branchId);

        if (!string.IsNullOrWhiteSpace(fromDate))
        {
            sql += " AND d.trans_date >= @fromDate";
            dynamicParams.Add("fromDate", fromDate);
        }

        if (!string.IsNullOrWhiteSpace(uptoDate))
        {
            sql += " AND d.trans_date <= @uptoDate";
            dynamicParams.Add("uptoDate", uptoDate);
        }

        sql += " GROUP BY g.gl_code, g.gl_desc, g.gl_incm_exp, g.gl_type, b.category_desc ORDER BY g.gl_code";
        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }

    public async Task<IEnumerable<dynamic>> GetAccountLedgerAsync(long entityId, long branchId, string? glCode, string? fromDate, string? uptoDate, string? custType, string? custCode, string? vendCode, long? ordCode, int? page, int? limit)
    {
        var sql = @"
            SELECT d.entity_id, d.branch_id, d.trans_date, d.vouch_type, d.vouch_num, d.gl_code,
                   d.amt_type, d.amount, d.narration, g.gl_desc 
            FROM daybook d
            JOIN gl_master g ON d.entity_id = g.entity_id AND d.branch_id = g.branch_id AND d.gl_code = g.gl_code
            WHERE d.entity_id = @entityId AND d.branch_id = @branchId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);
        dynamicParams.Add("branchId", branchId);

        if (!string.IsNullOrWhiteSpace(glCode))
        {
            sql += " AND d.gl_code = @glCode";
            dynamicParams.Add("glCode", glCode);
        }

        if (!string.IsNullOrWhiteSpace(fromDate))
        {
            sql += " AND d.trans_date >= @fromDate";
            dynamicParams.Add("fromDate", fromDate);
        }

        if (!string.IsNullOrWhiteSpace(uptoDate))
        {
            sql += " AND d.trans_date <= @uptoDate";
            dynamicParams.Add("uptoDate", uptoDate);
        }

        sql += " ORDER BY d.trans_date, d.vouch_num";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        return await _db.QueryAsync<dynamic>(sql, dynamicParams);
    }
}

