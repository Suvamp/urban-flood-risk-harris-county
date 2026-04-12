/* dashboard.js — Harris County Flood Risk Intelligence Dashboard */

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '';

const FEATURE_LABELS = {
  f_elevation:  'Low Elevation',
  f_impervious: 'Impervious Surface',
  f_waterway:   'Waterway Proximity',
  f_fema:       'FEMA Zone Risk',
  f_income:     'Low Income',
  f_renters:    'Renter Proportion',
  f_popdensity: 'Population Density',
};

const DARK_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  'transparent',
  font: { color: '#888', size: 11, family: 'Avenir Next, Avenir, Helvetica Neue, Arial, sans-serif' },
  margin: { t: 8, r: 16, b: 32, l: 10 },
  xaxis: { gridcolor: '#2e2e2e', zerolinecolor: '#383838', tickfont: { color: '#666', size: 10 } },
  yaxis: { gridcolor: '#2e2e2e', zerolinecolor: '#383838', tickfont: { color: '#888', size: 10 } },
};

const fmt = {
  num:    n => n == null ? '—' : Number(n).toLocaleString(),
  pct:    n => n == null ? '—' : Number(n).toFixed(1) + '%',
  score:  n => n == null ? '—' : Number(n).toFixed(3),
  income: n => n == null ? '—' : '$' + Math.round(n / 1000) + 'K',
};

async function initDashboard() {
  console.log('initDashboard called');

  const [
    { default: Map },
    { default: MapView },
    { default: GeoJSONLayer },
    { default: ClassBreaksRenderer },
    { default: SimpleFillSymbol },
    { default: Home },
    { default: ScaleBar },
  ] = await Promise.all([
    import('https://js.arcgis.com/4.29/@arcgis/core/Map.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/views/MapView.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/layers/GeoJSONLayer.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/renderers/ClassBreaksRenderer.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/symbols/SimpleFillSymbol.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/widgets/Home.js'),
    import('https://js.arcgis.com/4.29/@arcgis/core/widgets/ScaleBar.js'),
  ]);

  console.log('ArcGIS modules loaded');

  const kpis = await fetch(`${API}/api/kpis`).then(r => r.json());
  document.getElementById('kpi-pop').textContent  = fmt.num(kpis.pop_in_sfha);
  document.getElementById('kpi-area').textContent = fmt.pct(kpis.pct_area_sfha);
  document.getElementById('kpi-fac').textContent  = fmt.num(kpis.facilities_exposed);
  document.getElementById('kpi-risk').textContent = fmt.score(kpis.median_risk_score);
  document.getElementById('bg-count-badge').textContent = `${fmt.num(kpis.total_bg_count)} Block Groups`;

  const riskRenderer = new ClassBreaksRenderer({
    field: 'rf_prob',
    defaultSymbol: new SimpleFillSymbol({ color: [100,100,100,0.3], outline: { color: [60,60,60,0.5], width: 0.3 } }),
    classBreakInfos: [
      { minValue: 0.0, maxValue: 0.2, label: '0.0 – 0.2 (Very Low)',  symbol: new SimpleFillSymbol({ color: [254,249,195,0.75], outline: { color: [56,56,56,0.6], width: 0.3 } }) },
      { minValue: 0.2, maxValue: 0.4, label: '0.2 – 0.4 (Low)',       symbol: new SimpleFillSymbol({ color: [253,230,138,0.80], outline: { color: [56,56,56,0.6], width: 0.3 } }) },
      { minValue: 0.4, maxValue: 0.6, label: '0.4 – 0.6 (Moderate)',  symbol: new SimpleFillSymbol({ color: [249,115,22,0.82],  outline: { color: [56,56,56,0.6], width: 0.3 } }) },
      { minValue: 0.6, maxValue: 0.8, label: '0.6 – 0.8 (High)',      symbol: new SimpleFillSymbol({ color: [220,38,38,0.85],   outline: { color: [56,56,56,0.6], width: 0.3 } }) },
      { minValue: 0.8, maxValue: 1.0, label: '0.8 – 1.0 (Very High)', symbol: new SimpleFillSymbol({ color: [127,29,29,0.90],   outline: { color: [56,56,56,0.6], width: 0.3 } }) },
    ],
  });

  const riskLayer = new GeoJSONLayer({
    url: `${API}/api/risk-geojson`,
    renderer: riskRenderer,
    title: 'Flood Risk Score',
    outFields: ['*'],
    popupTemplate: {
      title: 'Block Group {GEOID}',
      content: [{ type: 'fields', fieldInfos: [
        { fieldName: 'fema_zone',     label: 'FEMA Zone' },
        { fieldName: 'rf_prob',       label: 'Risk Score',    format: { places: 3 } },
        { fieldName: 'population',    label: 'Population',    format: { digitSeparator: true } },
        { fieldName: 'median_income', label: 'Median Income', format: { digitSeparator: true } },
        { fieldName: 'elevation_m',   label: 'Elevation (m)', format: { places: 1 } },
      ]}],
    },
    opacity: 0.9,
  });

  const femaRenderer = {
    type: 'unique-value',
    field: 'FLD_ZONE',
    uniqueValueInfos: [
      { value: 'AE',    label: 'AE (High Risk)',   symbol: new SimpleFillSymbol({ color: [0,121,193,0.35],   outline: { color: [0,121,193,0.8],  width: 0.8 } }) },
      { value: 'AH',    label: 'AH',               symbol: new SimpleFillSymbol({ color: [0,121,193,0.28],   outline: { color: [0,121,193,0.6],  width: 0.5 } }) },
      { value: 'X-500', label: 'X-500 (Moderate)', symbol: new SimpleFillSymbol({ color: [161,98,7,0.25],    outline: { color: [161,98,7,0.6],   width: 0.5 } }) },
      { value: 'X',     label: 'X (Minimal)',       symbol: new SimpleFillSymbol({ color: [100,100,100,0.12], outline: { color: [80,80,80,0.4],   width: 0.3 } }) },
    ],
    defaultSymbol: new SimpleFillSymbol({ color: [100,100,100,0.1], outline: { color: [60,60,60,0.3], width: 0.3 } }),
  };

  let femaLayer = null;

  const map = new Map({ basemap: 'dark-gray-vector', layers: [riskLayer] });

  const view = new MapView({
    container: 'mapDiv',
    map,
    center: [-95.37, 29.76],
    zoom: 10,
    ui: { components: ['zoom', 'attribution'] },
  });

  console.log('View created, waiting...');

  view.ui.add(new Home({ view }), 'top-right');
  view.ui.add(new ScaleBar({ view, unit: 'dual' }), 'bottom-right');

  document.getElementById('toggle-risk').addEventListener('change', e => {
    riskLayer.visible = e.target.checked;
  });

  document.getElementById('toggle-fema').addEventListener('change', async e => {
    if (e.target.checked) {
      if (!femaLayer) {
        try {
          femaLayer = new GeoJSONLayer({
            url: `${API}/api/fema-geojson`,
            renderer: femaRenderer,
            title: 'FEMA Flood Zones',
            opacity: 0.7,
          });
          map.add(femaLayer, 0);
        } catch { e.target.checked = false; }
      } else { femaLayer.visible = true; }
    } else if (femaLayer) { femaLayer.visible = false; }
  });

  let highlightHandle = null;
  let layerView = null;
  view.whenLayerView(riskLayer).then(lv => { layerView = lv; });

  view.on('click', async evt => {
    const hit = await view.hitTest(evt, { include: [riskLayer] });
    const result = hit.results.find(r => r.layer === riskLayer);
    if (!result) { clearSelection(); return; }
    const attrs = result.graphic.attributes;
    const geoid = attrs.GEOID || attrs.geoid;
    if (!geoid) return;
    if (highlightHandle) highlightHandle.remove();
    if (layerView) highlightHandle = layerView.highlight(result.graphic);
    document.getElementById('selected-info').style.display = 'block';
    document.getElementById('sel-geoid').textContent  = geoid;
    document.getElementById('sel-risk').textContent   = fmt.score(attrs.rf_prob);
    document.getElementById('sel-zone').textContent   = attrs.fema_zone || '—';
    document.getElementById('sel-pop').textContent    = fmt.num(attrs.population);
    document.getElementById('sel-income').textContent = fmt.income(attrs.median_income);
    try {
      const detail = await fetch(`${API}/api/block-group/${geoid}`).then(r => r.json());
      renderShapChart(detail, geoid);
    } catch (err) { console.warn('SHAP fetch failed:', err); }
  });

  function clearSelection() {
    if (highlightHandle) highlightHandle.remove();
    document.getElementById('selected-info').style.display = 'none';
    showShapPlaceholder();
  }

  function renderShapChart(detail, geoid) {
    const shap = detail.shap_values || {};
    const entries = Object.entries(shap)
      .map(([k, v]) => ({ label: FEATURE_LABELS[k.replace('_shap', '')] || k.replace('_shap', ''), value: v }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const labels = entries.map(e => e.label);
    const values = entries.map(e => e.value);
    const colors = values.map(v => v >= 0 ? '#c2410c' : '#166534');
    const placeholder = document.getElementById('shap-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    document.getElementById('shap-hint').textContent = `GEOID ${geoid} · Score ${fmt.score(detail.rf_prob)}`;
    const h = document.getElementById('shap-chart').clientHeight || 200;
    Plotly.newPlot('shap-chart', [{
      type: 'bar', orientation: 'h', x: values, y: labels,
      marker: { color: colors, opacity: 0.85 },
      hovertemplate: '<b>%{y}</b><br>SHAP: %{x:.4f}<extra></extra>',
    }], {
      ...DARK_LAYOUT, height: h,
      margin: { t: 8, r: 16, b: 36, l: 130 },
      xaxis: { ...DARK_LAYOUT.xaxis, title: { text: 'SHAP contribution (→ increases risk)', font: { size: 9, color: '#555' } }, zeroline: true, zerolinecolor: '#555', zerolinewidth: 1 },
      yaxis: { ...DARK_LAYOUT.yaxis, automargin: true },
      bargap: 0.35,
    }, { displayModeBar: false, responsive: true });
  }

  function showShapPlaceholder() {
    document.getElementById('shap-hint').textContent = 'Click a block group';
    Plotly.purge('shap-chart');
    document.getElementById('shap-chart').innerHTML = `
      <div id="shap-placeholder">
        <div class="placeholder-icon">↖</div>
        <div class="placeholder-text">Click any block group on the map to see why it received its risk score.</div>
      </div>`;
  }

  async function renderScatter() {
    const data = await fetch(`${API}/api/scatter`).then(r => r.json());
    const zoneColors = { 'AE': '#c2410c', 'AH': '#f97316', 'AO': '#f97316', 'X-500': '#a16207', 'X': '#4b5563', 'A': '#dc2626' };
    const h = document.getElementById('scatter-chart').clientHeight || 180;
    const incomes = data.map(d => d.median_income).filter(Boolean).sort((a, b) => a - b);
    const incMed = incomes[Math.floor(incomes.length / 2)];
    Plotly.newPlot('scatter-chart', [{
      type: 'scatter', mode: 'markers',
      x: data.map(d => d.rf_prob),
      y: data.map(d => d.median_income ? d.median_income / 1000 : null),
      text: data.map(d => `GEOID: ${d.geoid}<br>Zone: ${d.fema_zone}<br>Risk: ${(d.rf_prob||0).toFixed(3)}<br>Income: $${Math.round((d.median_income||0)/1000)}K`),
      hovertemplate: '%{text}<extra></extra>',
      marker: { color: data.map(d => zoneColors[d.fema_zone] || '#4b5563'), opacity: 0.55, size: data.map(d => Math.max(4, Math.min(12, (d.population||500)/300))), line: { color: 'rgba(0,0,0,0)', width: 0 } },
    }], {
      ...DARK_LAYOUT, height: h, margin: { t: 8, r: 16, b: 44, l: 50 },
      xaxis: { ...DARK_LAYOUT.xaxis, title: { text: 'RF Risk Score', font: { size: 10, color: '#666' } }, range: [-0.02, 1.02] },
      yaxis: { ...DARK_LAYOUT.yaxis, title: { text: 'Median Income ($K)', font: { size: 10, color: '#666' } } },
      shapes: [
        { type: 'line', x0: 0.5, x1: 0.5, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: '#555', width: 1, dash: 'dot' } },
        { type: 'line', x0: 0, x1: 1, y0: incMed/1000, y1: incMed/1000, xref: 'x', yref: 'y', line: { color: '#555', width: 1, dash: 'dot' } },
      ],
      annotations: [
        { x: 0.75, y: 0.05, xref: 'paper', yref: 'paper', text: 'HIGH RISK · LOW INCOME', showarrow: false, font: { size: 8, color: '#c2410c' } },
        { x: 0.2,  y: 0.95, xref: 'paper', yref: 'paper', text: 'low risk · high income',  showarrow: false, font: { size: 8, color: '#555' } },
      ],
    }, { displayModeBar: false, responsive: true });
  }

  console.log('Calling view.when()...');
  await view.when();
  console.log('view.when() resolved — loading scatter');
  await renderScatter();

  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 500);
}

initDashboard().catch(err => console.error('Dashboard init failed:', err));