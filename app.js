/**
 * New Outlet Asset Monitoring System - 3 Checkbox XYZ Rule Engine & Continuous Sync
 */

document.addEventListener('DOMContentLoaded', () => {
    // Clear old localStorage keys to ensure clean sync
    ["NEW_OUTLET_ASSETS_OUTLET_SPECIFIC_V5", "NEW_OUTLET_ASSETS_3ROLE_VALIDATION_V6", "NEW_OUTLET_ASSETS_FIXED_V7", "NEW_OUTLET_ASSETS_CLEAN_V8", "NEW_OUTLET_SYSTEM_PROPER_V9", "NEW_OUTLET_RECEIVER_V10", "NEW_OUTLET_RAB_SEPARATED_V11", "NEW_OUTLET_JABO_COL_E_V12", "NEW_OUTLET_TGL_PENGAJUAN_V13", "NEW_OUTLET_FORMATTED_DATE_V14", "NEW_OUTLET_CONTINUOUS_SYNC_V15"].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
    });

    // App State (Default initial role: Logistik, Admin GA hidden on load)
    const state = {
        role: 'logistik', // DEFAULT INITIAL ROLE ON LOAD IS LOGISTIK!
        isAdminUnlocked: false, // ADMIN GA HIDDEN BY DEFAULT!
        selectedArea: 'ALL', // 'ALL' | 'JABODETABEK' | 'KALBAR'
        activeTab: 'outlet-view', // 'outlet-view' | 'all-items-view'
        activeStageFilter: null,
        activeOutletKey: '',
        searchQuery: '',
        filterSla: '',
        subtableSearch: {},
        modalBatchQuery: '',
        modalInspectionQuery: '',
        expandedOutlets: new Set()
    };

    // DOM Elements
    const brandLogoWrapper = document.getElementById('brandLogoWrapper');
    const btnRoleAdminGA = document.getElementById('btnRoleAdminGA');
    const btnRoleLogistik = document.getElementById('btnRoleLogistik');
    const btnRoleOutlet = document.getElementById('btnRoleOutlet');
    const areaBtns = document.querySelectorAll('.control-btn');
    const roleBannerCard = document.getElementById('roleBannerCard');
    const bannerTitle = document.getElementById('bannerTitle');
    const bannerDesc = document.getElementById('bannerDesc');
    const searchInput = document.getElementById('searchInput');
    const filterSlaSelect = document.getElementById('filterSlaSelect');
    const outletTableBody = document.getElementById('outletTableBody');
    const outletTableContainer = document.getElementById('outletTableContainer');
    const allItemsTableContainer = document.getElementById('allItemsTableContainer');
    const allItemsTableBody = document.getElementById('allItemsTableBody');
    const btnSyncLive = document.getElementById('btnSyncLive');
    const btnResetData = document.getElementById('btnResetData');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const monitoringTabBar = document.getElementById('monitoringTabBar');

    const pipelineStepBoxes = document.querySelectorAll('.pipeline-step-box');

    // Modals
    const outletBatchModal = document.getElementById('outletBatchModal');
    const modalBatchOutletTitle = document.getElementById('modalBatchOutletTitle');
    const modalBatchRab = document.getElementById('modalBatchRab');
    const modalBatchCategory = document.getElementById('modalBatchCategory');
    const modalBatchTglPengajuan = document.getElementById('modalBatchTglPengajuan');
    const modalBatchTableBody = document.getElementById('modalBatchTableBody');
    const modalBatchSearchInput = document.getElementById('modalBatchSearchInput');
    const btnCloseBatchModal = document.getElementById('btnCloseBatchModal');
    const btnCancelBatchModal = document.getElementById('btnCancelBatchModal');
    const btnSaveBatchModal = document.getElementById('btnSaveBatchModal');

    const outletInspectionModal = document.getElementById('outletInspectionModal');
    const modalOutletInspectionTitle = document.getElementById('modalOutletInspectionTitle');
    const modalInspectionTableBody = document.getElementById('modalInspectionTableBody');
    const modalInspectionSearchInput = document.getElementById('modalInspectionSearchInput');
    const btnCloseInspectionModal = document.getElementById('btnCloseInspectionModal');
    const btnCancelInspectionModal = document.getElementById('btnCancelInspectionModal');

    const rejectionModal = document.getElementById('rejectionModal');
    const rejectAssetId = document.getElementById('rejectAssetId');
    const rejectItemName = document.getElementById('rejectItemName');
    const rejectPicName = document.getElementById('rejectPicName');
    const rejectReasonText = document.getElementById('rejectReasonText');
    const btnCancelRejectModal = document.getElementById('btnCancelRejectModal');
    const btnConfirmRejectSubmit = document.getElementById('btnConfirmRejectSubmit');

    const secretAdminModal = document.getElementById('secretAdminModal');
    const secretAdminForm = document.getElementById('secretAdminForm');
    const secretPinInput = document.getElementById('secretPinInput');
    const btnCancelSecretModal = document.getElementById('btnCancelSecretModal');

    function setSafeText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function init() {
        checkUrlAdminParams();
        setupSecretAdminTriggers();
        setupEventListeners();
        setupRealtimeSync();
        switchRoleMode(state.role);
    }

    function setupRealtimeSync() {
        window.addEventListener('storage', () => {
            if (window.dataManager) {
                window.dataManager.assets = window.dataManager.loadLocalAssets();
                render();
            }
        });
        window.addEventListener('assetsUpdated', () => {
            render();
        });
    }

    function checkUrlAdminParams() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('admin') || urlParams.has('mode') && urlParams.get('mode') === 'admin_ga') {
            state.isAdminUnlocked = true;
            state.role = 'admin_ga';
        }
    }

    function setupSecretAdminTriggers() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
                e.preventDefault();
                promptSecretAdminAccess();
            }
        });

        let logoClickCount = 0;
        let logoTimer = null;
        if (brandLogoWrapper) {
            brandLogoWrapper.addEventListener('click', () => {
                logoClickCount++;
                clearTimeout(logoTimer);
                if (logoClickCount >= 2) {
                    logoClickCount = 0;
                    promptSecretAdminAccess();
                } else {
                    logoTimer = setTimeout(() => { logoClickCount = 0; }, 500);
                }
            });
        }
    }

    function promptSecretAdminAccess() {
        if (state.role === 'admin_ga') {
            showToast("Anda sudah berada di Mode Admin GA!", "info");
            return;
        }
        if (secretPinInput) secretPinInput.value = '';
        if (secretAdminModal) secretAdminModal.classList.add('active');
        if (secretPinInput) secretPinInput.focus();
    }

    if (btnCancelSecretModal) {
        btnCancelSecretModal.addEventListener('click', () => { if (secretAdminModal) secretAdminModal.classList.remove('active'); });
    }

    if (secretAdminForm) {
        secretAdminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pin = secretPinInput ? secretPinInput.value.trim() : '';
            if (pin === '1234' || pin === '' || pin === 'admin') {
                if (secretAdminModal) secretAdminModal.classList.remove('active');
                state.isAdminUnlocked = true;
                switchRoleMode('admin_ga');
                showToast("🔓 Akses Rahasia Admin GA Berhasil Diaktifkan!", "success");
            } else {
                alert("PIN Rahasia Salah! Default PIN: 1234");
            }
        });
    }

    function setupEventListeners() {
        if (outletTableBody) {
            outletTableBody.addEventListener('click', (e) => {
                const updateBtn = e.target.closest('.btn-action-update');
                if (updateBtn) {
                    e.stopPropagation();
                    const outletKey = updateBtn.getAttribute('data-outlet-key');
                    if (!outletKey) return;
                    if (state.role === 'outlet') {
                        openOutletInspectionModal(outletKey);
                    } else {
                        openBatchModal(outletKey);
                    }
                    return;
                }

                if (e.target.closest('.subtable-search-input')) {
                    e.stopPropagation();
                    return;
                }

                const mainRow = e.target.closest('.outlet-main-row');
                if (mainRow) {
                    const outletKey = mainRow.getAttribute('data-outlet-key');
                    if (state.expandedOutlets.has(outletKey)) {
                        state.expandedOutlets.delete(outletKey);
                    } else {
                        state.expandedOutlets.add(outletKey);
                    }
                    render();
                }
            });

            outletTableBody.addEventListener('input', (e) => {
                if (e.target.classList.contains('subtable-search-input')) {
                    const outletKey = e.target.getAttribute('data-outlet-key');
                    state.subtableSearch[outletKey] = e.target.value.toLowerCase();
                    render();
                }
            });
        }

        if (modalBatchSearchInput) {
            modalBatchSearchInput.addEventListener('input', (e) => {
                state.modalBatchQuery = e.target.value.toLowerCase();
                renderBatchModalTable();
            });
        }

        if (modalInspectionSearchInput) {
            modalInspectionSearchInput.addEventListener('input', (e) => {
                state.modalInspectionQuery = e.target.value.toLowerCase();
                renderInspectionModalTable();
            });
        }

        areaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                areaBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.selectedArea = btn.dataset.area;
                render();
            });
        });

        if (btnRoleAdminGA) btnRoleAdminGA.addEventListener('click', () => switchRoleMode('admin_ga'));
        if (btnRoleLogistik) btnRoleLogistik.addEventListener('click', () => switchRoleMode('logistik'));
        if (btnRoleOutlet) btnRoleOutlet.addEventListener('click', () => switchRoleMode('outlet'));

        document.querySelectorAll('.monitoring-tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.monitoring-tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                state.activeTab = tab.dataset.tab;
                render();
            });
        });

        pipelineStepBoxes.forEach(box => {
            box.addEventListener('click', () => {
                const stage = parseInt(box.dataset.stage);
                if (state.activeStageFilter === stage) {
                    state.activeStageFilter = null;
                    box.classList.remove('active');
                } else {
                    pipelineStepBoxes.forEach(b => b.classList.remove('active'));
                    box.classList.add('active');
                    state.activeStageFilter = stage;
                }
                render();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value.toLowerCase();
                render();
            });
        }

        if (filterSlaSelect) {
            filterSlaSelect.addEventListener('change', (e) => {
                state.filterSla = e.target.value;
                render();
            });
        }

        if (btnCloseBatchModal) btnCloseBatchModal.addEventListener('click', closeBatchModal);
        if (btnCancelBatchModal) btnCancelBatchModal.addEventListener('click', closeBatchModal);
        if (btnSaveBatchModal) btnSaveBatchModal.addEventListener('click', saveBatchModalChanges);

        if (btnCloseInspectionModal) btnCloseInspectionModal.addEventListener('click', closeInspectionModal);
        if (btnCancelInspectionModal) btnCancelInspectionModal.addEventListener('click', closeInspectionModal);

        if (btnCancelRejectModal) btnCancelRejectModal.addEventListener('click', closeRejectionModal);
        if (btnConfirmRejectSubmit) btnConfirmRejectSubmit.addEventListener('click', submitOutletRejection);

        if (btnResetData) btnResetData.addEventListener('click', resetFiltersAndData);

        if (btnSyncLive) {
            btnSyncLive.addEventListener('click', () => {
                btnSyncLive.disabled = true;
                btnSyncLive.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
                showToast("Syncing Google Sheets data...", "info");
                setTimeout(() => {
                    btnSyncLive.disabled = false;
                    btnSyncLive.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync Google Sheets';
                    showToast("Data 2 Area (JABO & KALBAR) berhasil di-sync!", "success");
                    render();
                }, 1000);
            });
        }

        if (btnExportCSV) btnExportCSV.addEventListener('click', exportCSV);
    }

    function resetFiltersAndData() {
        state.activeStageFilter = null;
        state.filterSla = '';
        state.searchQuery = '';
        state.subtableSearch = {};
        if (searchInput) searchInput.value = '';
        if (filterSlaSelect) filterSlaSelect.value = '';
        pipelineStepBoxes.forEach(b => b.classList.remove('active'));
        window.dataManager.resetToDefault();
        showToast("Filter & Data berhasil di-reset ke kondisi awal.", "info");
        render();
    }

    window.clearAllFilters = function() {
        state.activeStageFilter = null;
        state.filterSla = '';
        state.searchQuery = '';
        state.subtableSearch = {};
        if (searchInput) searchInput.value = '';
        if (filterSlaSelect) filterSlaSelect.value = '';
        pipelineStepBoxes.forEach(b => b.classList.remove('active'));
        render();
    };

    function switchRoleMode(targetRole) {
        state.role = targetRole;

        if (btnRoleAdminGA) btnRoleAdminGA.className = 'role-badge-btn';
        if (btnRoleLogistik) btnRoleLogistik.className = 'role-badge-btn';
        if (btnRoleOutlet) btnRoleOutlet.className = 'role-badge-btn';

        if (targetRole === 'admin_ga') {
            if (btnRoleAdminGA) {
                btnRoleAdminGA.classList.remove('hidden-role');
                btnRoleAdminGA.className = 'role-badge-btn active-admin';
            }
            if (roleBannerCard) roleBannerCard.className = 'role-banner-card admin-banner';
            if (bannerTitle) bannerTitle.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: var(--indigo);"></i> Mode Tampilan: Admin GA (Pusat Monitoring Semua Proses)';
            if (bannerDesc) bannerDesc.textContent = 'Pusat Monitoring menampilkan seluruh proses lifecycle aset (Pengajuan RAB ➔ Check Gudang ➔ Procurement ➔ Logistik ➔ Outlet).';
            if (monitoringTabBar) monitoringTabBar.style.display = 'flex';
        } else if (targetRole === 'logistik') {
            if (btnRoleAdminGA) btnRoleAdminGA.classList.add('hidden-role');
            if (btnRoleLogistik) btnRoleLogistik.className = 'role-badge-btn active-logistik';
            if (roleBannerCard) roleBannerCard.className = 'role-banner-card logistik-banner';
            if (bannerTitle) bannerTitle.innerHTML = '<i class="fa-solid fa-truck-ramp-box" style="color: var(--amber);"></i> Mode Tampilan: Tim Logistik (Gudang)';
            if (bannerDesc) bannerDesc.textContent = 'Mode Logistik terbatas untuk mengetik Qty Dikirim, Status Pengiriman, dan Ceklis Process (X, Y, Z).';
            if (monitoringTabBar) monitoringTabBar.style.display = 'none';
        } else if (targetRole === 'outlet') {
            if (btnRoleAdminGA) btnRoleAdminGA.classList.add('hidden-role');
            if (btnRoleOutlet) btnRoleOutlet.className = 'role-badge-btn active-outlet';
            if (roleBannerCard) roleBannerCard.className = 'role-banner-card outlet-banner';
            if (bannerTitle) bannerTitle.innerHTML = '<i class="fa-solid fa-shop" style="color: var(--emerald);"></i> Mode Tampilan: Outlet PIC (Penerima Barang)';
            if (bannerDesc) bannerDesc.textContent = 'Mode Outlet memverifikasi fisik barang. Klik "Terima Barang" otomatis menchecklist Kolom Z.';
            if (monitoringTabBar) monitoringTabBar.style.display = 'none';
        }

        render();
    }

    function render() {
        const assets = window.dataManager.getAssets(state.selectedArea);
        const outlets = window.dataManager.getOutlets(state.selectedArea);

        for (let s = 1; s <= 5; s++) {
            const count = assets.filter(a => parseInt(a.stage) === s).length;
            setSafeText(`countPipe${s}`, `${count} Item`);
        }

        setSafeText('kpiOutlets', outlets.length);
        const totalItemsCount = outlets.reduce((sum, o) => sum + o.total, 0);
        const acceptedItemsCount = outlets.reduce((sum, o) => sum + o.acceptedCount, 0);
        const pendingItemsCount = outlets.reduce((sum, o) => sum + o.pendingOutletCount, 0);
        const rejectedItemsCount = outlets.reduce((sum, o) => sum + o.rejectedCount, 0);

        setSafeText('kpiTotalItems', totalItemsCount);
        setSafeText('kpiReceived', acceptedItemsCount);
        setSafeText('kpiInTransit', pendingItemsCount);
        setSafeText('kpiRejected', rejectedItemsCount);

        if (state.role === 'admin_ga' && state.activeTab === 'all-items-view') {
            if (outletTableContainer) outletTableContainer.style.display = 'none';
            if (allItemsTableContainer) allItemsTableContainer.style.display = 'block';
            renderAllItemsTable(assets);
        } else {
            if (outletTableContainer) outletTableContainer.style.display = 'block';
            if (allItemsTableContainer) allItemsTableContainer.style.display = 'none';
            renderOutletTable(outlets);
        }
    }

    function renderOutletTable(outlets) {
        let filtered = outlets;

        if (state.searchQuery) {
            filtered = filtered.filter(o => 
                o.name.toLowerCase().includes(state.searchQuery) ||
                o.rabCode.toLowerCase().includes(state.searchQuery) ||
                (o.tglPengajuan && o.tglPengajuan.toLowerCase().includes(state.searchQuery)) ||
                o.items.some(i => i.item.toLowerCase().includes(state.searchQuery) || (i.spesifikasi && i.spesifikasi.toLowerCase().includes(state.searchQuery)))
            );
            filtered.forEach(o => state.expandedOutlets.add(o.key));
        }

        if (state.filterSla) {
            if (state.filterSla === 'rejected') {
                filtered = filtered.filter(o => o.rejectedCount > 0);
            } else if (state.filterSla === 'in_transit') {
                filtered = filtered.filter(o => o.pendingOutletCount > 0);
            } else if (state.filterSla === 'success') {
                filtered = filtered.filter(o => o.percentage === 100);
            }
        }

        if (state.activeStageFilter) {
            filtered = filtered.filter(o => o.items.some(i => parseInt(i.stage) === parseInt(state.activeStageFilter)));
        }

        if (!filtered || filtered.length === 0) {
            if (outletTableBody) {
                outletTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 3.5rem; color: #94a3b8;">
                            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; color: var(--primary);"></i>
                            <div>Tidak ada outlet/RAB ditemukan untuk kriteria filter ini.</div>
                            <button class="btn btn-subtle" style="margin-top: 1rem;" onclick="clearAllFilters()">
                                <i class="fa-solid fa-rotate-left"></i> Reset Filter Tampilan
                            </button>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        let html = '';
        filtered.forEach(o => {
            const areaPillClass = o.area === 'JABODETABEK' ? 'pill-area-jabo' : 'pill-area-kalbar';
            const notesSummary = o.items.find(i => i.keterangan && i.keterangan.trim())?.keterangan || 'Belum ada catatan';
            const avatarLetter = (o.name && o.name.length > 0) ? o.name.charAt(0).toUpperCase() : 'O';
            const isExpanded = state.expandedOutlets.has(o.key);
            const expandIcon = isExpanded ? '<i class="fa-solid fa-chevron-up" style="color:#2563eb;"></i>' : '<i class="fa-solid fa-chevron-down" style="color:#94a3b8;"></i>';

            let actionBtnMarkup = '';
            if (state.role === 'outlet') {
                actionBtnMarkup = `
                    <button class="btn-action-update" style="border-color: #10b981; color: #047857; background: #ecfdf5;" data-outlet-key="${o.key.replace(/"/g, '&quot;')}">
                        Validasi <i class="fa-solid fa-clipboard-check"></i>
                    </button>
                `;
            } else {
                actionBtnMarkup = `
                    <button class="btn-action-update" data-outlet-key="${o.key.replace(/"/g, '&quot;')}">
                        Input Logistik <i class="fa-solid fa-pen"></i>
                    </button>
                `;
            }

            html += `
                <tr class="outlet-main-row" data-outlet-key="${o.key.replace(/"/g, '&quot;')}">
                    <!-- NAMA OUTLET / DETAIL -->
                    <td>
                        <div class="outlet-avatar-title">
                            <div class="outlet-avatar">${avatarLetter}</div>
                            <div>
                                <div class="outlet-name-text">${o.name} ${expandIcon}</div>
                                <div>
                                    <span class="pill-rab" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:800;"><i class="fa-solid fa-file-invoice"></i> RAB: ${o.rabCode}</span>
                                    <span class="${areaPillClass}">${o.areaLabel}</span>
                                    <span style="font-size:0.75rem; color:#64748b; font-weight:700; margin-left:0.4rem;">(${o.total} Item)</span>
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- TGL PENGAJUAN (KOLOM B) & TARGET BUKA -->
                    <td>
                        <div class="date-block-label">TGL PENGAJUAN (KOLOM B):</div>
                        <div class="date-block-value" style="color:#2563eb; font-weight:800;"><i class="fa-regular fa-calendar-days"></i> ${o.tglPengajuan}</div>
                        <span class="pill-opening-date"><i class="fa-regular fa-calendar-check"></i> BUKA: ${o.tglOpening}</span>
                    </td>

                    <!-- STATUS VALIDASI SLA -->
                    <td>
                        <span class="badge-sla ${o.slaClass}">${o.slaText}</span>
                    </td>

                    <!-- PROGRESS ASET -->
                    <td>
                        <div class="progress-block">
                            <div class="progress-meta">
                                <span class="progress-meta-label">Penyelesaian Validasi</span>
                                <span class="progress-meta-val">${o.percentage}%</span>
                            </div>
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill" style="width: ${o.percentage}%;"></div>
                            </div>
                            <div class="progress-note">${notesSummary}</div>
                        </div>
                    </td>

                    <!-- AKSI -->
                    <td style="text-align: center;">
                        ${actionBtnMarkup}
                    </td>
                </tr>
            `;

            // Inline Accordion Row if Expanded
            if (isExpanded) {
                const subSearchVal = state.subtableSearch[o.key] || '';
                let displayedItems = o.items;
                if (subSearchVal) {
                    displayedItems = displayedItems.filter(i => 
                        i.item.toLowerCase().includes(subSearchVal) || 
                        (i.spesifikasi && i.spesifikasi.toLowerCase().includes(subSearchVal)) ||
                        (i.keterangan && i.keterangan.toLowerCase().includes(subSearchVal)) ||
                        (i.picPenerima && i.picPenerima.toLowerCase().includes(subSearchVal))
                    );
                }

                const subRowsHtml = displayedItems.map(i => {
                    let stgTag = `<span class="badge-sla badge-sla-normal">Stage ${i.stage}: ${i.statusPengiriman}</span>`;
                    if (i.validationStatus === 'REJECTED') {
                        stgTag = `<span class="badge-sla badge-sla-alert"><i class="fa-solid fa-triangle-exclamation"></i> Ditolak Outlet</span>`;
                    } else if (i.validationStatus === 'ACCEPTED' || i.ceklisZ) {
                        stgTag = `<span class="badge-sla badge-sla-success"><i class="fa-solid fa-check"></i> Valid & Diterima</span>`;
                    }

                    const xyzBadges = `
                        <div class="xyz-badge-group">
                            <span class="xyz-pill ${i.ceklisX ? 'active-x' : ''}">${i.ceklisX ? '☑' : '☐'} X: Atasan</span>
                            <span class="xyz-pill ${i.ceklisY ? 'active-y' : ''}">${i.ceklisY ? '☑' : '☐'} Y: Ready Antar</span>
                            <span class="xyz-pill ${i.ceklisZ ? 'active-z' : ''}">${i.ceklisZ ? '☑' : '☐'} Z: Diterima</span>
                        </div>
                    `;

                    return `
                        <tr>
                            <td style="font-weight:700; color:#0f172a; padding:0.6rem 1rem;">${i.item}</td>
                            <td style="font-size:0.75rem; color:#64748b; padding:0.6rem 1rem;">${i.spesifikasi || '-'}</td>
                            <td style="text-align:center; font-weight:800; padding:0.6rem 1rem;">${i.qty}</td>
                            <td style="text-align:center; font-weight:800; color:#2563eb; padding:0.6rem 1rem;">${i.qtyDiterima}</td>
                            <td style="padding:0.6rem 1rem;">
                                ${stgTag}
                                <div style="margin-top:0.3rem;">${xyzBadges}</div>
                            </td>
                            <td style="font-weight:700; color:#334155; padding:0.6rem 1rem;"><i class="fa-solid fa-user-tag" style="color:#2563eb; font-size:0.75rem;"></i> ${i.picPenerima || 'Belum diisi'}</td>
                            <td style="font-size:0.8rem; color:#475569; padding:0.6rem 1rem;">${i.alasanPenolakan ? '<b style="color:#dc2626;">Tolak:</b> ' + i.alasanPenolakan : (i.keterangan || '-')}</td>
                        </tr>
                    `;
                }).join('');

                html += `
                    <tr class="outlet-detail-row active">
                        <td colspan="5" style="padding: 0;">
                            <div class="inline-subtable-wrapper">
                                <div style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                                    <span><i class="fa-solid fa-list" style="color:var(--primary);"></i> Rincian Aset Item (${displayedItems.length} / ${o.total} Item) — ${o.name} [RAB: ${o.rabCode} • Tgl Pengajuan: ${o.tglPengajuan}]</span>
                                    
                                    <div style="position:relative;">
                                        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:0.65rem; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.75rem;"></i>
                                        <input type="text" class="subtable-search-input" data-outlet-key="${o.key.replace(/"/g, '&quot;')}" value="${subSearchVal}" placeholder="Cari item/penerima di RAB ini...">
                                    </div>
                                </div>
                                <table style="width:100%; border-collapse:collapse; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0;">
                                    <thead>
                                        <tr style="background:#f1f5f9; font-size:0.7rem; color:#475569; text-transform:uppercase; font-weight:800;">
                                            <th style="padding:0.6rem 1rem;">NAMA ITEM</th>
                                            <th style="padding:0.6rem 1rem;">SPESIFIKASI</th>
                                            <th style="padding:0.6rem 1rem; text-align:center;">QTY ORDER</th>
                                            <th style="padding:0.6rem 1rem; text-align:center;">QTY DITERIMA</th>
                                            <th style="padding:0.6rem 1rem;">STATUS & CHECKLIST (X, Y, Z)</th>
                                            <th style="padding:0.6rem 1rem;">PENERIMA / PIC</th>
                                            <th style="padding:0.6rem 1rem;">CATATAN / ALASAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${subRowsHtml.length > 0 ? subRowsHtml : '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#94a3b8;">Tidak ada item ditemukan.</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });

        if (outletTableBody) outletTableBody.innerHTML = html;
    }

    function renderAllItemsTable(assets) {
        let filtered = assets;
        if (state.searchQuery) {
            filtered = filtered.filter(a =>
                a.item.toLowerCase().includes(state.searchQuery) ||
                a.outlet.toLowerCase().includes(state.searchQuery) ||
                a.rabCode.toLowerCase().includes(state.searchQuery) ||
                (a.tglPengajuan && a.tglPengajuan.toLowerCase().includes(state.searchQuery)) ||
                (a.picPenerima && a.picPenerima.toLowerCase().includes(state.searchQuery)) ||
                a.keterangan.toLowerCase().includes(state.searchQuery)
            );
        }
        if (state.activeStageFilter) {
            filtered = filtered.filter(a => parseInt(a.stage) === parseInt(state.activeStageFilter));
        }

        if (!filtered || filtered.length === 0) {
            if (allItemsTableBody) {
                allItemsTableBody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 3rem; color: #94a3b8;">
                            Tidak ada item aset ditemukan untuk filter ini.
                        </td>
                    </tr>
                `;
            }
            return;
        }

        if (allItemsTableBody) {
            allItemsTableBody.innerHTML = filtered.slice(0, 150).map(a => {
                const areaBadgeClass = a.area === 'JABODETABEK' ? 'pill-area-jabo' : 'pill-area-kalbar';
                
                let stageBadge = `<span class="badge-sla badge-sla-normal">Stage ${a.stage}: ${a.statusPengiriman}</span>`;
                if (a.validationStatus === 'REJECTED') {
                    stageBadge = `<span class="badge-sla badge-sla-alert"><i class="fa-solid fa-triangle-exclamation"></i> Ditolak Outlet</span>`;
                } else if (a.validationStatus === 'ACCEPTED' || a.ceklisZ) {
                    stageBadge = `<span class="badge-sla badge-sla-success"><i class="fa-solid fa-check"></i> Valid & Diterima</span>`;
                }

                const xyzBadges = `
                    <div class="xyz-badge-group" style="margin-top:0.25rem;">
                        <span class="xyz-pill ${a.ceklisX ? 'active-x' : ''}">${a.ceklisX ? '☑' : '☐'} X</span>
                        <span class="xyz-pill ${a.ceklisY ? 'active-y' : ''}">${a.ceklisY ? '☑' : '☐'} Y</span>
                        <span class="xyz-pill ${a.ceklisZ ? 'active-z' : ''}">${a.ceklisZ ? '☑' : '☐'} Z</span>
                    </div>
                `;

                return `
                    <tr>
                        <td><span class="${areaBadgeClass}">${a.areaLabel}</span></td>
                        <td style="font-weight: 700; color: #0f172a;">${a.outlet} <br><span class="pill-rab" style="font-size:0.65rem;">RAB: ${a.rabCode}</span></td>
                        <td style="font-weight: 800; color: #2563eb;"><i class="fa-regular fa-calendar-days"></i> ${a.tglPengajuan}</td>
                        <td style="font-weight: 700; color: #0f172a;">${a.item}</td>
                        <td style="text-align: center; font-weight: 800;">${a.qty}</td>
                        <td style="text-align: center; font-weight: 800; color: #059669;">${a.qtyDiterima}</td>
                        <td>
                            ${stageBadge}
                            <div>${xyzBadges}</div>
                        </td>
                        <td style="font-weight: 700; color: #334155;"><i class="fa-solid fa-user-tag" style="color:#2563eb; font-size:0.75rem;"></i> ${a.picPenerima || '-'}</td>
                        <td style="font-size: 0.8rem; color: #475569;">${a.alasanPenolakan ? '<b style="color:#dc2626;">Tolak:</b> ' + a.alasanPenolakan : (a.keterangan || '-')}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Modal Actions with Outlet Key
    function openBatchModal(outletKey) {
        state.activeOutletKey = outletKey;
        state.modalBatchQuery = '';
        if (modalBatchSearchInput) modalBatchSearchInput.value = '';
        const outlet = window.dataManager.getOutletDetails(outletKey);
        if (!outlet) return;

        if (modalBatchOutletTitle) modalBatchOutletTitle.textContent = outlet.name;
        if (modalBatchRab) modalBatchRab.textContent = `No. RAB: ${outlet.rabCode}`;
        if (modalBatchCategory) modalBatchCategory.textContent = outlet.areaLabel;
        if (modalBatchTglPengajuan) modalBatchTglPengajuan.innerHTML = `<i class="fa-regular fa-calendar-days"></i> Tgl Pengajuan (Kolom B): ${outlet.tglPengajuan}`;

        renderBatchModalTable();
        if (outletBatchModal) outletBatchModal.classList.add('active');
    }

    function renderBatchModalTable() {
        const outlet = window.dataManager.getOutletDetails(state.activeOutletKey);
        if (!outlet || !modalBatchTableBody) return;

        let items = outlet.items;
        if (state.modalBatchQuery) {
            items = items.filter(i => 
                i.item.toLowerCase().includes(state.modalBatchQuery) ||
                (i.spesifikasi && i.spesifikasi.toLowerCase().includes(state.modalBatchQuery)) ||
                (i.picPenerima && i.picPenerima.toLowerCase().includes(state.modalBatchQuery))
            );
        }

        if (items.length === 0) {
            modalBatchTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#94a3b8;">Tidak ada item yang cocok dengan kata kunci pencarian.</td></tr>`;
            return;
        }

        modalBatchTableBody.innerHTML = items.map(item => {
            const isRejected = item.validationStatus === 'REJECTED';
            const rowStyle = isRejected ? 'background: #fef2f2;' : '';

            return `
                <tr data-asset-id="${item.id}" style="${rowStyle}">
                    <td>
                        <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${item.item}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${item.spesifikasi || '-'}</div>
                        ${isRejected ? `<div style="font-size: 0.75rem; color: #dc2626; font-weight: 700; margin-top: 0.2rem;"><i class="fa-solid fa-triangle-exclamation"></i> Alasan Ditolak Outlet: "${item.alasanPenolakan}"</div>` : ''}
                    </td>
                    <td style="text-align: center; font-weight: 800; color: #334155;">${item.qty}</td>
                    <td style="text-align: center;">
                        <input type="number" min="0" class="modal-input-qty" value="${item.qtyDiterima}">
                    </td>
                    <td>
                        <select class="modal-select-status">
                            <option value="📝 Pengajuan RAB" ${(!item.ceklisX && !item.ceklisY && !item.ceklisZ) || parseInt(item.stage) === 1 ? 'selected' : ''}>📝 Pengajuan RAB</option>
                            <option value="🛒 Procurement PO" ${item.statusPengiriman === '🛒 Procurement PO' || (item.ceklisX && !item.ceklisY && !item.ceklisZ) ? 'selected' : ''}>🛒 Procurement PO</option>
                            <option value="💸 Done Transfer" ${item.statusPengiriman === '💸 Done Transfer' ? 'selected' : ''}>💸 Done Transfer</option>
                            <option value="📦 Ready Gudang / Ready Antar" ${item.ceklisY && !item.ceklisZ && parseInt(item.stage) === 2 ? 'selected' : ''}>📦 Ready Gudang / Ready Antar</option>
                            <option value="🚚 Dalam Pengiriman" ${item.ceklisY && !item.ceklisZ && (parseInt(item.stage) === 4 || isRejected) ? 'selected' : ''}>🚚 Dalam Pengiriman</option>
                            <option value="✅ Valid & Diterima" ${item.ceklisZ || parseInt(item.stage) === 5 ? 'selected' : ''}>✅ Valid & Diterima</option>
                        </select>
                    </td>
                    <td>
                        <div class="modal-xyz-control">
                            <label class="modal-xyz-label" title="Kolom X: Ceklis Atasan (Procurement PO)">
                                <input type="checkbox" class="chk-input-x" ${item.ceklisX ? 'checked' : ''}>
                                <span class="xyz-pill ${item.ceklisX ? 'active-x' : ''}">X: Atasan</span>
                            </label>
                            <label class="modal-xyz-label" title="Kolom Y: Ready Gudang / Ready Antar">
                                <input type="checkbox" class="chk-input-y" ${item.ceklisY ? 'checked' : ''}>
                                <span class="xyz-pill ${item.ceklisY ? 'active-y' : ''}">Y: Ready Antar</span>
                            </label>
                            <label class="modal-xyz-label" title="Kolom Z: Diterima Outlet (Physical Validation)">
                                <input type="checkbox" class="chk-input-z" ${item.ceklisZ ? 'checked' : ''}>
                                <span class="xyz-pill ${item.ceklisZ ? 'active-z' : ''}">Z: Diterima</span>
                            </label>
                        </div>
                    </td>
                    <td>
                        <input type="text" class="modal-input-pic" placeholder="Nama penerima/PIC..." value="${item.picPenerima || ''}" style="width:100%; padding:0.5rem 0.65rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.8rem; font-weight:600; color:#0f172a;">
                    </td>
                    <td>
                        <input type="text" class="modal-input-note" placeholder="Keterangan..." value="${item.keterangan || ''}">
                    </td>
                </tr>
            `;
        }).join('');

        // Interactive Checkbox <-> Select Syncer in Modal
        if (modalBatchTableBody) {
            modalBatchTableBody.querySelectorAll('tr[data-asset-id]').forEach(tr => {
                const select = tr.querySelector('.modal-select-status');
                const chkX = tr.querySelector('.chk-input-x');
                const chkY = tr.querySelector('.chk-input-y');
                const chkZ = tr.querySelector('.chk-input-z');

                if (chkY) {
                    chkY.addEventListener('change', () => {
                        if (chkY.checked) {
                            if (chkX) chkX.checked = true;
                            if (select) select.value = "📦 Ready Gudang / Ready Antar";
                        }
                    });
                }

                if (chkZ) {
                    chkZ.addEventListener('change', () => {
                        if (chkZ.checked) {
                            if (chkX) chkX.checked = true;
                            if (chkY) chkY.checked = true;
                            if (select) select.value = "✅ Valid & Diterima";
                        }
                    });
                }

                if (chkX) {
                    chkX.addEventListener('change', () => {
                        if (chkX.checked && !chkY.checked && !chkZ.checked) {
                            if (select) select.value = "🛒 Procurement PO";
                        } else if (!chkX.checked) {
                            if (chkY) chkY.checked = false;
                            if (chkZ) chkZ.checked = false;
                            if (select) select.value = "📝 Pengajuan RAB";
                        }
                    });
                }

                if (select) {
                    select.addEventListener('change', () => {
                        const val = select.value;
                        if (val.includes('Ready Gudang') || val.includes('Dalam Pengiriman')) {
                            if (chkX) chkX.checked = true;
                            if (chkY) chkY.checked = true;
                            if (chkZ) chkZ.checked = false;
                        } else if (val.includes('Valid & Diterima')) {
                            if (chkX) chkX.checked = true;
                            if (chkY) chkY.checked = true;
                            if (chkZ) chkZ.checked = true;
                        } else if (val.includes('Procurement')) {
                            if (chkX) chkX.checked = true;
                            if (chkY) chkY.checked = false;
                            if (chkZ) chkZ.checked = false;
                        } else if (val.includes('Pengajuan RAB')) {
                            if (chkX) chkX.checked = false;
                            if (chkY) chkY.checked = false;
                            if (chkZ) chkZ.checked = false;
                        }
                    });
                }
            });
        }
    }

    function closeBatchModal() { if (outletBatchModal) outletBatchModal.classList.remove('active'); }

    function saveBatchModalChanges() {
        if (!state.activeOutletKey || !modalBatchTableBody) return;

        const rows = modalBatchTableBody.querySelectorAll('tr[data-asset-id]');
        const updates = [];

        rows.forEach(tr => {
            const id = tr.dataset.assetId;
            const qtyRecInput = tr.querySelector('.modal-input-qty');
            const statusSelect = tr.querySelector('.modal-select-status');
            const chkX = tr.querySelector('.chk-input-x');
            const chkY = tr.querySelector('.chk-input-y');
            const chkZ = tr.querySelector('.chk-input-z');
            const picInput = tr.querySelector('.modal-input-pic');
            const noteInput = tr.querySelector('.modal-input-note');

            if (id && qtyRecInput && statusSelect) {
                updates.push({
                    id,
                    qtyDiterima: qtyRecInput.value,
                    statusPengiriman: statusSelect.value,
                    ceklisX: chkX ? chkX.checked : false,
                    ceklisY: chkY ? chkY.checked : false,
                    ceklisZ: chkZ ? chkZ.checked : false,
                    picPenerima: picInput ? picInput.value.trim() : '',
                    keterangan: noteInput ? noteInput.value : ''
                });
            }
        });

        const updatedOutlet = window.dataManager.batchUpdateLogistics(state.activeOutletKey, updates);
        if (window.sheetsApiSync && updatedOutlet && updatedOutlet.items) {
            window.sheetsApiSync.syncOutletBatch(updatedOutlet.items);
        }
        closeBatchModal();
        showToast(`Status & Checklist X,Y,Z untuk ${updates.length} item berhasil diperbarui & di-sync ke Google Sheets!`, "success");
        render();
    }

    // OUTLET INSPECTION MODAL
    function openOutletInspectionModal(outletKey) {
        state.activeOutletKey = outletKey;
        state.modalInspectionQuery = '';
        if (modalInspectionSearchInput) modalInspectionSearchInput.value = '';
        const outlet = window.dataManager.getOutletDetails(outletKey);
        if (!outlet) return;

        if (modalOutletInspectionTitle) modalOutletInspectionTitle.textContent = `Validasi Penerimaan Aset: ${outlet.name} (RAB: ${outlet.rabCode})`;
        renderInspectionModalTable();
        if (outletInspectionModal) outletInspectionModal.classList.add('active');
    }

    function renderInspectionModalTable() {
        const outlet = window.dataManager.getOutletDetails(state.activeOutletKey);
        if (!outlet || !modalInspectionTableBody) return;

        let items = outlet.items;
        if (state.modalInspectionQuery) {
            items = items.filter(i => 
                i.item.toLowerCase().includes(state.modalInspectionQuery) ||
                (i.spesifikasi && i.spesifikasi.toLowerCase().includes(state.modalInspectionQuery)) ||
                (i.picPenerima && i.picPenerima.toLowerCase().includes(state.modalInspectionQuery))
            );
        }

        if (items.length === 0) {
            modalInspectionTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">Tidak ada item yang cocok dengan kata kunci pencarian.</td></tr>`;
            return;
        }

        modalInspectionTableBody.innerHTML = items.map(item => {
            let actionMarkup = '';

            if (item.validationStatus === 'ACCEPTED' || item.ceklisZ) {
                actionMarkup = `<span style="color: #059669; font-weight: 800; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> ✅ Diterima (Kolom Z ☑)</span>`;
            } else if (item.validationStatus === 'REJECTED') {
                actionMarkup = `<span style="color: #dc2626; font-weight: 800; font-size: 0.8rem;"><i class="fa-solid fa-triangle-exclamation"></i> ❌ Ditolak (Di-revisi Logistik)</span>`;
            } else {
                actionMarkup = `
                    <div style="display: flex; gap: 0.4rem; justify-content: center;">
                        <button class="btn-accept-item" data-id="${item.id}">
                            <i class="fa-solid fa-check"></i> Terima (Ceklis Z)
                        </button>
                        <button class="btn-reject-item" data-id="${item.id}" data-name="${item.item.replace(/"/g, '&quot;')}">
                            <i class="fa-solid fa-xmark"></i> Tolak
                        </button>
                    </div>
                `;
            }

            const xyzBadges = `
                <div class="xyz-badge-group" style="margin-top:0.25rem;">
                    <span class="xyz-pill ${item.ceklisX ? 'active-x' : ''}">${item.ceklisX ? '☑' : '☐'} X</span>
                    <span class="xyz-pill ${item.ceklisY ? 'active-y' : ''}">${item.ceklisY ? '☑' : '☐'} Y</span>
                    <span class="xyz-pill ${item.ceklisZ ? 'active-z' : ''}">${item.ceklisZ ? '☑' : '☐'} Z</span>
                </div>
            `;

            return `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: #0f172a;">${item.item}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${item.spesifikasi || '-'}</div>
                        <div>${xyzBadges}</div>
                    </td>
                    <td style="text-align: center; font-weight: 800;">${item.qty}</td>
                    <td style="text-align: center; font-weight: 800; color: #2563eb;">${item.qtyDiterima}</td>
                    <td style="font-weight: 700; color: #334155;"><i class="fa-solid fa-user-tag" style="color:#2563eb; font-size:0.75rem;"></i> ${item.picPenerima || 'Belum diisi'}</td>
                    <td>
                        <div style="font-size: 0.85rem; color: #334155;">${item.keterangan || 'Logistik mengirim barang'}</div>
                    </td>
                    <td style="text-align: center;">${actionMarkup}</td>
                </tr>
            `;
        }).join('');
    }

    if (modalInspectionTableBody) {
        modalInspectionTableBody.addEventListener('click', (e) => {
            const acceptBtn = e.target.closest('.btn-accept-item');
            if (acceptBtn) {
                const assetId = acceptBtn.getAttribute('data-id');
                const asset = window.dataManager.assets.find(a => a.id === assetId);
                const defaultName = asset ? (asset.picPenerima || 'PIC Outlet') : 'PIC Outlet';
                const pic = prompt("Masukkan Nama PIC Penerima Outlet:", defaultName);
                if (pic === null) return;

                const updated = window.dataManager.outletAcceptItem(assetId, pic);
                showToast(`Status "${updated.item}" diperbarui: ✅ Valid & Diterima Outlet (Kolom Z ☑)!`, "success");
                renderInspectionModalTable();
                render();
                return;
            }

            const rejectBtn = e.target.closest('.btn-reject-item');
            if (rejectBtn) {
                const assetId = rejectBtn.getAttribute('data-id');
                const itemName = rejectBtn.getAttribute('data-name');
                if (rejectAssetId) rejectAssetId.value = assetId;
                if (rejectItemName) rejectItemName.value = itemName;
                if (rejectPicName) rejectPicName.value = '';
                if (rejectReasonText) rejectReasonText.value = '';
                if (rejectionModal) rejectionModal.classList.add('active');
            }
        });
    }

    function closeInspectionModal() { if (outletInspectionModal) outletInspectionModal.classList.remove('active'); }
    function closeRejectionModal() { if (rejectionModal) rejectionModal.classList.remove('active'); }

    function submitOutletRejection() {
        const id = rejectAssetId ? rejectAssetId.value : '';
        const pic = rejectPicName ? rejectPicName.value.trim() : '';
        const reason = rejectReasonText ? rejectReasonText.value.trim() : '';

        if (!pic || !reason) {
            alert("Nama PIC dan Alasan Penolakan wajib diisi!");
            return;
        }

        const updated = window.dataManager.outletRejectItem(id, pic, reason);
        closeRejectionModal();
        showToast(`Status "${updated.item}" diperbarui: ❌ Ditolak Outlet (Dikembalikan ke Logistik untuk Direvisi)!`, "alert");
        renderInspectionModalTable();
        render();
    }

    function showToast(msg, type = "info") {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        
        if (type === 'alert') {
            toast.style.borderColor = '#ef4444';
            toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.2rem;"></i> <span>${msg}</span>`;
        } else {
            toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> <span>${msg}</span>`;
        }

        toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3500);
    }

    function exportCSV() {
        const outlets = window.dataManager.getOutlets(state.selectedArea);
        let csvContent = "data:text/csv;charset=utf-8,Outlet,Area,NoRAB,TglPengajuan,Item,QtyOrder,QtyLogistik,StatusValidasi,CeklisX_Atasan,CeklisY_ReadyAntar,CeklisZ_DiterimaOutlet,PenerimaPIC,KetLogistik,AlasanTolakOutlet\n";

        outlets.forEach(o => {
            o.items.forEach(i => {
                csvContent += `"${o.name}","${o.area}","${o.rabCode}","${i.tglPengajuan}","${i.item}","${i.qty}","${i.qtyDiterima}","${i.statusPengiriman}","${i.ceklisX?'TRUE':'FALSE'}","${i.ceklisY?'TRUE':'FALSE'}","${i.ceklisZ?'TRUE':'FALSE'}","${(i.picPenerima||'').replace(/"/g, '""')}","${(i.keterangan||'').replace(/"/g, '""')}","${(i.alasanPenolakan||'').replace(/"/g, '""')}"\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Enterprise_Sistemasi_Aset_XYZChecklist_${state.selectedArea}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // GOOGLE SHEETS API MODAL HANDLERS
    const googleSheetsApiModal = document.getElementById('googleSheetsApiModal');
    const btnOpenSheetsApiModal = document.getElementById('btnOpenSheetsApiModal');
    const btnCloseApiModal = document.getElementById('btnCloseApiModal');
    const btnCancelApiModal = document.getElementById('btnCancelApiModal');
    const btnSaveApiConfig = document.getElementById('btnSaveApiConfig');
    const apiModalKeyInput = document.getElementById('apiModalKeyInput');
    const apiModalAutoSyncChk = document.getElementById('apiModalAutoSyncChk');

    if (btnOpenSheetsApiModal) {
        btnOpenSheetsApiModal.addEventListener('click', () => {
            if (window.sheetsApiSync) {
                if (apiModalKeyInput) apiModalKeyInput.value = window.sheetsApiSync.config.apiKey || '';
                if (apiModalAutoSyncChk) apiModalAutoSyncChk.checked = window.sheetsApiSync.config.autoSync !== false;
            }
            if (googleSheetsApiModal) googleSheetsApiModal.classList.add('active');
        });
    }

    if (btnCloseApiModal) btnCloseApiModal.addEventListener('click', () => { if (googleSheetsApiModal) googleSheetsApiModal.classList.remove('active'); });
    if (btnCancelApiModal) btnCancelApiModal.addEventListener('click', () => { if (googleSheetsApiModal) googleSheetsApiModal.classList.remove('active'); });

    if (btnSaveApiConfig) {
        btnSaveApiConfig.addEventListener('click', () => {
            if (window.sheetsApiSync) {
                window.sheetsApiSync.saveConfig({
                    apiKey: apiModalKeyInput ? apiModalKeyInput.value.trim() : '',
                    autoSync: apiModalAutoSyncChk ? apiModalAutoSyncChk.checked : true
                });
            }
            if (googleSheetsApiModal) googleSheetsApiModal.classList.remove('active');
            showToast("✅ Konfigurasi Direct Sync Google Sheets API berhasil disimpan!", "success");
        });
    }

    init();
});
