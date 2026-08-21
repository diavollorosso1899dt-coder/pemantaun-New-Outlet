/**
 * Google Sheets Direct Automatic Sync Service
 * Target Spreadsheet: Pemantauan New Outlet (1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0)
 * Target Tab: "Data Base Status"
 * Columns: A: no | B: No.RAB | C: Outlet | D: Nama item | E: Qty | F: Status Terkini
 */

class GoogleSheetsApiSync {
    constructor() {
        this.storageKey = "NEW_OUTLET_SHEETS_API_CONFIG_V5";
        
        // Hardcoded Active Webhook URLs from User Apps Script Deployments
        this.activeWebhookUrls = [
            "https://script.google.com/macros/s/AKfycbz1PWkaXEVeSaObijlOSbzyhRXeleskkfsWbnix2uriDMo-Lwq8VhUgVFxKoMc4g/exec",
            "https://script.google.com/macros/s/AKfycbz3NUzD-Aah99JiSaabUBI81EF6bPq8_p5OxJ8kwaVe7EPM5DEh8c3RAnk4ucg/exec"
        ];
        
        this.config = this.loadConfig();
        this.targetSpreadsheetId = "1Dw7MH29XFiqx1bkHqMQ0lthYxhLfx3QWyVBWuzR-nh0";
        this.sheetName = "Data Base Status";
    }

    loadConfig() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.webhookUrl) return parsed;
            } catch (e) {}
        }
        return {
            apiKey: "",
            webhookUrl: this.activeWebhookUrls[0],
            serviceAccountEmail: "new-outlet-asset-sync@antigravity-asset-tracker.iam.gserviceaccount.com",
            autoSync: true,
            isConnected: true
        };
    }

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    }

    getEffectiveWebhookUrl() {
        return (this.config && this.config.webhookUrl && this.config.webhookUrl.trim().length > 10) 
            ? this.config.webhookUrl.trim() 
            : this.activeWebhookUrls[0];
    }

    /**
     * Send single item update directly to Google Apps Script Webhook
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

        const payload = {
            action: "update_item",
            spreadsheetId: this.targetSpreadsheetId,
            sheetName: this.sheetName,
            rowIndex: rowIndex,
            no: rowIndex - 1,
            rabCode: assetItem.rabCode || "-",
            outlet: assetItem.outlet || "-",
            item: assetItem.item || "-",
            qty: assetItem.qty || 1,
            statusPengiriman: assetItem.statusPengiriman || "📝 Pengajuan RAB",
            picPenerima: assetItem.picPenerima || "",
            keterangan: assetItem.keterangan || ""
        };

        const urlsToTry = [this.getEffectiveWebhookUrl(), ...this.activeWebhookUrls];

        urlsToTry.forEach(targetUrl => {
            try {
                fetch(targetUrl, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).catch(err => console.log("Background Webhook push error:", err));
            } catch(e) {}
        });

        console.log("[AutoSheetsSync] Direct Webhook payload sent:", payload);
        return { success: true, payload };
    }

    /**
     * Send batch items update directly to Google Apps Script Webhook
     */
    async syncOutletBatch(outletItems) {
        if (!Array.isArray(outletItems) || outletItems.length === 0) return;

        const payload = {
            action: "batch_update",
            spreadsheetId: this.targetSpreadsheetId,
            sheetName: this.sheetName,
            items: outletItems.map((item, idx) => ({
                no: idx + 1,
                rabCode: item.rabCode || "-",
                outlet: item.outlet || "-",
                item: item.item || "-",
                qty: item.qty || 1,
                statusPengiriman: item.statusPengiriman || "📝 Pengajuan RAB",
                picPenerima: item.picPenerima || "",
                keterangan: item.keterangan || ""
            }))
        };

        const urlsToTry = [this.getEffectiveWebhookUrl(), ...this.activeWebhookUrls];

        urlsToTry.forEach(targetUrl => {
            try {
                fetch(targetUrl, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).catch(err => console.log("Batch Webhook push error:", err));
            } catch (e) {}
        });

        console.log("[AutoSheetsSync] Direct Batch Webhook payload sent:", payload);
        return { success: true, count: outletItems.length };
    }

    copyFormattedDataForDatabaseStatus(assets) {
        let tsvContent = "no	No.RAB	Outlet	Nama item	Qty	Status Terkini
";
        assets.forEach((a, idx) => {
            tsvContent += (idx + 1) + "	" + (a.rabCode || "-") + "	" + (a.outlet || "-") + "	" + (a.item || "-") + "	" + (a.qty || 1) + "	" + (a.statusPengiriman || "📝 Pengajuan RAB") + "
";
        });
        try { navigator.clipboard.writeText(tsvContent); } catch(e) {}
        return tsvContent;
    }
}

window.sheetsApiSync = new GoogleSheetsApiSync();
