using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IGeneralSettingsRepository
{
    Task<IDictionary<string, string?>> GetAllAsync();
    Task<bool> UpsertSettingAsync(string key, string? value);
}

public class GeneralSettingsRepository : IGeneralSettingsRepository
{
    private readonly IDbService _db;
    private static bool _tableInitialized;

    public GeneralSettingsRepository(IDbService db)
    {
        _db = db;
    }

    private async Task EnsureTableInitializedAsync()
    {
        if (_tableInitialized) return;

        try
        {
            await _db.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS `general_settings` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
                  `setting_value` TEXT DEFAULT NULL,
                  `cr_on` DATETIME DEFAULT CURRENT_TIMESTAMP,
                  `mo_on` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            var count = await _db.QuerySingleOrDefaultAsync<long>("SELECT COUNT(*) FROM general_settings");
            if (count == 0)
            {
                await _db.ExecuteAsync(@"
                    INSERT IGNORE INTO `general_settings` (`setting_key`, `setting_value`) VALUES
                    ('login_image', NULL),
                    ('page_title', 'Matrika CRM'),
                    ('pwa_name', 'Matrika'),
                    ('pwa_short_name', 'Matrika'),
                    ('pwa_logo', NULL),
                    ('pwa_theme_color', '#0d0b12'),
                    ('pwa_background_color', '#0d0b12');");
            }

            _tableInitialized = true;
        }
        catch
        {
            // Table initialization fallback
        }
    }

    public async Task<IDictionary<string, string?>> GetAllAsync()
    {
        await EnsureTableInitializedAsync();

        var rows = await _db.QueryAsync<dynamic>("SELECT setting_key, setting_value FROM general_settings");
        var result = new Dictionary<string, string?>();

        foreach (var row in rows)
        {
            var dict = (IDictionary<string, object?>)row;
            var key = dict["setting_key"]?.ToString();
            if (!string.IsNullOrEmpty(key))
            {
                result[key] = dict["setting_value"]?.ToString();
            }
        }

        return result;
    }

    public async Task<bool> UpsertSettingAsync(string key, string? value)
    {
        await EnsureTableInitializedAsync();

        var rows = await _db.ExecuteAsync(@"
            INSERT INTO general_settings (setting_key, setting_value, cr_on) 
            VALUES (@key, @value, NOW()) 
            ON DUPLICATE KEY UPDATE setting_value = @value, mo_on = NOW()",
            new { key, value }
        );

        return rows > 0;
    }
}

