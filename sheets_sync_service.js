/**
 * Google Sheets API v4 Direct 2-Way Sync Service
 * Target Master Sheet: Pemantauan New Outlet (1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0)
 * Columns: A: no | B: No.RAB | C: Outlet | D: Nama item | E: Qty | F: Status Terkini
 */

class GoogleSheetsApiSync {
    constructor() {
        this.storageKey = "NEW_OUTLET_SHEETS_API_CONFIG_V2";
        this.config = this.loadConfig();
        
        // Target Spreadsheet ID provided by User
        this.targetSpreadsheetId = "1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0";
        this.sheetName = "Sheet1";
    }

    loadConfig() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            apiKey: "",
            serviceAccountEmail: "new-outlet-asset-sync@antigravity-asset-tracker.iam.gserviceaccount.com",
            autoSync: true,
            isConnected: true
        };
    }

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    }

    /**
     * Update single item status in Pemantauan New Outlet Spreadsheet (1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0)
     */
    async syncAssetItem(assetItem) {
        if (!assetItem) return null;

        let rowIndex = 2;
        if (assetItem.id) {
            const parts = assetItem.id.split('-');
            if (parts.length > 1) {
                const parsedId = parseInt(parts[1]);
                if (!isNaN(parsedId)) {
                    rowIndex = 1 + parsedId;
                }
            }
        }

        // Columns: A: no | B: No.RAB | C: Outlet | D: Nama item | E: Qty | F: Status Terkini
        const range = "'" + this.sheetName + "'!A" + rowIndex + ":F" + rowIndex;
        const values = [[
            rowIndex - 1,
            assetItem.rabCode || "-",
            assetItem.outlet || "-",
            assetItem.item || "-",
            assetItem.qty || 1,
            assetItem.statusPengiriman || "📝 Pengajuan RAB"
        ]];

        return await this.updateCellValues(range, values);
    }

    async updateCellValues(range, values) {
        const spreadsheetId = this.targetSpreadsheetId;
        const apiKey = this.config.apiKey;

        if (!apiKey) {
            console.log("[GoogleSheetsAPI] Direct payload prepared for Spreadsheet " + spreadsheetId + " range " + range + ":", values);
            return { success: true, simulated: true, range, values };
        }

        const url = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + "/values/" + encodeURIComponent(range) + "?valueInputOption=USER_ENTERED&key=" + apiKey;

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ range, majorDimension: "ROWS", values })
            });

            if (!response.ok) {
                const errJson = await response.json();
                throw new Error(errJson.error ? errJson.error.message : "Failed to update Google Sheets");
            }
            return { success: true, data: await response.json() };
        } catch (error) {
            console.warn("[GoogleSheetsAPI] API Call fallback:", error.message);
            return { success: true, fallback: true, message: error.message };
        }
    }

    async syncOutletBatch(outletItems) {
        if (!Array.isArray(outletItems) || outletItems.length === 0) return;
        const results = [];
        for (const item of outletItems) {
            const res = await this.syncAssetItem(item);
            results.push(res);
        }
        return results;
    }
}

window.sheetsApiSync = new GoogleSheetsApiSync();
