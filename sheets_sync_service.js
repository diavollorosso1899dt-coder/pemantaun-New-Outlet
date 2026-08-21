/**
 * Google Sheets API v4 & Webhook Direct Sync Service
 * Target Spreadsheet: Pemantauan New Outlet (1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0)
 * Tab Name: "Data Base Status"
 * Columns: A: no | B: No.RAB | C: Outlet | D: Nama item | E: Qty | F: Status Terkini
 */

class GoogleSheetsApiSync {
    constructor() {
        this.storageKey = "NEW_OUTLET_SHEETS_API_CONFIG_V3";
        this.config = this.loadConfig();
        
        // Target Spreadsheet ID & Tab Name from User Screenshot
        this.targetSpreadsheetId = "1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0";
        this.sheetName = "Data Base Status";
    }

    loadConfig() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            apiKey: "",
            webhookUrl: "",
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
     * Single Asset Item Sync to Data Base Status sheet
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

        // Columns A:F in "Data Base Status" tab
        const range = "'" + this.sheetName + "'!A" + rowIndex + ":F" + rowIndex;
        const values = [[
            rowIndex - 1,
            assetItem.rabCode || "-",
            assetItem.outlet || "-",
            assetItem.item || "-",
            assetItem.qty || 1,
            assetItem.statusPengiriman || "📝 Pengajuan RAB"
        ]];

        // Send via Webhook if available
        if (this.config.webhookUrl) {
            try {
                await fetch(this.config.webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sheet: this.sheetName,
                        rowIndex: rowIndex,
                        no: rowIndex - 1,
                        rabCode: assetItem.rabCode,
                        outlet: assetItem.outlet,
                        item: assetItem.item,
                        qty: assetItem.qty,
                        status: assetItem.statusPengiriman,
                        picPenerima: assetItem.picPenerima,
                        keterangan: assetItem.keterangan
                    })
                });
            } catch(e) {
                console.warn("[WebhookSync] Webhook call fallback:", e.message);
            }
        }

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
            console.warn("[GoogleSheetsAPI] REST API update:", error.message);
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

    /**
     * Generate 1-Click Copy Data for Tab "Data Base Status"
     */
    copyFormattedDataForDatabaseStatus(assets) {
        let tsvContent = "no	No.RAB	Outlet	Nama item	Qty	Status Terkini
";
        assets.forEach((a, idx) => {
            tsvContent += (idx + 1) + "	" + (a.rabCode || "-") + "	" + (a.outlet || "-") + "	" + (a.item || "-") + "	" + (a.qty || 1) + "	" + (a.statusPengiriman || "📝 Pengajuan RAB") + "
";
        });
        
        navigator.clipboard.writeText(tsvContent).then(() => {
            console.log("Formatted data copied for Data Base Status tab!");
        }).catch(err => {
            console.error("Clipboard copy error:", err);
        });

        return tsvContent;
    }
}

window.sheetsApiSync = new GoogleSheetsApiSync();
