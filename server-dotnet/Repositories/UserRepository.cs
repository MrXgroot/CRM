using System.Data;
using Matrika.Api.Common;
using Matrika.Api.Models;
using Matrika.Api.Services;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IUserRepository
{
    Task<(bool Success, object? Data, string? ErrorMessage)> LoginAsync(LoginRequest request);
    Task<bool> CheckSessionAsync(string userName);
    Task<bool> ForceLogoutAsync(string userName);
    Task<bool> LogoutAsync(string userName, long entityId);
    Task<bool> ChangePasswordAsync(ChangePasswordRequest request);
    Task<IEnumerable<dynamic>> GetAllUsersAsync(long entityId, string? userName, long? roleId, int? limit, int? page);
    Task<bool> AddUserAsync(IDictionary<string, object?> data, long entityId, long crBy);
    Task<bool> UpdateUserAsync(IDictionary<string, object?> data, long entityId, long moBy);
}

public class UserRepository : IUserRepository
{
    private readonly IDbService _db;
    private readonly ITokenService _tokenService;
    private readonly IEncryptionService _encryption;
    private readonly ILogger<UserRepository> _logger;

    public UserRepository(
        IDbService db,
        ITokenService tokenService,
        IEncryptionService encryption,
        ILogger<UserRepository> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _encryption = encryption;
        _logger = logger;
    }

    public async Task<(bool Success, object? Data, string? ErrorMessage)> LoginAsync(LoginRequest request)
    {
        try
        {
            var sql = @"
                SELECT u.entity_id, u.user_id, u.user_name, u.user_password, u.role_id, u.full_name,
                       u.user_active, u.branch_id, u.desig_id, u.imageFile, u.twofa_enabled,
                       r.role_name, r.is_superadmin, r.is_admin, r.is_staff, r.is_active,
                       e.additional_info, e.s3_cloudfront_url, e.default_home_page, NULL as entityImage,
                       DATE_FORMAT(e.expiry_date, '%Y-%m-%d') AS expiry_date
                FROM users u
                JOIN roles r USING (entity_id, role_id)
                JOIN entity e USING (entity_id)
                WHERE LOWER(TRIM(u.user_name)) = @userName";

            var user = await _db.QuerySingleOrDefaultAsync<dynamic>(sql, new { userName = request.Email.Trim().ToLowerInvariant() });

            if (user == null)
            {
                var fallbackSql = @"
                    SELECT u.entity_id, u.user_id, u.user_name, u.user_password, u.role_id, u.full_name,
                           u.user_active, u.branch_id, u.desig_id, u.imageFile, u.twofa_enabled,
                           r.role_name, r.is_superadmin, r.is_admin, r.is_staff, r.is_active,
                           e.additional_info, e.s3_cloudfront_url, e.default_home_page, NULL as entityImage,
                           DATE_FORMAT(e.expiry_date, '%Y-%m-%d') AS expiry_date
                    FROM users u
                    JOIN roles r USING (entity_id, role_id)
                    JOIN entity e USING (entity_id)
                    WHERE LOWER(TRIM(u.user_name)) = LOWER(TRIM(@userName))";

                user = await _db.QuerySingleOrDefaultAsync<dynamic>(fallbackSql, new { userName = request.Email.Trim().ToLowerInvariant() });
            }

            if (user == null)
            {
                return (false, null, "Invalid email or password");
            }

            var userDict = new Dictionary<string, object?>((IDictionary<string, object?>)user!);

            // Decrypt PII
            if (userDict.TryGetValue("full_name", out var fn) && fn is string fnStr)
            {
                userDict["full_name"] = _encryption.Decrypt(fnStr);
            }

            // Check subscription expiration if not superadmin
            var isSuperadmin = Convert.ToInt32(userDict["is_superadmin"]) == 1;
            if (!isSuperadmin)
            {
                var expiryDateStr = userDict["expiry_date"]?.ToString();
                if (string.IsNullOrEmpty(expiryDateStr) || string.Compare(expiryDateStr, DateTime.UtcNow.ToString("yyyy-MM-dd"), StringComparison.Ordinal) < 0)
                {
                    return (false, null, "Subscription expired! Please contact the admin");
                }
            }

            var storedHash = userDict["user_password"]?.ToString() ?? "";
            var passwordMatch = false;

            try
            {
                passwordMatch = BCrypt.Net.BCrypt.Verify(request.Password, storedHash);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Password verify error for {UserName}", request.Email.Trim().ToLowerInvariant());
            }

            if (!passwordMatch)
            {
                return (false, null, "Invalid email or password");
            }

            var userActive = Convert.ToInt32(userDict["user_active"]);
            var roleActive = Convert.ToInt32(userDict["is_active"]);
            if (userActive == 0 || roleActive == 0)
            {
                return (false, null, "User/Role is disabled");
            }

            var twofaEnabled = Convert.ToInt32(userDict["twofa_enabled"]) == 1;
            if (twofaEnabled)
            {
                var tempTokenClaims = new Dictionary<string, object>
                {
                    { "twofa_pending", true },
                    { "entity_id", userDict["entity_id"]! },
                    { "user_id", userDict["user_id"]! },
                    { "user_name", userDict["user_name"]! },
                    { "full_name", userDict["full_name"] ?? "" },
                    { "role_name", userDict["role_name"] ?? "" }
                };

                var tempToken = _tokenService.GenerateToken(tempTokenClaims, TimeSpan.FromMinutes(5));

                var twofaResponse = new
                {
                    twofa_required = true,
                    temp_token = tempToken,
                    user = new
                    {
                        user_name = userDict["user_name"],
                        entity_id = userDict["entity_id"],
                        full_name = userDict["full_name"],
                        role_name = userDict["role_name"]
                    }
                };

                return (true, twofaResponse, null);
            }

            // Build regular login response
            var loginResponse = await BuildLoginResponseAsync(userDict);
            return (true, loginResponse, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in LoginAsync");
            return (false, null, ex.Message);
        }
    }

    private async Task<object> BuildLoginResponseAsync(IDictionary<string, object?> userDict)
    {
        var claims = new Dictionary<string, object>
        {
            { "entity_id", userDict["entity_id"]! },
            { "user_name", userDict["user_name"]! },
            { "full_name", userDict["full_name"] ?? "" },
            { "role_name", userDict["role_name"] ?? "" },
            { "role_id", userDict["role_id"]! },
            { "is_superadmin", userDict["is_superadmin"]! },
            { "is_admin", userDict["is_admin"]! },
            { "is_staff", userDict["is_staff"]! },
            { "user_id", userDict["user_id"]! },
            { "desig_id", userDict["desig_id"] ?? 0 }
        };

        var token = _tokenService.GenerateToken(claims);

        // Record session
        await _db.ExecuteAsync(
            "INSERT INTO session (entity_id, user_id, token, log_type, login_time) VALUES (@entityId, @userId, @token, 'LI', NOW())",
            new { entityId = userDict["entity_id"], userId = userDict["user_id"], token }
        );

        var isSuperadmin = Convert.ToInt32(userDict["is_superadmin"]) == 1;
        var entityId = Convert.ToInt64(userDict["entity_id"]);
        var roleId = Convert.ToInt64(userDict["role_id"]);
        var userBranchId = userDict["branch_id"] != null ? Convert.ToInt64(userDict["branch_id"]) : (long?)null;

        List<dynamic> pageAccessList = new();
        List<dynamic> branchAccessList = new();

        if (isSuperadmin)
        {
            var pages = (await _db.QueryAsync<dynamic>("SELECT * FROM pages")).ToList();
            var pageActions = (await _db.QueryAsync<dynamic>("SELECT action_id, page_id, action_desc, action_name FROM page_actions")).ToList();
            var branches = (await _db.QueryAsync<dynamic>("SELECT branch_id, name, is_active FROM branch WHERE entity_id = @entityId", new { entityId })).ToList();

            foreach (var page in pages)
            {
                var pageDict = new Dictionary<string, object?>((IDictionary<string, object?>)page!);
                var pageId = Convert.ToInt64(pageDict["page_id"]);

                var matchingActions = pageActions
                    .Where(a => Convert.ToInt64(((IDictionary<string, object?>)a)["page_id"]) == pageId)
                    .Select(a =>
                    {
                        var ad = (IDictionary<string, object?>)a;
                        return (object)new
                        {
                            action_id = ad["action_id"],
                            action_name = ad["action_name"],
                            action_desc = ad["action_desc"]
                        };
                    })
                    .ToList();

                pageAccessList.Add(new
                {
                    url = pageDict["page_name"],
                    access_to_add = 1,
                    access_to_update = 1,
                    access_to_delete = 1,
                    access_to_export = 1,
                    extra_actions = matchingActions
                });
            }

            branchAccessList = branches;
        }
        else
        {
            var pageQuery = @"
                SELECT PA.page_id, P.page_name AS url, PA.access_to_add, PA.access_to_update, PA.access_to_delete, PA.access_to_export
                FROM page_access PA
                JOIN pages P ON P.page_id = PA.page_id
                WHERE PA.entity_id = @entityId AND PA.role_id = @roleId
                UNION ALL
                SELECT NULL AS page_id, page_name AS url, 1 AS access_to_add, 1 AS access_to_update, 1 AS access_to_delete, 1 AS access_to_export
                FROM pages
                WHERE superadmin_only = 0 AND access_for_all = 1";

            var pages = (await _db.QueryAsync<dynamic>(pageQuery, new { entityId, roleId })).ToList();

            var pageActionsQuery = @"
                SELECT pc.page_id, pc.action_id, pa.action_name, pa.action_desc
                FROM page_actions_access pc
                LEFT JOIN page_actions pa ON pa.page_id = pc.page_id AND pa.action_id = pc.action_id
                WHERE pc.entity_id = @entityId AND pc.role_id = @roleId";

            var pageActionsAccess = (await _db.QueryAsync<dynamic>(pageActionsQuery, new { entityId, roleId })).ToList();

            foreach (var page in pages)
            {
                var pageDict = new Dictionary<string, object?>((IDictionary<string, object?>)page!);
                var pageId = pageDict["page_id"] != null ? Convert.ToInt64(pageDict["page_id"]) : (long?)null;

                var extraActions = pageId.HasValue
                    ? pageActionsAccess
                        .Where(a => Convert.ToInt64(((IDictionary<string, object?>)a)["page_id"]) == pageId.Value)
                        .Select(a =>
                        {
                            var ad = (IDictionary<string, object?>)a;
                            return (object)new
                            {
                                page_id = ad["page_id"],
                                action_id = ad["action_id"],
                                action_name = ad["action_name"],
                                action_desc = ad["action_desc"]
                            };
                        })
                        .ToList()
                    : new List<object>();

                pageAccessList.Add(new
                {
                    page_id = pageDict["page_id"],
                    url = pageDict["url"],
                    access_to_add = Convert.ToInt32(pageDict["access_to_add"]),
                    access_to_update = Convert.ToInt32(pageDict["access_to_update"]),
                    access_to_delete = Convert.ToInt32(pageDict["access_to_delete"]),
                    access_to_export = Convert.ToInt32(pageDict.GetValueOrDefault("access_to_export", 1)),
                    extra_actions = extraActions
                });
            }

            var branchQuery = @"
                SELECT b.branch_id, b.name, b.is_active
                FROM branch b
                JOIN role_branch_access rba ON b.branch_id = rba.branch_id AND b.entity_id = rba.entity_id
                WHERE rba.entity_id = @entityId AND rba.role_id = @roleId AND b.is_active = 1";

            var branches = (await _db.QueryAsync<dynamic>(branchQuery, new { entityId, roleId })).ToList();

            if (branches.Count == 0)
            {
                var isAdmin = Convert.ToInt32(userDict["is_admin"]) == 1;
                if (isAdmin)
                {
                    branches = (await _db.QueryAsync<dynamic>(
                        "SELECT branch_id, name, is_active FROM branch WHERE entity_id = @entityId AND is_active = 1",
                        new { entityId }
                    )).ToList();
                }
                else if (userBranchId.HasValue)
                {
                    branches = (await _db.QueryAsync<dynamic>(
                        "SELECT branch_id, name, is_active FROM branch WHERE entity_id = @entityId AND branch_id = @userBranchId AND is_active = 1",
                        new { entityId, userBranchId = userBranchId.Value }
                    )).ToList();
                }
            }

            // Ensure own branch is included
            if (userBranchId.HasValue && !branches.Any(b => Convert.ToInt64(((IDictionary<string, object?>)b)["branch_id"]) == userBranchId.Value))
            {
                var ownBranch = (await _db.QueryAsync<dynamic>(
                    "SELECT branch_id, name, is_active FROM branch WHERE entity_id = @entityId AND branch_id = @userBranchId AND is_active = 1",
                    new { entityId, userBranchId = userBranchId.Value }
                )).ToList();

                branches.AddRange(ownBranch);
            }

            branchAccessList = branches;
        }

        // Remove sensitive fields before returning user object
        userDict.Remove("user_password");

        return new
        {
            user = userDict,
            token,
            pageAccess = pageAccessList,
            branchAccess = branchAccessList
        };
    }

    public async Task<bool> CheckSessionAsync(string userName)
    {
        try
        {
            var user = await _db.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT u.entity_id, u.user_name, u.user_id FROM users u WHERE BINARY user_name = @userName",
                new { userName }
            );

            if (user == null) return false;

            var userDict = (IDictionary<string, object?>)user;
            var userId = userDict["user_id"];
            var entityId = userDict["entity_id"];

            var sessions = (await _db.QueryAsync<dynamic>(
                @"SELECT token, log_type, session_id, login_time, logout_time, entity_id
                  FROM session
                  WHERE user_id = @userId AND entity_id = @entityId AND logout_time IS NULL",
                new { userId, entityId }
            )).ToList();

            if (sessions.Count == 0) return false;

            var firstSession = (IDictionary<string, object?>)sessions[0];
            if (firstSession.TryGetValue("login_time", out var ltObj) && ltObj is DateTime loginTime)
            {
                if (loginTime.Date != DateTime.UtcNow.Date)
                {
                    await _db.ExecuteAsync(
                        "UPDATE session SET log_type = 'LO', logout_time = NOW() WHERE user_id = @userId AND log_type = 'LI' AND entity_id = @entityId AND logout_time IS NULL",
                        new { userId, entityId }
                    );
                    return false;
                }
            }

            var hasActive = sessions.Any(s =>
            {
                var sd = (IDictionary<string, object?>)s;
                return sd["log_type"]?.ToString() == "LI" && !string.IsNullOrEmpty(sd["token"]?.ToString());
            });

            return hasActive;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CheckSessionAsync");
            return false;
        }
    }

    public async Task<bool> ForceLogoutAsync(string userName)
    {
        try
        {
            var user = await _db.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT u.entity_id, u.user_name, u.user_id FROM users u WHERE BINARY user_name = @userName",
                new { userName }
            );

            if (user == null) return false;

            var userDict = (IDictionary<string, object?>)user;
            var rows = await _db.ExecuteAsync(
                "UPDATE session SET log_type = 'LO', logout_time = NOW() WHERE user_id = @userId AND log_type = 'LI' AND entity_id = @entityId AND logout_time IS NULL",
                new { userId = userDict["user_id"], entityId = userDict["entity_id"] }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ForceLogoutAsync");
            return false;
        }
    }

    public async Task<bool> LogoutAsync(string userName, long entityId)
    {
        try
        {
            var user = await _db.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT user_id FROM users WHERE BINARY user_name = @userName",
                new { userName }
            );

            if (user == null) return false;

            var userDict = (IDictionary<string, object?>)user;
            var rows = await _db.ExecuteAsync(
                "UPDATE session SET log_type = 'LO', logout_time = NOW() WHERE user_id = @userId AND log_type = 'LI' AND entity_id = @entityId",
                new { userId = userDict["user_id"], entityId }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in LogoutAsync");
            return false;
        }
    }

    public async Task<bool> ChangePasswordAsync(ChangePasswordRequest request)
    {
        try
        {
            var existingHash = await _db.QuerySingleOrDefaultAsync<string>("SELECT user_password FROM users WHERE user_name=@UserName AND entity_id=@EntityId",request);
            if (string.IsNullOrEmpty(existingHash) || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword,existingHash)) return false;
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.UserPassword);
            var rows = await _db.ExecuteAsync(
                "UPDATE users SET user_password = @hashedPassword WHERE user_name = @userName AND entity_id = @entityId",
                new { hashedPassword, userName = request.UserName, entityId = request.EntityId, branchId = request.BranchId }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChangePasswordAsync");
            return false;
        }
    }

    public async Task<IEnumerable<dynamic>> GetAllUsersAsync(long entityId, string? userName, long? roleId, int? limit, int? page)
    {
        var sql = @"
            SELECT u.entity_id, u.user_id, u.user_name, u.role_id, u.full_name,
                   u.user_active, u.branch_id, u.desig_id, u.imageFile,
                   u.shift_code, u.joining_date, u.emp_structure_code, u.reporting_to,
                   u.pan_num, u.uan, u.esi, u.bank_acc_num, u.bank_ifsc_code, u.bank_name,
                   u.bank_acc_type, u.bank_location, u.bank_branch_name,
                   r.role_name, r.is_superadmin, r.is_admin, r.is_staff,
                   d.name as desig_name
            FROM users u
            LEFT JOIN roles r ON u.entity_id = r.entity_id AND u.role_id = r.role_id
            LEFT JOIN designation d ON u.entity_id = d.entity_id AND u.desig_id = d.desig_id
            WHERE u.entity_id = @entityId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);

        if (!string.IsNullOrWhiteSpace(userName))
        {
            sql += " AND LOWER(u.user_name) LIKE @userName";
            dynamicParams.Add("userName", $"%{userName.ToLower()}%");
        }

        if (roleId.HasValue && roleId.Value > 0)
        {
            sql += " AND u.role_id = @roleId";
            dynamicParams.Add("roleId", roleId.Value);
        }

        sql += " ORDER BY u.user_id";

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        var list = (await _db.QueryAsync<dynamic>(sql, dynamicParams)).ToList();

        var result = new List<dynamic>();
        foreach (var item in list)
        {
            var dict = new Dictionary<string, object?>(item as IDictionary<string, object?>);
            if (dict.TryGetValue("full_name", out var fn) && fn is string fnStr)
            {
                dict["full_name"] = _encryption.Decrypt(fnStr);
            }
            if (dict.TryGetValue("pan_num", out var pan) && pan is string panStr)
            {
                dict["pan_num"] = _encryption.Decrypt(panStr);
            }
            if (dict.TryGetValue("uan", out var uan) && uan is string uanStr)
            {
                dict["uan"] = _encryption.Decrypt(uanStr);
            }
            if (dict.TryGetValue("esi", out var esi) && esi is string esiStr)
            {
                dict["esi"] = _encryption.Decrypt(esiStr);
            }
            if (dict.TryGetValue("bank_acc_num", out var acc) && acc is string accStr)
            {
                dict["bank_acc_num"] = _encryption.Decrypt(accStr);
            }
            result.Add(dict);
        }

        return result;
    }

    public async Task<bool> AddUserAsync(IDictionary<string, object?> data, long entityId, long crBy)
    {
        data = Normalize(data);
        if (!data.TryGetValue("user_name", out var identity) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(identity?.ToString()))
            throw new ArgumentException("A valid email address is required.");
        data["user_name"] = identity!.ToString()!.Trim().ToLowerInvariant();
        var duplicate = await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM users WHERE LOWER(TRIM(user_name))=@email",
            new {email=data["user_name"],entityId,userId=(data.TryGetValue("user_id",out var suppliedId) ? suppliedId : 0)});
        if (duplicate>0) throw new ArgumentException("This email address is already in use.");
        var password = (data.TryGetValue("user_password",out var suppliedPassword) ? suppliedPassword?.ToString() : null);
        if (password != null && password.Length>0 && (password.Length<8 || System.Text.Encoding.UTF8.GetByteCount(password)>72))
            throw new ArgumentException("Use a password of at least 8 characters and at most 72 UTF-8 bytes.");

        if (string.IsNullOrWhiteSpace(password)) throw new ArgumentException("Password is required.");
        var nextId = await _db.GetIdAsync("users", "user_id", new Dictionary<string, object?> { ["entity_id"] = entityId });
        var insertData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["user_id"] = nextId,
            ["cr_by"] = crBy
        };

        if (insertData.TryGetValue("user_password", out var pwd) && pwd is string pwdStr && !string.IsNullOrEmpty(pwdStr))
        {
            insertData["user_password"] = BCrypt.Net.BCrypt.HashPassword(pwdStr);
        }
        if (insertData.TryGetValue("full_name", out var fn) && fn is string fnStr && !string.IsNullOrEmpty(fnStr))
        {
            insertData["full_name"] = _encryption.Encrypt(fnStr);
        }
        if (insertData.TryGetValue("pan_num", out var pan) && pan is string panStr && !string.IsNullOrEmpty(panStr))
        {
            insertData["pan_num"] = _encryption.Encrypt(panStr);
        }
        if (insertData.TryGetValue("uan", out var uan) && uan is string uanStr && !string.IsNullOrEmpty(uanStr))
        {
            insertData["uan"] = _encryption.Encrypt(uanStr);
        }
        if (insertData.TryGetValue("esi", out var esi) && esi is string esiStr && !string.IsNullOrEmpty(esiStr))
        {
            insertData["esi"] = _encryption.Encrypt(esiStr);
        }
        if (insertData.TryGetValue("bank_acc_num", out var acc) && acc is string accStr && !string.IsNullOrEmpty(accStr))
        {
            insertData["bank_acc_num"] = _encryption.Encrypt(accStr);
        }

        var skip = new[] { "ProfileImg", "role_name", "desig_name", "is_admin", "is_superadmin", "is_staff" };
        var rows = await _db.InsertTableAsync("users", insertData, skip);
        return rows > 0;
    }

    public async Task<bool> UpdateUserAsync(IDictionary<string, object?> data, long entityId, long moBy)
    {
        data = Normalize(data);
        if (!data.TryGetValue("user_name", out var identity) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(identity?.ToString()))
            throw new ArgumentException("A valid email address is required.");
        data["user_name"] = identity!.ToString()!.Trim().ToLowerInvariant();
        var duplicate = await _db.QuerySingleOrDefaultAsync<int>("SELECT COUNT(*) FROM users WHERE LOWER(TRIM(user_name))=@email AND NOT(entity_id=@entityId AND user_id=@userId)",
            new {email=data["user_name"],entityId,userId=(data.TryGetValue("user_id",out var suppliedId) ? suppliedId : 0)});
        if (duplicate>0) throw new ArgumentException("This email address is already in use.");
        var password = (data.TryGetValue("user_password",out var suppliedPassword) ? suppliedPassword?.ToString() : null);
        if (password != null && password.Length>0 && (password.Length<8 || System.Text.Encoding.UTF8.GetByteCount(password)>72))
            throw new ArgumentException("Use a password of at least 8 characters and at most 72 UTF-8 bytes.");

        var updateData = new Dictionary<string, object?>(data)
        {
            ["entity_id"] = entityId,
            ["mo_by"] = moBy
        };

        if (updateData.TryGetValue("user_password", out var pwd) && pwd is string pwdStr && !string.IsNullOrEmpty(pwdStr))
        {
            updateData["user_password"] = BCrypt.Net.BCrypt.HashPassword(pwdStr);
        }
        else
        {
            updateData.Remove("user_password");
        }

        if (updateData.TryGetValue("full_name", out var fn) && fn is string fnStr && !string.IsNullOrEmpty(fnStr))
        {
            updateData["full_name"] = _encryption.Encrypt(fnStr);
        }
        if (updateData.TryGetValue("pan_num", out var pan) && pan is string panStr && !string.IsNullOrEmpty(panStr))
        {
            updateData["pan_num"] = _encryption.Encrypt(panStr);
        }
        if (updateData.TryGetValue("uan", out var uan) && uan is string uanStr && !string.IsNullOrEmpty(uanStr))
        {
            updateData["uan"] = _encryption.Encrypt(uanStr);
        }
        if (updateData.TryGetValue("esi", out var esi) && esi is string esiStr && !string.IsNullOrEmpty(esiStr))
        {
            updateData["esi"] = _encryption.Encrypt(esiStr);
        }
        if (updateData.TryGetValue("bank_acc_num", out var acc) && acc is string accStr && !string.IsNullOrEmpty(accStr))
        {
            updateData["bank_acc_num"] = _encryption.Encrypt(accStr);
        }

        var where = new Dictionary<string, object?>
        {
            ["entity_id"] = entityId,
            ["user_id"] = updateData["user_id"]
        };

        var skip = new[] { "entity_id", "user_id", "ProfileImg", "role_name", "desig_name", "is_admin", "is_superadmin", "is_staff" };
        var rows = await _db.UpdateTableAsync("users", updateData, where, skip);
        await _db.ExecuteAsync("UPDATE session SET log_type='LO',logout_time=NOW() WHERE entity_id=@entityId AND user_id=@userId AND logout_time IS NULL",new {entityId,userId=updateData["user_id"]});
        return rows > 0;
    }
    private static Dictionary<string,object?> Normalize(IDictionary<string,object?> data) => data.ToDictionary(k=>k.Key,k=>k.Value is System.Text.Json.JsonElement j ? j.ValueKind switch {
        System.Text.Json.JsonValueKind.String => (object?)j.GetString(),
        System.Text.Json.JsonValueKind.Number => j.TryGetInt64(out var n) ? (object)n : j.GetDecimal(),
        System.Text.Json.JsonValueKind.True => true,
        System.Text.Json.JsonValueKind.False => false,
        System.Text.Json.JsonValueKind.Null => null,
        _ => (object?)j.ToString()
    } : k.Value);

}

