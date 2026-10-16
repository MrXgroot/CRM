// UI contract checks with isolated fixture responses. No production credentials or records.
const { chromium } = require("../client/node_modules/playwright");
const { spawn } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const assert = require("node:assert/strict");
const routes = [
  "/",
  "/crm/leads",
  "/crm/customers",
  "/crm/deals",
  "/crm/activities",
  "/crm/support",
  "/crm/reports",
  "/entity",
  "/branch",
  "/roles",
  "/designation",
  "/users",
  "/pages",
  "/profile",
  "/changePassword",
];
const access = routes.map((url) => ({
  url,
  access_to_add: 1,
  access_to_update: 1,
  access_to_delete: 1,
  access_to_export: 1,
  extra_actions: [],
}));
const user = {
  user_name: "admin@example.test",
  full_name: "Matrika",
  role_name: "Super admin",
  is_superadmin: 1,
  is_admin: 1,
  is_staff: 0,
  entity_id: 1,
  branch_id: 1,
};
const branch = [{ branch_id: 1, name: "Bangalore", is_active: 1 }];
const customer = {
  customer_id: 7,
  company_name: "Test account",
  contact_name: "Test customer",
  email: "customer@example.test",
  status: "Active",
};
const deal = {
  deal_id: 2,
  deal_name: "Website project",
  stage: "Proposal Sent",
  status: "Open",
  amount: 12000,
};
(async () => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5181",
      "--strictPort",
    ],
    {
      cwd: require("node:path").resolve(__dirname, "../client"),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let browser;
  try {
    await new Promise((resolve, reject) => {
      let stderr = "";
      server.stderr.on("data", (d) => { stderr += d.toString(); });
      const probe = setInterval(() => {
        require("node:http").get("http://127.0.0.1:5181/", (res) => {
          res.resume();
          if (res.statusCode === 200) { clearInterval(probe); clearTimeout(timer); resolve(); }
        }).on("error", () => {});
      }, 500);
      const timer = setTimeout(
        () => { clearInterval(probe); reject(new Error("Vite startup timed out: " + stderr)); },
        30000,
      );
      server.stdout.on("data", (d) => {
        if (d.toString().includes("Local:")) {
          clearInterval(probe);
          clearTimeout(timer);
          resolve();
        }
      });
      server.on("exit", (code) => { clearInterval(probe); reject(new Error(`Vite exited ${code}: ${stderr}`)); });
    });
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    let tickets = [],
      messages = [];
    let grant = false;
    let loginEmail = "";
    await context.route("http://localhost:5007/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname,
        method = req.method();
      let data = [];
      if (method === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "*",
          },
        });
      if (path === "/user/login") {
        loginEmail = req.postDataJSON().email;
        data = {
          user,
          token: "staff-fixture",
          pageAccess: access,
          branchAccess: branch,
        };
      } else if (path === "/generalsettings")
        data = { page_title: "Matrika CRM" };
      else if (path === "/entity")
        data = [{ entity_id: 1, name: "Matrika Technology Bangalore" }];
      else if (path.includes("branch")) data = branch;
      else if (path === "/crm/stats")
        data = {
          total_leads: 4,
          qualified_leads: 2,
          total_customers: 1,
          active_customers: 1,
          total_deals: 1,
          won_deals: 0,
          pipeline_value: 12000,
          total_revenue: 0,
          pending_activities: 0,
        };
      else if (path === "/crm/customers") data = [customer];
      else if (path === "/crm/deals") data = [deal];
      else if (path === "/crm/support/accounts") data = [customer];
      else if (path === "/crm/reports") {
        data = {
          from: "2026-01-01", to: "2026-10-16", tickets_entity_wide: true,
          totals: { customers: 1, leads: 4, converted_leads: 2, deals: 1, deal_value: 12000, won_value: 0, overdue_activities: 1 },
          monthly: [{ month: "2026-10", customers: 1, leads: 4, deals: 1, deal_value: 12000 }],
          customers: [{ label: "Active", count: 1 }], leads: [{ label: "New", count: 4 }],
          sources: [{ label: "Referral", count: 4 }],
          deals: [{ label: "Proposal Sent", count: 1, amount: 12000 }],
          activities: [{ label: "Pending", count: 1 }], tickets: [{ label: "Open", count: 1 }],
          ticket_monthly: [{ month: "2026-10", count: 1 }],
        };
      }
      else if (path === "/crm/support/access/7" && method === "PUT") {
        grant = true;
        assert.equal(req.postDataJSON().email, customer.email);
      } else if (path === "/portal/login") data = { token: "customer-fixture" };
      else if (path === "/portal/overview") data = { customer, deals: [deal] };
      else if (path.endsWith("/tickets") && method === "POST") {
        tickets = [
          {
            ticket_id: 1,
            subject: req.postDataJSON().subject,
            priority: "Normal",
            status: "Open",
          },
        ];
        messages = [
          {
            message_id: 1,
            author_type: "Customer",
            body: req.postDataJSON().message,
          },
        ];
        data = { ticket_id: 1 };
      } else if (path.endsWith("/tickets")) data = tickets;
      else if (path.endsWith("/messages") && method === "POST") {
        messages.push({
          message_id: messages.length + 1,
          author_type: path.startsWith("/portal") ? "Customer" : "Team",
          body: req.postDataJSON().message,
        });
      } else if (path.endsWith("/messages")) data = messages;
      else if (path === "/crm/support/tickets/1" && method === "PATCH") {
        tickets[0].status = req.postDataJSON().status;
      }
      await route.fulfill({
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
        body: JSON.stringify({ success: true, statusCode: 200, data }),
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const output = process.env.CRM_SCREENSHOT_DIR || "/tmp/crm-ui";
    mkdirSync(output, { recursive: true });
    await page.goto("http://127.0.0.1:5181/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("ADMIN@EXAMPLE.TEST");
    await page.getByLabel("Password", { exact: true }).fill("test-password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/");
    assert.equal(loginEmail, "admin@example.test");
    await page.goto("http://127.0.0.1:5181/crm/reports");
    await page.getByText("Monthly CRM growth").waitFor();
    await page.getByText("Referral").waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    assert.match((await download).suggestedFilename(), /matrika_report_.*\.csv/);
    for (const path of routes) {
      await page.goto("http://127.0.0.1:5181" + path, {
        waitUntil: "domcontentloaded",
      });
      await page.locator(".workspace-content").waitFor();
      await page.waitForTimeout(180);
      assert.equal(await page.locator(".sidebar").count(), 1);
      assert.equal(
        await page
          .locator("body")
          .innerText()
          .then((t) => /Arisecraft|Santekatte/.test(t)),
        false,
      );
      await page.screenshot({
        path:
          output +
          "/" +
          (path === "/" ? "overview" : path.slice(1).replaceAll("/", "-")) +
          ".png",
        fullPage: true,
      });
      console.log("PASS desktop " + path);
    }
    await page.goto("http://127.0.0.1:5181/crm/support");
    await page.getByLabel("Customer", { exact: true }).selectOption("7");
    await page.getByLabel("Initial or reset password").fill("test-password123");
    await page.getByRole("button", { name: "Save access" }).click();
    await page.getByText("Access saved.", { exact: false }).waitFor();
    assert.ok(grant);
    await page.goto("http://127.0.0.1:5181/customer/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(customer.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/portal");
    await page.getByText(deal.deal_name, { exact: true }).waitFor();
    await page.getByRole("button", { name: "New request" }).click();
    await page.getByLabel("Subject", { exact: true }).fill("Project update");
    await page
      .getByLabel("How can we help?")
      .fill("Please share the next step.");
    await page.getByRole("button", { name: "Create request" }).click();
    await page.locator(".message").filter({ hasText: "Please share the next step." }).waitFor();
    await page
      .getByLabel("Reply", { exact: true })
      .fill("Here is another detail.");
    await page.getByRole("button", { name: "Send reply" }).click();
    await page.locator(".message").filter({ hasText: "Here is another detail." }).waitFor();
    await page.screenshot({
      path: output + "/customer-portal.png",
      fullPage: true,
    });
    await page.goto("http://127.0.0.1:5181/crm/support");
    await page.getByRole("button", { name: /Project update/ }).click();
    await page.getByLabel("Update ticket status").selectOption("Resolved");
    await page.waitForTimeout(180);
    assert.equal(tickets[0].status, "Resolved");
    console.log(
      "PASS customer provisioning, login, ticket, reply and staff status UI contracts",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/login",
      "/",
      "/crm/customers",
      "/users",
      "/crm/support",
      "/crm/reports",
      "/portal",
    ]) {
      await page.goto("http://127.0.0.1:5181" + path, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(180);
      const width = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      assert.ok(width <= 391, `${path} overflows at ${width}px`);
      await page.screenshot({
        path:
          output +
          "/mobile-" +
          (path === "/" ? "overview" : path.slice(1).replaceAll("/", "-")) +
          ".png",
        fullPage: true,
      });
      console.log("PASS mobile " + path);
    }
    await page.goto("http://127.0.0.1:5181/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator(".sidebar.is-open").waitFor();
    await page
      .locator(".sidebar")
      .getByRole("link", { name: "Leads", exact: true })
      .click();
    await page.waitForURL("**/crm/leads");
    assert.equal(await page.locator(".sidebar.is-open").count(), 0);
    assert.deepEqual(errors, []);
    console.log("PASS mobile navigation; no uncaught browser errors");
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
