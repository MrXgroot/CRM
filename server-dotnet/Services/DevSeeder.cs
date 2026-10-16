using System.Data;
using Dapper;
using Matrika.Api.Common;
using Matrika.Api.Repositories;

namespace Matrika.Api.Services;

/// <summary>
/// Repeatable, explicitly development-only seed mechanism for the Docker database.
/// Strictly limited to the Development environment and matrika_crm database.
/// Never alters or connects to production or act-base.
/// </summary>
public static class DevSeeder
{
    public static async Task Run(IServiceProvider services, IConfiguration config, IHostEnvironment env)
    {
        if (!env.IsDevelopment())
        {
            throw new InvalidOperationException("Seeding is only permitted in the Development environment.");
        }

        var connStr = config.GetConnectionString("DefaultConnection") ?? "";
        if (connStr.Contains("act-base", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Seeding act-base is strictly prohibited!");
        }

        var db = services.GetRequiredService<IDbService>();

        await using var connection = db.CreateConnection();
        await connection.OpenAsync();

        if (connection.Database.Equals("act-base", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Safety check failed: connected database is act-base. Aborting!");
        }

        // 1. Verify Entity 1, Branch 1, and User 1 exist
        var entity = await connection.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT entity_id, name FROM entity WHERE entity_id = 1"
        );
        if (entity == null)
        {
            throw new InvalidOperationException("Entity ID 1 (Matrika Technology Bangalore) must exist before seeding.");
        }

        var branch = await connection.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT branch_id, name FROM branch WHERE entity_id = 1 AND branch_id = 1"
        );
        if (branch == null)
        {
            throw new InvalidOperationException("Branch ID 1 (Bangalore) must exist for Entity 1 before seeding.");
        }

        var user = await connection.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT user_id FROM users WHERE entity_id = 1 AND user_id = 1"
        );
        if (user == null)
        {
            throw new InvalidOperationException("User ID 1 must exist for Entity 1 before seeding.");
        }

        Console.WriteLine($"[DevSeeder] Verified target database: {connection.Database}");
        Console.WriteLine($"[DevSeeder] Entity: {entity.name} (ID: 1), Branch: {branch.name} (ID: 1), User ID: 1");

        // 2. Ensure seed_tag columns exist (compatible with MySQL 8.4 and MariaDB)
        foreach (var tbl in new[] { "crm_customers", "crm_leads", "crm_deals", "crm_activities" })
        {
            var colCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'seed_tag'",
                new { tbl });
            if (colCount == 0)
            {
                await connection.ExecuteAsync($"ALTER TABLE `{tbl}` ADD COLUMN `seed_tag` VARCHAR(64) NULL;");
            }
        }

        const long entityId = 1L;
        const long branchId = 1L;
        const long userId = 1L;
        var now = DateTime.UtcNow;

        await using var tx = await connection.BeginTransactionAsync();

        try
        {
            // 3. Seed Customers
            var existingCustomers = (await connection.QueryAsync<(long CustomerId, string SeedTag)>(
                "SELECT customer_id, seed_tag FROM crm_customers WHERE entity_id = @entityId AND seed_tag IS NOT NULL",
                new { entityId }, tx
            )).ToDictionary(c => c.SeedTag, c => c.CustomerId);

            var customerDefs = new[]
            {
                new
                {
                    Tag = "seed_cust_001",
                    Company = "[Demo] Acme Cloud Solutions",
                    Contact = "Demo Contact Alex",
                    Email = "alex@acme-cloud.demo.invalid",
                    Phone = "+91 99000 00001",
                    Mobile = "+91 98000 00001",
                    Industry = "Technology",
                    City = "Bangalore",
                    State = "Karnataka",
                    Country = "India",
                    Status = "Active",
                    Notes = "[Demo Record] Enterprise SaaS and cloud infrastructure prospect."
                },
                new
                {
                    Tag = "seed_cust_002",
                    Company = "[Demo] Nexus Financial Systems",
                    Contact = "Demo Contact Priya",
                    Email = "priya@nexus-fin.demo.invalid",
                    Phone = "+91 99000 00002",
                    Mobile = "+91 98000 00002",
                    Industry = "Finance",
                    City = "Bangalore",
                    State = "Karnataka",
                    Country = "India",
                    Status = "Active",
                    Notes = "[Demo Record] Core fintech and payment routing engine."
                },
                new
                {
                    Tag = "seed_cust_003",
                    Company = "[Demo] BlueWave Logistics Pvt Ltd",
                    Contact = "Demo Contact Rahul",
                    Email = "rahul@bluewave.demo.invalid",
                    Phone = "+91 99000 00003",
                    Mobile = "+91 98000 00003",
                    Industry = "Logistics",
                    City = "Bangalore",
                    State = "Karnataka",
                    Country = "India",
                    Status = "Active",
                    Notes = "[Demo Record] Cold chain and inter-state logistics fleet operator."
                },
                new
                {
                    Tag = "seed_cust_004",
                    Company = "[Demo] Horizon Healthcare Systems",
                    Contact = "Demo Contact Sarah",
                    Email = "sarah@horizon-health.demo.invalid",
                    Phone = "+91 99000 00004",
                    Mobile = "+91 98000 00004",
                    Industry = "Healthcare",
                    City = "Bangalore",
                    State = "Karnataka",
                    Country = "India",
                    Status = "Active",
                    Notes = "[Demo Record] Multi-specialty hospital management and telemetry."
                },
                new
                {
                    Tag = "seed_cust_005",
                    Company = "[Demo] Zenith Retail Ventures",
                    Contact = "Demo Contact Vikram",
                    Email = "vikram@zenith-retail.demo.invalid",
                    Phone = "+91 99000 00005",
                    Mobile = "+91 98000 00005",
                    Industry = "Retail",
                    City = "Bangalore",
                    State = "Karnataka",
                    Country = "India",
                    Status = "Inactive",
                    Notes = "[Demo Record] Regional omni-channel retail chain."
                }
            };

            foreach (var c in customerDefs)
            {
                if (!existingCustomers.TryGetValue(c.Tag, out var custId))
                {
                    var nextId = await connection.ExecuteScalarAsync<long>(
                        "SELECT COALESCE(MAX(customer_id), 0) + 1 FROM crm_customers WHERE entity_id = @entityId",
                        new { entityId }, tx
                    );
                    await connection.ExecuteAsync(@"
                        INSERT INTO crm_customers (
                            entity_id, branch_id, assigned_to, customer_id, company_name,
                            contact_name, email, phone, mobile, industry, city, state, country,
                            status, total_revenue, notes, seed_tag, cr_by, cr_on
                        ) VALUES (
                            @entityId, @branchId, @userId, @nextId, @Company,
                            @Contact, @Email, @Phone, @Mobile, @Industry, @City, @State, @Country,
                            @Status, 0, @Notes, @Tag, @userId, @crOn
                        )",
                        new
                        {
                            entityId, branchId, userId, nextId, c.Company,
                            c.Contact, c.Email, c.Phone, c.Mobile, c.Industry, c.City, c.State, c.Country,
                            c.Status, c.Notes, c.Tag, crOn = now.AddDays(-20)
                        }, tx
                    );
                    existingCustomers[c.Tag] = nextId;
                }
            }

            // 4. Seed Leads
            var existingLeads = (await connection.QueryAsync<(long LeadId, string SeedTag)>(
                "SELECT lead_id, seed_tag FROM crm_leads WHERE entity_id = @entityId AND seed_tag IS NOT NULL",
                new { entityId }, tx
            )).ToDictionary(l => l.SeedTag, l => l.LeadId);

            var leadDefs = new[]
            {
                new
                {
                    Tag = "seed_lead_001",
                    FirstName = "DemoLead Rohan",
                    LastName = "Sharma",
                    Company = "[Demo] Radiant Infotech",
                    Email = "rohan@radiant.demo.invalid",
                    Phone = "+91 99000 00011",
                    LeadSource = "Website",
                    Status = "Qualified",
                    Rating = "Hot",
                    EstimatedValue = 450000.00m,
                    ConvertedCustomerId = (long?)null,
                    Notes = "[Demo Record] Enterprise cloud migration inquiry."
                },
                new
                {
                    Tag = "seed_lead_002",
                    FirstName = "DemoLead Ananya",
                    LastName = "Iyer",
                    Company = "[Demo] GreenLeaf Agro",
                    Email = "ananya@greenleaf.demo.invalid",
                    Phone = "+91 99000 00012",
                    LeadSource = "Referral",
                    Status = "Qualified",
                    Rating = "Warm",
                    EstimatedValue = 320000.00m,
                    ConvertedCustomerId = (long?)null,
                    Notes = "[Demo Record] Referred by banking partner."
                },
                new
                {
                    Tag = "seed_lead_003",
                    FirstName = "DemoLead David",
                    LastName = "Miller",
                    Company = "[Demo] Apex Robotics",
                    Email = "david@apex-robotics.demo.invalid",
                    Phone = "+91 99000 00013",
                    LeadSource = "Cold Call",
                    Status = "In Progress",
                    Rating = "Warm",
                    EstimatedValue = 250000.00m,
                    ConvertedCustomerId = (long?)null,
                    Notes = "[Demo Record] Automation solutions evaluation."
                },
                new
                {
                    Tag = "seed_lead_004",
                    FirstName = "DemoLead Sneha",
                    LastName = "Patil",
                    Company = "[Demo] Stellar Media Labs",
                    Email = "sneha@stellar-media.demo.invalid",
                    Phone = "+91 99000 00014",
                    LeadSource = "Social Media",
                    Status = "New",
                    Rating = "Cold",
                    EstimatedValue = 180000.00m,
                    ConvertedCustomerId = (long?)null,
                    Notes = "[Demo Record] Downloaded technical whitepaper."
                },
                new
                {
                    Tag = "seed_lead_005",
                    FirstName = "DemoLead Tariq",
                    LastName = "Khan",
                    Company = "[Demo] Vantage Manufacturing",
                    Email = "tariq@vantage-mfg.demo.invalid",
                    Phone = "+91 99000 00015",
                    LeadSource = "Website",
                    Status = "Disqualified",
                    Rating = "Cold",
                    EstimatedValue = 100000.00m,
                    ConvertedCustomerId = (long?)null,
                    Notes = "[Demo Record] Budget below minimum engagement size."
                },
                new
                {
                    Tag = "seed_lead_006",
                    FirstName = "DemoLead Alex",
                    LastName = "Johnson",
                    Company = "[Demo] Acme Cloud Solutions",
                    Email = "alex@acme-cloud.demo.invalid",
                    Phone = "+91 99000 00001",
                    LeadSource = "Website",
                    Status = "Converted",
                    Rating = "Hot",
                    EstimatedValue = 600000.00m,
                    ConvertedCustomerId = (long?)existingCustomers["seed_cust_001"],
                    Notes = "[Demo Record] Successfully converted to Customer and Deal."
                }
            };

            foreach (var l in leadDefs)
            {
                if (!existingLeads.TryGetValue(l.Tag, out var leadId))
                {
                    var nextId = await connection.ExecuteScalarAsync<long>(
                        "SELECT COALESCE(MAX(lead_id), 0) + 1 FROM crm_leads WHERE entity_id = @entityId",
                        new { entityId }, tx
                    );
                    await connection.ExecuteAsync(@"
                        INSERT INTO crm_leads (
                            entity_id, branch_id, assigned_to, lead_id, first_name, last_name,
                            company, email, phone, lead_source, status, rating, estimated_value,
                            converted_customer_id, notes, seed_tag, cr_by, cr_on
                        ) VALUES (
                            @entityId, @branchId, @userId, @nextId, @FirstName, @LastName,
                            @Company, @Email, @Phone, @LeadSource, @Status, @Rating, @EstimatedValue,
                            @ConvertedCustomerId, @Notes, @Tag, @userId, @crOn
                        )",
                        new
                        {
                            entityId, branchId, userId, nextId, l.FirstName, l.LastName,
                            l.Company, l.Email, l.Phone, l.LeadSource, l.Status, l.Rating, l.EstimatedValue,
                            l.ConvertedCustomerId, l.Notes, l.Tag, crOn = now.AddDays(-18)
                        }, tx
                    );
                    existingLeads[l.Tag] = nextId;
                }
            }

            // 5. Seed Deals
            var existingDeals = (await connection.QueryAsync<(long DealId, string SeedTag)>(
                "SELECT deal_id, seed_tag FROM crm_deals WHERE entity_id = @entityId AND seed_tag IS NOT NULL",
                new { entityId }, tx
            )).ToDictionary(d => d.SeedTag, d => d.DealId);

            var dealDefs = new[]
            {
                new
                {
                    Tag = "seed_deal_001",
                    DealName = "[Demo] Cloud Migration Suite",
                    CustomerTag = "seed_cust_001",
                    LeadTag = (string?)"seed_lead_006",
                    Stage = "Won",
                    Status = "Won",
                    Probability = 100,
                    Amount = 600000.00m,
                    ApprovalStatus = "Approved",
                    ApprovalNotes = (string?)"Contract signed and approved.",
                    ApprovedBy = (long?)userId,
                    ExpectedCloseDate = (DateTime?)now.AddDays(-15).Date,
                    Notes = "[Demo Record] Enterprise multi-cloud architecture rollout."
                },
                new
                {
                    Tag = "seed_deal_002",
                    DealName = "[Demo] Core Banking Analytics Engine",
                    CustomerTag = "seed_cust_002",
                    LeadTag = (string?)null,
                    Stage = "Won",
                    Status = "Won",
                    Probability = 100,
                    Amount = 850000.00m,
                    ApprovalStatus = "Approved",
                    ApprovalNotes = (string?)"Board approval received.",
                    ApprovedBy = (long?)userId,
                    ExpectedCloseDate = (DateTime?)now.AddDays(-5).Date,
                    Notes = "[Demo Record] Real-time fraud detection telemetry."
                },
                new
                {
                    Tag = "seed_deal_003",
                    DealName = "[Demo] Fleet Tracking & Dispatch Integration",
                    CustomerTag = "seed_cust_003",
                    LeadTag = (string?)null,
                    Stage = "Negotiation",
                    Status = "Open",
                    Probability = 80,
                    Amount = 450000.00m,
                    ApprovalStatus = "Pending",
                    ApprovalNotes = (string?)"Pending final discount approval.",
                    ApprovedBy = (long?)null,
                    ExpectedCloseDate = (DateTime?)now.AddDays(14).Date,
                    Notes = "[Demo Record] Commercial negotiations on SLA milestones."
                },
                new
                {
                    Tag = "seed_deal_004",
                    DealName = "[Demo] Hospital Telemetry & EHR Platform",
                    CustomerTag = "seed_cust_004",
                    LeadTag = (string?)null,
                    Stage = "Proposal Sent",
                    Status = "Open",
                    Probability = 60,
                    Amount = 350000.00m,
                    ApprovalStatus = "Not Required",
                    ApprovalNotes = (string?)null,
                    ApprovedBy = (long?)null,
                    ExpectedCloseDate = (DateTime?)now.AddDays(30).Date,
                    Notes = "[Demo Record] Proposal delivered to executive committee."
                },
                new
                {
                    Tag = "seed_deal_005",
                    DealName = "[Demo] AI-Powered Recommendation Engine",
                    CustomerTag = "seed_cust_001",
                    LeadTag = (string?)null,
                    Stage = "Qualification",
                    Status = "Open",
                    Probability = 40,
                    Amount = 200000.00m,
                    ApprovalStatus = "Not Required",
                    ApprovalNotes = (string?)null,
                    ApprovedBy = (long?)null,
                    ExpectedCloseDate = (DateTime?)now.AddDays(45).Date,
                    Notes = "[Demo Record] Technical discovery and POC phase."
                },
                new
                {
                    Tag = "seed_deal_006",
                    DealName = "[Demo] Legacy ERP Replacement Evaluation",
                    CustomerTag = "seed_cust_005",
                    LeadTag = (string?)null,
                    Stage = "Lost",
                    Status = "Lost",
                    Probability = 0,
                    Amount = 150000.00m,
                    ApprovalStatus = "Rejected",
                    ApprovalNotes = (string?)"Competitor selected due to existing multi-year contract.",
                    ApprovedBy = (long?)null,
                    ExpectedCloseDate = (DateTime?)now.AddDays(-10).Date,
                    Notes = "[Demo Record] Deal closed-lost after final RFP review."
                }
            };

            foreach (var d in dealDefs)
            {
                if (!existingDeals.TryGetValue(d.Tag, out var dealId))
                {
                    var nextId = await connection.ExecuteScalarAsync<long>(
                        "SELECT COALESCE(MAX(deal_id), 0) + 1 FROM crm_deals WHERE entity_id = @entityId",
                        new { entityId }, tx
                    );
                    var custId = existingCustomers[d.CustomerTag];
                    var leadId = d.LeadTag != null && existingLeads.TryGetValue(d.LeadTag, out var lid) ? (long?)lid : null;

                    await connection.ExecuteAsync(@"
                        INSERT INTO crm_deals (
                            entity_id, branch_id, assigned_to, deal_id, deal_name,
                            customer_id, lead_id, stage, status, approval_status,
                            amount, probability, expected_close_date, approved_by,
                            notes, approval_notes, seed_tag, cr_by, cr_on
                        ) VALUES (
                            @entityId, @branchId, @userId, @nextId, @DealName,
                            @custId, @leadId, @Stage, @Status, @ApprovalStatus,
                            @Amount, @Probability, @ExpectedCloseDate, @ApprovedBy,
                            @Notes, @ApprovalNotes, @Tag, @userId, @crOn
                        )",
                        new
                        {
                            entityId, branchId, userId, nextId, d.DealName,
                            custId, leadId, d.Stage, d.Status, d.ApprovalStatus,
                            d.Amount, d.Probability, d.ExpectedCloseDate, d.ApprovedBy,
                            d.Notes, d.ApprovalNotes, d.Tag, crOn = now.AddDays(-16)
                        }, tx
                    );
                    existingDeals[d.Tag] = nextId;
                }
            }

            // Sync total_revenue for customers
            await connection.ExecuteAsync(@"
                UPDATE crm_customers c
                SET total_revenue = (
                    SELECT IFNULL(SUM(amount), 0)
                    FROM crm_deals d
                    WHERE d.entity_id = c.entity_id AND d.customer_id = c.customer_id AND d.status = 'Won'
                )
                WHERE c.entity_id = @entityId",
                new { entityId }, tx
            );

            // 6. Seed Activities
            var existingActivities = (await connection.QueryAsync<(long ActivityId, string SeedTag)>(
                "SELECT activity_id, seed_tag FROM crm_activities WHERE entity_id = @entityId AND seed_tag IS NOT NULL",
                new { entityId }, tx
            )).ToDictionary(a => a.SeedTag, a => a.ActivityId);

            var activityDefs = new[]
            {
                new
                {
                    Tag = "seed_act_001",
                    Title = "[Demo] Review Cloud Architecture Specs",
                    Type = "Meeting",
                    RelatedType = "Customer",
                    RelatedTag = "seed_cust_001",
                    DueDate = now.AddDays(1).Date.AddHours(10),
                    Priority = "Urgent",
                    Status = "Pending",
                    Notes = "[Demo Record] Technical review of migration architecture."
                },
                new
                {
                    Tag = "seed_act_002",
                    Title = "[Demo] Contract Negotiation Call with CTO",
                    Type = "Call",
                    RelatedType = "Deal",
                    RelatedTag = "seed_deal_003",
                    DueDate = now.AddDays(2).Date.AddHours(15),
                    Priority = "High",
                    Status = "Pending",
                    Notes = "[Demo Record] Commercial terms and milestone delivery negotiation."
                },
                new
                {
                    Tag = "seed_act_003",
                    Title = "[Demo] Send Updated Proposal Documentation",
                    Type = "Email",
                    RelatedType = "Deal",
                    RelatedTag = "seed_deal_004",
                    DueDate = now.AddDays(3).Date.AddHours(11),
                    Priority = "Medium",
                    Status = "Pending",
                    Notes = "[Demo Record] Deliver revised scoping and rate schedule."
                },
                new
                {
                    Tag = "seed_act_004",
                    Title = "[Demo] Overdue Follow-up on Technical Questions",
                    Type = "Follow-up",
                    RelatedType = "Lead",
                    RelatedTag = "seed_lead_001",
                    DueDate = now.AddDays(-2).Date.AddHours(14),
                    Priority = "High",
                    Status = "In Progress",
                    Notes = "[Demo Record] Follow up on outstanding security questionnaire."
                },
                new
                {
                    Tag = "seed_act_005",
                    Title = "[Demo] Kickoff Meeting for Cloud Migration",
                    Type = "Meeting",
                    RelatedType = "Customer",
                    RelatedTag = "seed_cust_001",
                    DueDate = now.AddDays(-10).Date.AddHours(11),
                    Priority = "Medium",
                    Status = "Completed",
                    Notes = "[Demo Record] Formal project kickoff session."
                },
                new
                {
                    Tag = "seed_act_006",
                    Title = "[Demo] Initial Discovery Phone Call",
                    Type = "Call",
                    RelatedType = "Lead",
                    RelatedTag = "seed_lead_003",
                    DueDate = now.AddDays(-12).Date.AddHours(16),
                    Priority = "Low",
                    Status = "Cancelled",
                    Notes = "[Demo Record] Lead requested rescheduling to next quarter."
                }
            };

            foreach (var a in activityDefs)
            {
                if (!existingActivities.TryGetValue(a.Tag, out var actId))
                {
                    var nextId = await connection.ExecuteScalarAsync<long>(
                        "SELECT COALESCE(MAX(activity_id), 0) + 1 FROM crm_activities WHERE entity_id = @entityId",
                        new { entityId }, tx
                    );
                    long? relatedId = null;
                    if (a.RelatedType == "Customer" && existingCustomers.TryGetValue(a.RelatedTag, out var cid)) relatedId = cid;
                    else if (a.RelatedType == "Deal" && existingDeals.TryGetValue(a.RelatedTag, out var did)) relatedId = did;
                    else if (a.RelatedType == "Lead" && existingLeads.TryGetValue(a.RelatedTag, out var lid)) relatedId = lid;

                    await connection.ExecuteAsync(@"
                        INSERT INTO crm_activities (
                            entity_id, branch_id, assigned_to, activity_id, title,
                            activity_type, related_to_type, related_to_id, due_date,
                            priority, status, notes, seed_tag, cr_by, cr_on
                        ) VALUES (
                            @entityId, @branchId, @userId, @nextId, @Title,
                            @Type, @RelatedType, @relatedId, @DueDate,
                            @Priority, @Status, @Notes, @Tag, @userId, @crOn
                        )",
                        new
                        {
                            entityId, branchId, userId, nextId, a.Title,
                            a.Type, a.RelatedType, relatedId, a.DueDate,
                            a.Priority, a.Status, a.Notes, a.Tag, crOn = now.AddDays(-14)
                        }, tx
                    );
                    existingActivities[a.Tag] = nextId;
                }
            }

            // 7. Seed Customer Portal Account (Customer 1)
            var customer1Id = existingCustomers["seed_cust_001"];
            var portalAccount = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT account_id FROM crm_portal_accounts WHERE entity_id = @entityId AND customer_id = @customer1Id",
                new { entityId, customer1Id }, tx
            );
            if (portalAccount == null)
            {
                var hash = BCrypt.Net.BCrypt.HashPassword("Password123!");
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_portal_accounts (entity_id, customer_id, email, password_hash, is_active, created_at)
                    VALUES (@entityId, @customer1Id, 'demo.customer1@example.test', @hash, 1, @now)",
                    new { entityId, customer1Id, hash, now }, tx
                );
            }

            // 8. Seed Support Tickets & Messages
            var existingTickets = await connection.QuerySingleOrDefaultAsync<int>(
                "SELECT COUNT(*) FROM crm_support_tickets WHERE entity_id = @entityId AND subject LIKE '[Demo]%'",
                new { entityId }, tx
            );
            if (existingTickets == 0)
            {
                // Ticket 1: Open ticket for Customer 1
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_tickets (entity_id, customer_id, subject, priority, status, created_at, updated_at)
                    VALUES (@entityId, @customer1Id, '[Demo] API Rate Limiting Inquiry', 'Normal', 'Open', @t1Time, @t1Time)",
                    new { entityId, customer1Id, t1Time = now.AddDays(-3) }, tx
                );
                var t1Id = await connection.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID()", transaction: tx);
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_messages (ticket_id, author_type, body, created_at)
                    VALUES (@t1Id, 'Customer', '[Demo] Inquiring about standard API rate limit thresholds for enterprise tier.', @t1Time)",
                    new { t1Id, t1Time = now.AddDays(-3) }, tx
                );

                // Ticket 2: Resolved ticket for Customer 2
                var customer2Id = existingCustomers["seed_cust_002"];
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_tickets (entity_id, customer_id, subject, priority, status, created_at, updated_at)
                    VALUES (@entityId, @customer2Id, '[Demo] Webhook Configuration Assistance', 'High', 'Resolved', @t2Time, @t2ResolvedTime)",
                    new { entityId, customer2Id, t2Time = now.AddDays(-7), t2ResolvedTime = now.AddDays(-5) }, tx
                );
                var t2Id = await connection.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID()", transaction: tx);
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_messages (ticket_id, author_type, body, created_at)
                    VALUES (@t2Id, 'Customer', '[Demo] Need assistance confirming IP addresses for webhook endpoint delivery.', @t2Time)",
                    new { t2Id, t2Time = now.AddDays(-7) }, tx
                );
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_messages (ticket_id, author_type, body, created_at)
                    VALUES (@t2Id, 'Team', '[Demo] The outbound static IPs for webhook deliveries are documented in your developer portal.', @t2ReplyTime)",
                    new { t2Id, t2ReplyTime = now.AddDays(-6) }, tx
                );
                await connection.ExecuteAsync(@"
                    INSERT INTO crm_support_messages (ticket_id, author_type, body, created_at)
                    VALUES (@t2Id, 'System', 'Status changed to Resolved.', @t2ResolvedTime)",
                    new { t2Id, t2ResolvedTime = now.AddDays(-5) }, tx
                );
            }

            await tx.CommitAsync();
            Console.WriteLine("[DevSeeder] Development seed transaction committed successfully.");
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            Console.WriteLine($"[DevSeeder] Error during seeding, transaction rolled back: {ex.Message}");
            throw;
        }

        // 9. Query and display verification statistics
        var repo = services.GetRequiredService<ICrmRepository>();
        dynamic stats = await repo.GetDashboardStatsAsync(entityId, branchId);

        Console.WriteLine("\n================== SEED VERIFICATION STATS ==================");
        Console.WriteLine($"Total Leads:         {stats.total_leads}");
        Console.WriteLine($"Qualified Leads:     {stats.qualified_leads}");
        Console.WriteLine($"Total Customers:     {stats.total_customers}");
        Console.WriteLine($"Active Customers:    {stats.active_customers}");
        Console.WriteLine($"Total Deals:         {stats.total_deals}");
        Console.WriteLine($"Won Deals:           {stats.won_deals}");
        Console.WriteLine($"Pipeline Value:      {stats.pipeline_value:N0}");
        Console.WriteLine($"Total Revenue:       {stats.total_revenue:N0}");
        Console.WriteLine($"Pending Activities:  {stats.pending_activities}");
        Console.WriteLine("============================================================\n");
    }
}
