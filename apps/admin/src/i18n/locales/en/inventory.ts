export const inventory = {
  // ── List Page ────────────────────────────────────────
  list: {
    page: {
      title: 'Inventory Items',
      description: 'Manage your dental supplies and materials.',
    },
    actions: {
      newItem: 'New Item',
      addItem: 'Add Item',
      edit: 'Edit',
      delete: 'Delete',
    },
    stats: {
      totalItems: 'Total Items',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      totalValue: 'Total Value',
    },
    search: {
      placeholder: 'Search items…',
    },
    filters: {
      allCategories: 'All Categories',
      stockStatus: 'Stock Status',
      all: 'All',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
    },
    columns: {
      item: 'Item',
      sku: 'SKU',
      category: 'Category',
      stock: 'Stock',
      qty: 'Qty',
      unitCost: 'Unit Cost',
      value: 'Value',
    },
    empty: {
      title: 'No inventory items',
      description: 'Add your first inventory item to get started.',
    },
    toast: {
      itemCreated: 'Item created',
      createFailed: 'Create failed',
      itemDeleted: 'Item deleted',
      deleteFailed: 'Delete failed',
    },
  },

  // ── Form Page ────────────────────────────────────────
  formPage: {
    editTitle: 'Edit Item',
    newTitle: 'New Item',
    actions: {
      back: 'Back',
    },
    error: {
      loadFailed: 'Failed to load inventory item. Please go back and try again.',
    },
    toast: {
      updated: 'Item updated',
      created: 'Item created',
      updatedWithStock: 'Item & stock updated',
      savedButStockFailed: 'Item saved but stock adjustment failed',
      updateFailed: 'Update failed',
      createFailed: 'Create failed',
    },
  },

  // ── Inventory Form Component ─────────────────────────
  form: {
    createTitle: 'New Inventory Item',
    editTitle: 'Edit Inventory Item',
    createDescription: 'Add a new item to the inventory catalog.',
    editDescription: 'Update item details.',
    labels: {
      nameEn: 'Name (EN) *',
      nameAr: 'Name (AR)',
      sku: 'SKU *',
      barcode: 'Barcode',
      category: 'Category',
      unitOfMeasure: 'Unit of Measure',
      unitCost: 'Unit Cost *',
      sellingPrice: 'Selling Price',
      stockQuantity: 'Stock Quantity',
      minStock: 'Min Stock',
      maxStock: 'Max Stock',
      consumable: 'Consumable',
      trackBatches: 'Track Batches',
      active: 'Active',
      description: 'Description',
    },
    placeholders: {
      selectCategory: 'Select category',
    },
    currentStock: 'Current: {{count}}',
    actions: {
      createItem: 'Create Item',
      saveChanges: 'Save Changes',
    },
    validation: {
      nameRequired: 'Name (English) is required',
      skuRequired: 'SKU is required',
      unitCostMin: 'Unit cost must be ≥ 0',
    },
  },

  // ── Category List Page ───────────────────────────────
  categories: {
    page: {
      title: 'Inventory Categories',
      description: 'Organize items into categories and sub-categories.',
    },
    searchPlaceholder: 'Search categories...',
    actions: {
      newCategory: 'New Category',
      addCategory: 'Add Category',
    },
    status: {
      inactive: 'Inactive',
    },
    dialog: {
      editTitle: 'Edit Category',
      newTitle: 'New Category',
      deleteTitle: 'Delete Category',
    },
    labels: {
      nameEn: 'Name (EN) *',
      nameAr: 'Name (AR)',
      sortOrder: 'Sort Order',
      active: 'Active',
    },
    formActions: {
      save: 'Save',
      create: 'Create',
    },
    empty: {
      title: 'No categories',
      description: 'Create your first inventory category.',
    },
    toast: {
      updated: 'Category updated',
      created: 'Category created',
      deleted: 'Category deleted',
      saveFailed: 'Save failed',
      deleteFailed: 'Delete failed',
    },
  },

  // ── Stock Transfer List Page ─────────────────────────
  transferList: {
    page: {
      title: 'Stock Transfers',
      description: 'Transfer inventory between branches.',
    },
    actions: {
      newTransfer: 'New Transfer',
      createTransfer: 'Create Transfer',
    },
    search: {
      placeholder: 'Search transfers…',
    },
    columns: {
      transferNumber: 'Transfer #',
      from: 'From',
      to: 'To',
      status: 'Status',
      date: 'Date',
      items: 'Items',
    },
    status: {
      draft: 'Draft',
      inTransit: 'In Transit',
      received: 'Received',
      cancelled: 'Cancelled',
    },
    empty: {
      title: 'No transfers',
      description: 'Create your first stock transfer.',
    },
  },

  // ── Stock Transfer Form Component ────────────────────
  transferForm: {
    title: 'New Stock Transfer',
    description: 'Transfer items between branches.',
    labels: {
      fromBranch: 'From Branch *',
      toBranch: 'To Branch *',
      itemsToTransfer: 'Items to Transfer',
      notes: 'Notes',
    },
    placeholders: {
      selectBranch: 'Select branch',
      selectItem: 'Select item',
      qty: 'Qty',
    },
    actions: {
      addItem: 'Add Item',
      createTransfer: 'Create Transfer',
      removeItem: 'Remove item',
    },
    validation: {
      sourceBranchRequired: 'Source branch is required',
      destinationBranchRequired: 'Destination branch is required',
      itemRequired: 'Item is required',
      qtyMin: 'Qty must be ≥ 1',
      atLeastOneItem: 'At least one item is required',
    },
  },

  // ── Stock Transfer Form Page ─────────────────────────
  transferFormPage: {
    title: 'New Stock Transfer',
    actions: {
      back: 'Back',
    },
    error: {
      branchesFailed: 'Failed to load branches. Please try again.',
    },
    toast: {
      created: 'Transfer created',
      createFailed: 'Create failed',
    },
  },

  // ── Stock Movement History Page ──────────────────────
  movements: {
    page: {
      title: 'Stock Movement History',
      description:
        'View all stock movements including receipts, transfers, adjustments, and disposals.',
    },
    labels: {
      from: 'From',
      to: 'To',
      branch: 'Branch',
      allBranches: 'All Branches',
      all: 'All',
    },
    summary: {
      totalMovements: 'Total Movements',
      netChange: 'Net Change',
    },
    chart: {
      title: 'Movements Over Time',
      inbound: 'Inbound',
      outbound: 'Outbound',
    },
    table: {
      title: 'Movement Log',
    },
    columns: {
      date: 'Date',
      item: 'Item',
      type: 'Type',
      qty: 'Qty',
      reference: 'Reference',
    },
    empty: {
      noData: 'No movements found.',
      selectRange: 'Select a date range to view movement history.',
    },
    error: {
      branchesFailed: 'Failed to load branches',
    },
  },

  // ── Stock Count List Page ────────────────────────────
  countList: {
    page: {
      title: 'Stock Counts',
      description: 'Physical inventory verification.',
    },
    actions: {
      newCount: 'New Count',
      startCount: 'Start Count',
    },
    search: {
      placeholder: 'Search counts…',
    },
    columns: {
      countNumber: 'Count #',
      branch: 'Branch',
      type: 'Type',
      status: 'Status',
      items: 'Items',
      discrepancies: 'Discrepancies',
      date: 'Date',
    },
    typeFilters: {
      allTypes: 'All Types',
      full: 'Full',
      partial: 'Partial',
      cycle: 'Cycle',
    },
    statusFilters: {
      all: 'All',
      draft: 'Draft',
      inProgress: 'In Progress',
      completed: 'Completed',
      approved: 'Approved',
    },
    empty: {
      title: 'No stock counts',
      description: 'Start a physical inventory count.',
    },
  },

  // ── Stock Count Form Component ───────────────────────
  countForm: {
    title: 'New Stock Count',
    description: 'Count physical inventory against system records.',
    labels: {
      branch: 'Branch *',
      countType: 'Count Type',
      itemsToCount: 'Items to Count',
      notes: 'Notes',
    },
    placeholders: {
      selectBranch: 'Select branch',
      selectItem: 'Select item',
      expected: 'Expected',
      counted: 'Counted',
    },
    countTypes: {
      fullCount: 'Full Count',
      partialCount: 'Partial Count',
      cycleCount: 'Cycle Count',
    },
    actions: {
      addItem: 'Add Item',
      submitCount: 'Submit Count',
      removeItem: 'Remove item',
    },
    validation: {
      branchRequired: 'Branch is required',
      itemRequired: 'Item is required',
      countedQtyMin: 'Counted qty must be ≥ 0',
      atLeastOneItem: 'At least one item is required',
    },
  },

  // ── Stock Count Form Page ────────────────────────────
  countFormPage: {
    title: 'New Stock Count',
    actions: {
      back: 'Back',
    },
    error: {
      branchesFailed: 'Failed to load branches. Please try again.',
    },
    toast: {
      created: 'Stock count created',
      createFailed: 'Create failed',
    },
  },

  // ── Stock Valuation Report Page ──────────────────────
  valuation: {
    page: {
      title: 'Stock Valuation Report',
      description: 'Current inventory value by category.',
    },
    labels: {
      branch: 'Branch',
      allBranches: 'All Branches',
      all: 'All',
    },
    summary: {
      totalValue: 'Total Value',
      totalItems: 'Total Items',
      categories: 'Categories',
    },
    chart: {
      title: 'Value by Category',
    },
    table: {
      title: 'Breakdown',
    },
    columns: {
      category: 'Category',
      items: 'Items',
      qty: 'Qty',
      value: 'Value',
    },
    empty: {
      noData: 'No data.',
    },
  },

  // ── Low Stock Alert Page ─────────────────────────────
  lowStockAlert: {
    page: {
      title: 'Low Stock Alerts',
      description: 'Items with stock below reorder level that need restocking.',
    },
    summary: {
      lowStockItems: 'Low Stock Items',
      totalDeficit: 'Total Deficit',
      estReorderCost: 'Est. Reorder Cost',
    },
    chart: {
      title: 'Stock vs Reorder Level',
      currentStock: 'Current Stock',
      reorderLevel: 'Reorder Level',
    },
    table: {
      title: 'Low Stock Items',
    },
    columns: {
      item: 'Item',
      category: 'Category',
      current: 'Current',
      reorder: 'Reorder',
      deficit: 'Deficit',
    },
    empty: {
      noData: 'All stock levels are healthy.',
    },
  },

  // ── Material Usage Report Page ───────────────────────
  materialUsage: {
    page: {
      title: 'Material Usage Report',
      description: 'Track material consumption over time.',
    },
    labels: {
      from: 'From',
      to: 'To',
      branch: 'Branch',
    },
    chart: {
      title: 'Usage by Item',
      consumed: 'Consumed',
    },
    table: {
      title: 'Usage Details',
    },
    columns: {
      item: 'Item',
      sku: 'SKU',
      consumed: 'Consumed',
      cost: 'Cost',
    },
    empty: {
      noData: 'No usage data for this period.',
      selectRange: 'Select a date range to generate the report.',
    },
  },

  // ── Expiry Dashboard Page ────────────────────────────
  expiryDashboard: {
    page: {
      title: 'Expiry Dashboard',
      description: 'Monitor batch expiry dates and dispose expired items.',
    },
    cards: {
      expired: 'Expired',
      within30: '< 30 days',
      within60: '< 60 days',
      within90: '< 90 days',
      ok: 'OK',
    },
    table: {
      title: 'Batches Requiring Attention',
    },
    columns: {
      item: 'Item',
      sku: 'SKU',
      branch: 'Branch',
      batch: 'Batch',
      qty: 'Qty',
      expiry: 'Expiry',
      status: 'Status',
    },
    status: {
      expired: 'Expired',
      daysLeft: '{{days}}d left',
    },
    actions: {
      dispose: 'Dispose',
    },
    empty: {
      noData: 'No batches requiring attention',
    },
    toast: {
      disposed: 'Disposed {{quantity}} × {{itemName}}',
      disposeFailed: 'Dispose failed',
    },
  },

  // ── Dead Stock Page ──────────────────────────────────
  deadStock: {
    page: {
      title: 'Dead Stock Report',
      description: 'Identify items with no movement that may need disposal or clearance.',
    },
    filters: {
      noMovementDays: 'No Movement (days)',
      days30: '30 days',
      days60: '60 days',
      days90: '90 days',
      days180: '180 days',
      year1: '1 year',
    },
    summary: {
      deadStockItems: 'Dead Stock Items',
      deadStockValue: 'Dead Stock Value',
      percentOfInventory: '% of Inventory',
    },
    chart: {
      title: 'Dead Stock by Category',
    },
    table: {
      title: 'Dead Stock Items',
    },
    columns: {
      item: 'Item',
      category: 'Category',
      qty: 'Qty',
      daysIdle: 'Days Idle',
      value: 'Value',
    },
    empty: {
      noData: 'No dead stock found. Great inventory health!',
    },
  },

  // ── Consumption Forecast Page ────────────────────────
  consumptionForecast: {
    page: {
      title: 'Consumption Forecast',
      description: 'Predict future inventory needs based on historical usage patterns.',
    },
    summary: {
      totalItems: 'Total Items',
      criticalItems: 'Critical Items',
      avgDaysToStockout: 'Avg Days to Stockout',
    },
    chart: {
      title: 'Consumption Trend',
      actual: 'Actual',
      forecast: 'Forecast',
    },
    table: {
      title: 'Forecast Details',
    },
    columns: {
      item: 'Item',
      stock: 'Stock',
      dailyUse: 'Daily Use',
      daysLeft: 'Days Left',
      need30d: 'Need (30d)',
    },
    empty: {
      noData: 'No data.',
    },
  },

  // ── ABC Analysis Page ────────────────────────────────
  abcAnalysis: {
    page: {
      title: 'ABC Analysis',
      description: 'Classify items by value contribution using the Pareto principle (80/20 rule).',
    },
    summary: {
      totalItems: 'Total Items',
      classAHighValue: 'Class A (High Value)',
      classBMedium: 'Class B (Medium)',
      classCLow: 'Class C (Low)',
      percentValue: '% value',
    },
    chart: {
      title: 'Value Distribution by Class',
      classA: 'Class A',
      classB: 'Class B',
      classC: 'Class C',
    },
    table: {
      title: 'Item Classification',
    },
    columns: {
      item: 'Item',
      class: 'Class',
      annualValue: 'Annual Value',
      percentOfTotal: '% of Total',
      cumulative: 'Cumulative',
    },
    empty: {
      noData: 'No data.',
    },
  },

  // ── Stock Adjustment Dialog ──────────────────────────
  stockAdjustment: {
    title: 'Adjust Stock',
    currentQty: 'Current Qty',
    adjustmentLabel: 'Adjustment (+/-)',
    newQty: 'New Qty',
    reasonLabel: 'Reason *',
    cancel: 'Cancel',
    applyAdjustment: 'Apply Adjustment',
    placeholders: {
      adjustment: 'e.g. -5 or +10',
      reason: 'e.g. Damaged, Found extra stock, Correction…',
    },
    toast: {
      enterAdjustment: 'Enter an adjustment quantity and reason',
      adjusted: 'Stock adjusted successfully',
      adjustFailed: 'Failed to adjust stock',
    },
  },

  // ── Low Stock Badge ──────────────────────────────────
  stockBadge: {
    outOfStock: 'Out of Stock',
    critical: 'Critical',
    lowStock: 'Low Stock',
    inStock: 'In Stock',
  },

  // ── Barcode Scanner ──────────────────────────────────
  barcodeScanner: {
    scanBarcode: 'Scan Barcode',
    pointCamera: 'Point camera at barcode…',
    stopScanner: 'Stop scanner',
    cameraAccessDenied: 'Camera access denied',
  },

  // ── Unit Types ───────────────────────────────────────
  unitTypes: {
    piece: 'piece',
    box: 'box',
    pack: 'pack',
    bottle: 'bottle',
    tube: 'tube',
    roll: 'roll',
    sheet: 'sheet',
    ml: 'ml',
    g: 'g',
    kg: 'kg',
    liter: 'liter',
    pair: 'pair',
  },
} as const;
