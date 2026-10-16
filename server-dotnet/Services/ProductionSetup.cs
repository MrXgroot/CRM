using System.Data;
using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using Matrika.Api.Common;
using MySqlConnector;

namespace Matrika.Api.Services;

/// <summary>
/// Safe, explicit production database bootstrap workflow for Matrika CRM.
/// Reuses existing SQL migrations, strictly isolates target database, enforces
/// production security, and refuses to touch existing/non-empty databases.
/// </summary>
public static class ProductionSetup
{
    public const string DefaultExpectedDatabase = "matrika_crm";

    public static async Task Run(IServiceProvider services, IConfiguration config, IHostEnvironment env, string[] args)
    {
        Console.WriteLine("================================================================");
        Console.WriteLine("        MATRIKA CRM - PRODUCTION DATABASE BOOTSTRAP            ");
        Console.WriteLine("================================================================");

        var stepsCompleted = new List<string>();

        try
        {
            // -------------------------------------------------------------
            // GUARD 1: Explicit Confirmation Required
            // -------------------------------------------------------------
            var confirmed = config.GetValue<bool>("Matrika:ConfirmProductionBootstrap")
                || string.Equals(config["CONFIRM_PRODUCTION_BOOTSTRAP"], "true", StringComparison.OrdinalIgnoreCase)
                || args.Contains("--confirm-production-bootstrap", StringComparer.OrdinalIgnoreCase);

            if (!confirmed)
            {
                throw new InvalidOperationException(
                    "ABORT: Production database bootstrap requires explicit confirmation.\n" +
                    "Set environment variable 'Matrika__ConfirmProductionBootstrap=true' or pass '--confirm-production-bootstrap' CLI argument.\n" +
                    "No database connections were opened and no changes were made.");
            }
            stepsCompleted.Add("Confirmation guard passed");

            // -------------------------------------------------------------
            // GUARD 2: Secrets and Credential Validation
            // -------------------------------------------------------------
            var password = config["Matrika:AdminPassword"] ?? config["Production:AdminPassword"];
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new ArgumentException(
                    "ABORT: Missing admin password. Set 'Matrika__AdminPassword' (or 'Production__AdminPassword') with a secure password (8-72 UTF-8 bytes).");
            }

            var passwordBytes = Encoding.UTF8.GetByteCount(password);
            if (password.Length < 8 || passwordBytes > 72)
            {
                throw new ArgumentException(
                    $"ABORT: Admin password must be at least 8 characters and at most 72 UTF-8 bytes (received {password.Length} characters, {passwordBytes} bytes).");
            }

            var weakPasswords = new[] { "password", "password123", "password123!", "admin", "admin123", "12345678", "matrika123" };
            if (weakPasswords.Contains(password.ToLowerInvariant()))
            {
                throw new ArgumentException("ABORT: Admin password is too common or a placeholder. Choose a strong production password.");
            }

            var adminEmail = (config["Matrika:AdminEmail"] ?? config["Production:AdminEmail"] ?? "matrika843@gmail.com").Trim().ToLowerInvariant();
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(adminEmail))
            {
                throw new ArgumentException($"ABORT: '{adminEmail}' is not a valid email address.");
            }

            var jwtKey = config["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
            {
                throw new InvalidOperationException("ABORT: Production requires 'Jwt__Key' configured with at least 32 bytes (256 bits).");
            }

            var encKeyHex = config["Security:EncryptionKeyHex"];
            if (string.IsNullOrWhiteSpace(encKeyHex) || encKeyHex.Length != 64 || !Regex.IsMatch(encKeyHex, "^[0-9a-fA-F]{64}$"))
            {
                throw new InvalidOperationException("ABORT: Production requires 'Security__EncryptionKeyHex' configured with a valid 64-character hexadecimal key (32 bytes).");
            }

            stepsCompleted.Add("Secret validation passed (passwords and keys validated; no values logged)");

            // -------------------------------------------------------------
            // GUARD 3: Connection String & Forbidden Database Guards
            // -------------------------------------------------------------
            var encryption = services.GetRequiredService<IEncryptionService>();
            var rawConnStr = config.GetConnectionString("DefaultConnection") ?? "";

            if (string.IsNullOrWhiteSpace(rawConnStr))
            {
                throw new InvalidOperationException("ABORT: Missing connection string 'ConnectionStrings:DefaultConnection'.");
            }

            if (Regex.IsMatch(rawConnStr, @"\b(act[-_]base|hms[-_]dev)\b", RegexOptions.IgnoreCase))
            {
                throw new InvalidOperationException(
                    "FATAL SAFETY ABORT: Database connection string points to a protected or forbidden database name. Bootstrap is strictly prohibited from running against this database.");
            }

            var builder = new MySqlConnectionStringBuilder(rawConnStr);

            var dbPassword = config["Production:DatabasePassword"]
                ?? config["Matrika:DatabasePassword"]
                ?? config["DB_PASSWORD"];

            if (!string.IsNullOrEmpty(dbPassword))
            {
                builder.Password = dbPassword;
            }

            if (Regex.IsMatch(builder.Database ?? "", @"\b(act[-_]base|hms[-_]dev)\b", RegexOptions.IgnoreCase))
            {
                throw new InvalidOperationException(
                    "FATAL SAFETY ABORT: Database connection string points to a protected or forbidden database name. Bootstrap is strictly prohibited from running against this database.");
            }

            await using var conn = new MySqlConnection(builder.ConnectionString);
            await conn.OpenAsync();

            // -------------------------------------------------------------
            // GUARD 4: Target Database Name Verification
            // -------------------------------------------------------------
            var currentDb = await conn.ExecuteScalarAsync<string>("SELECT DATABASE()");
            if (string.IsNullOrWhiteSpace(currentDb))
            {
                throw new InvalidOperationException("FATAL SAFETY ABORT: No active database selected on the connection.");
            }

            if (Regex.IsMatch(currentDb, @"^(act[-_]base|hms[-_]dev)$", RegexOptions.IgnoreCase))
            {
                throw new InvalidOperationException($"FATAL SAFETY ABORT: Active database '{currentDb}' is a forbidden database name.");
            }

            var expectedDb = config["Production:ExpectedDatabase"] ?? DefaultExpectedDatabase;
            if (!string.Equals(currentDb, expectedDb, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"FATAL SAFETY ABORT: Connected database is '{currentDb}', but expected '{expectedDb}'. Refusing to bootstrap an unverified target database.");
            }
            stepsCompleted.Add($"Target database verification passed ('{currentDb}')");

            // -------------------------------------------------------------
            // GUARD 5: Strict Empty Database Check (Zero Existing Tables)
            // -------------------------------------------------------------
            var existingTables = (await conn.QueryAsync<string>(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name")).ToList();

            if (existingTables.Count > 0)
            {
                throw new InvalidOperationException(
                    $"FATAL SAFETY ABORT: Target database '{currentDb}' is NOT empty (found {existingTables.Count} existing tables: {string.Join(", ", existingTables.Take(6))}...).\n" +
                    "Production bootstrap requires a completely empty database.\n" +
                    "If a partial setup exists, manual review is required. Bootstrap will never automatically drop tables or overwrite existing data.");
            }
            stepsCompleted.Add("Empty database verification passed (0 existing tables found)");

            // -------------------------------------------------------------
            // STEP 1: Locate Existing Migration SQL Files
            // -------------------------------------------------------------
            var migrationsDir = ResolveMigrationsDirectory();
            Console.WriteLine($"[Bootstrap] Loading migrations from: {migrationsDir}");

            // -------------------------------------------------------------
            // STEP 2: Execute DDL Schemas
            // -------------------------------------------------------------
            // Migration 000: Base schema
            Console.WriteLine("[Bootstrap] Step 1/5: Applying base schema (000_local_schema.sql)...");
            await ExecuteMigrationScriptAsync(conn, Path.Combine(migrationsDir, "000_local_schema.sql"));
            stepsCompleted.Add("Applied 000_local_schema.sql");

            // Migration 001: Customer portal & support
            Console.WriteLine("[Bootstrap] Step 2/5: Applying portal schema (001_customer_portal.sql)...");
            await ExecuteMigrationScriptAsync(conn, Path.Combine(migrationsDir, "001_customer_portal.sql"));
            stepsCompleted.Add("Applied 001_customer_portal.sql");

            // Migration 004: Seed marker (ensuring seed_tag column exists without MariaDB-only syntax)
            var seedMarkerPath = Path.Combine(migrationsDir, "004_seed_marker.sql");
            if (File.Exists(seedMarkerPath))
            {
                Console.WriteLine("[Bootstrap] Step 3/5: Verifying schema markers (004_seed_marker.sql)...");
                await ExecuteMigrationScriptAsync(conn, seedMarkerPath);
                stepsCompleted.Add("Applied 004_seed_marker.sql");
            }

            // Verify DDL table count
            var tablesCreated = (await conn.QueryAsync<string>(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name")).ToList();
            Console.WriteLine($"[Bootstrap] DDL completed. Total tables in database: {tablesCreated.Count}");

            // -------------------------------------------------------------
            // STEP 3: Transactional Metadata & Superadmin Initialization (DML)
            // -------------------------------------------------------------
            Console.WriteLine("[Bootstrap] Step 4/5: Initializing system metadata and superadmin...");
            const long entityId = 1L;
            const long branchId = 1L;
            const long userId = 1L;
            const long roleId = 1L;
            var entityName = config["Production:EntityName"] ?? "Matrika Technology Bangalore";
            var branchName = config["Production:BranchName"] ?? "Bangalore";

            await using (var tx = await conn.BeginTransactionAsync())
            {
                // 1. Initial Entity
                await conn.ExecuteAsync(@"
                    INSERT INTO entity (
                        entity_id, name, short_desc, expiry_date, default_home_page,
                        address, email, additional_info, cr_on
                    ) VALUES (
                        @entityId, @entityName, 'Matrika', DATE_ADD(CURDATE(), INTERVAL 1 YEAR), '/',
                        @address, @email, 0, NOW()
                    )",
                    new
                    {
                        entityId,
                        entityName,
                        address = encryption.Encrypt("Bangalore"),
                        email = encryption.Encrypt(adminEmail)
                    }, tx);

                // 2. Initial Branch
                await conn.ExecuteAsync(@"
                    INSERT INTO branch (entity_id, branch_id, name, is_active, cr_on)
                    VALUES (@entityId, @branchId, @branchName, 1, NOW())",
                    new { entityId, branchId, branchName }, tx);

                // 3. Superadmin Role
                await conn.ExecuteAsync(@"
                    INSERT INTO roles (
                        entity_id, role_id, role_name, is_superadmin, is_admin, is_staff, is_active, cr_on
                    ) VALUES (
                        @entityId, @roleId, 'Superadmin', 1, 0, 0, 1, NOW()
                    )",
                    new { entityId, roleId }, tx);

                // 4. Initial Superadmin User
                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
                await conn.ExecuteAsync(@"
                    INSERT INTO users (
                        entity_id, user_id, user_name, user_password, full_name,
                        role_id, branch_id, user_active, twofa_enabled, cr_on
                    ) VALUES (
                        @entityId, @userId, @adminEmail, @hashedPassword, @fullName,
                        @roleId, @branchId, 1, 0, NOW()
                    )",
                    new
                    {
                        entityId,
                        userId,
                        adminEmail,
                        hashedPassword,
                        fullName = encryption.Encrypt("Superadmin"),
                        roleId,
                        branchId
                    }, tx);

                // 5. Branch Access Mapping
                await conn.ExecuteAsync(@"
                    INSERT INTO role_branch_access (entity_id, role_id, branch_id, cr_on)
                    VALUES (@entityId, @roleId, @branchId, NOW())",
                    new { entityId, roleId, branchId }, tx);

                // 6. Base Application Pages (002_page_master.sql & 003_reports_page.sql)
                await ExecuteParameterizedSqlFileAsync(conn, Path.Combine(migrationsDir, "002_page_master.sql"), new { seedUserId = userId }, tx);
                await ExecuteParameterizedSqlFileAsync(conn, Path.Combine(migrationsDir, "003_reports_page.sql"), new { seedUserId = userId }, tx);

                // 7. General Settings
                var generalSettings = new Dictionary<string, string?>
                {
                    ["page_title"] = config["Production:PageTitle"] ?? "Matrika CRM",
                    ["pwa_name"] = "Matrika CRM",
                    ["pwa_short_name"] = "Matrika",
                    ["pwa_logo"] = null,
                    ["login_image"] = null,
                    ["pwa_theme_color"] = "#0d0b12",
                    ["pwa_background_color"] = "#0d0b12"
                };

                foreach (var (key, val) in generalSettings)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO general_settings (setting_key, setting_value, cr_on)
                        VALUES (@key, @val, NOW())
                        ON DUPLICATE KEY UPDATE setting_value = @val, mo_on = NOW()",
                        new { key, val }, tx);
                }

                await tx.CommitAsync();
            }
            stepsCompleted.Add("Transactional metadata & superadmin committed");

            // -------------------------------------------------------------
            // STEP 4: Post-Bootstrap Verification & Integrity Assertions
            // -------------------------------------------------------------
            Console.WriteLine("[Bootstrap] Step 5/5: Verifying bootstrap integrity...");

            var superadmin = await conn.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT u.user_id, u.user_name, u.user_password, u.full_name, r.is_superadmin FROM users u JOIN roles r USING(entity_id, role_id) WHERE u.entity_id=1 AND u.user_id=1");
            if (superadmin == null)
            {
                throw new InvalidOperationException("Integrity check failed: Superadmin user was not found.");
            }

            var adminDict = (IDictionary<string, object?>)superadmin;
            if (Convert.ToInt32(adminDict["is_superadmin"]) != 1)
            {
                throw new InvalidOperationException("Integrity check failed: Superadmin user lacks superadmin role.");
            }

            string storedPassword = adminDict["user_password"]?.ToString() ?? "";
            if (!BCrypt.Net.BCrypt.Verify(password, storedPassword))
            {
                throw new InvalidOperationException("Integrity check failed: Superadmin password hash verification failed.");
            }

            string storedFullName = adminDict["full_name"]?.ToString() ?? "";
            var decryptedName = encryption.Decrypt(storedFullName);
            if (decryptedName != "Superadmin")
            {
                throw new InvalidOperationException($"Integrity check failed: Decrypted full name was '{decryptedName}', expected 'Superadmin'.");
            }

            var pagesCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pages");
            if (pagesCount < 14)
            {
                throw new InvalidOperationException($"Integrity check failed: Registered pages count is {pagesCount}, expected at least 14.");
            }

            // Verify ZERO demo CRM records exist
            var crmCounts = new Dictionary<string, int>
            {
                ["crm_customers"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_customers"),
                ["crm_leads"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_leads"),
                ["crm_deals"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_deals"),
                ["crm_activities"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_activities"),
                ["crm_portal_accounts"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_portal_accounts"),
                ["crm_support_tickets"] = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM crm_support_tickets")
            };

            foreach (var (table, count) in crmCounts)
            {
                if (count != 0)
                {
                    throw new InvalidOperationException($"Integrity check failed: Table '{table}' contains {count} records; expected 0 in clean production.");
                }
            }
            stepsCompleted.Add("Integrity verification passed (15 pages, 1 superadmin, 0 demo CRM records)");

            // -------------------------------------------------------------
            // Summary Output
            // -------------------------------------------------------------
            Console.WriteLine();
            Console.WriteLine("================================================================");
            Console.WriteLine("     SUCCESS: PRODUCTION DATABASE INITIALIZED CLEANLY           ");
            Console.WriteLine("================================================================");
            Console.WriteLine($"Target Database:    {currentDb}");
            Console.WriteLine($"Superadmin Email:   {adminEmail}");
            Console.WriteLine($"Initial Entity:     {entityName} (ID: {entityId})");
            Console.WriteLine($"Initial Branch:     {branchName} (ID: {branchId})");
            Console.WriteLine($"System Pages:       {pagesCount} routes registered");
            Console.WriteLine($"Demo Records:       0 across all CRM and support tables");
            Console.WriteLine("================================================================");
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\n[Bootstrap FAILURE]");
            Console.WriteLine(ex.Message);
            Console.ResetColor();

            Console.WriteLine("\nCompleted steps prior to error:");
            foreach (var step in stepsCompleted)
            {
                Console.WriteLine($"  - {step}");
            }
            throw;
        }
    }

    private static string ResolveMigrationsDirectory()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Migrations"),
            Path.Combine(Directory.GetCurrentDirectory(), "server-dotnet", "Migrations"),
            Path.Combine(Directory.GetCurrentDirectory(), "Migrations")
        };

        foreach (var candidate in candidates)
        {
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "000_local_schema.sql")))
            {
                return candidate;
            }
        }

        throw new DirectoryNotFoundException("Could not locate Migrations directory containing '000_local_schema.sql'.");
    }

    private static async Task ExecuteMigrationScriptAsync(MySqlConnection conn, string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Migration file not found: {filePath}");
        }

        var content = await File.ReadAllTextAsync(filePath);
        var statements = content.Split(';', StringSplitOptions.RemoveEmptyEntries);

        foreach (var rawStatement in statements)
        {
            var statement = rawStatement.Trim();
            if (string.IsNullOrWhiteSpace(statement) || statement.StartsWith("--"))
            {
                // Skip comments and blank statements
                var nonCommentLines = statement
                    .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Where(line => !line.TrimStart().StartsWith("--"))
                    .ToList();

                if (nonCommentLines.Count == 0) continue;
                statement = string.Join("\n", nonCommentLines).Trim();
            }

            if (string.IsNullOrWhiteSpace(statement)) continue;

            // Handle ALTER TABLE ... ADD COLUMN in MySQL 8.4 safely
            if (Regex.IsMatch(statement, @"^ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+ADD\s+COLUMN\s+`?([a-zA-Z0-9_]+)`?", RegexOptions.IgnoreCase))
            {
                var match = Regex.Match(statement, @"^ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+ADD\s+COLUMN\s+`?([a-zA-Z0-9_]+)`?", RegexOptions.IgnoreCase);
                var tableName = match.Groups[1].Value;
                var colName = match.Groups[2].Value;

                var exists = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tableName AND COLUMN_NAME = @colName",
                    new { tableName, colName });

                if (exists > 0)
                {
                    // Column already exists; skip safely
                    continue;
                }
            }

            await conn.ExecuteAsync(statement);
        }
    }

    private static async Task ExecuteParameterizedSqlFileAsync(MySqlConnection conn, string filePath, object parameters, IDbTransaction tx)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"SQL file not found: {filePath}");
        }

        var content = await File.ReadAllTextAsync(filePath);
        var statements = content.Split(';', StringSplitOptions.RemoveEmptyEntries);

        foreach (var rawStatement in statements)
        {
            var statement = rawStatement.Trim();
            if (string.IsNullOrWhiteSpace(statement)) continue;

            // Skip comment-only chunks
            var nonCommentLines = statement
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(line => !line.TrimStart().StartsWith("--"))
                .ToList();

            if (nonCommentLines.Count == 0) continue;
            statement = string.Join("\n", nonCommentLines).Trim();
            if (string.IsNullOrWhiteSpace(statement)) continue;

            await conn.ExecuteAsync(statement, parameters, tx);
        }
    }
}
