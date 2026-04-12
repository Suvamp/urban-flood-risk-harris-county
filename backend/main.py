# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json

# Paths
BASE_DIR  = Path(__file__).parent
DATA_DIR  = BASE_DIR / 'data'

RISK_GEOJSON  = DATA_DIR / 'harris_risk.geojson'
KPIS_JSON     = DATA_DIR / 'harris_kpis.json'
FEMA_GEOJSON  = DATA_DIR / 'fema_zones.geojson'

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title='Harris County Flood Risk API',
    description='Serves flood risk GeoJSON, KPIs, and SHAP values for the dashboard.',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET'],
    allow_headers=['*'],
)

# ── Load data at startup (avoid re-reading files on every request) ─────────────
@app.on_event('startup')
async def load_data():
    global risk_geojson, kpis, fema_geojson, block_group_index

    for path, label in [(RISK_GEOJSON, 'harris_risk.geojson'),
                        (KPIS_JSON,    'harris_kpis.json')]:
        if not path.exists():
            raise RuntimeError(f'Required data file missing: {label}. '
                               f'Run the pipeline notebook first.')

    with open(RISK_GEOJSON) as f:
        risk_geojson = json.load(f)

    with open(KPIS_JSON) as f:
        kpis = json.load(f)

    # FEMA zones optional — only present if real NFHL data was used
    fema_geojson = None
    if FEMA_GEOJSON.exists():
        with open(FEMA_GEOJSON) as f:
            fema_geojson = json.load(f)

    # Build GEOID → feature dict index for fast block-group lookups
    block_group_index = {}
    for feature in risk_geojson['features']:
        props = feature['properties']
        geoid = props.get('GEOID')
        if geoid:
            block_group_index[str(geoid)] = props

    print(f'Data loaded. {len(block_group_index)} block groups indexed.')


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get('/api/kpis')
async def get_kpis():
    """County-wide KPI summary cards for the dashboard header."""
    return kpis


@app.get('/api/risk-geojson')
async def get_risk_geojson():
    """Full GeoJSON FeatureCollection — block groups with risk scores."""
    return risk_geojson


@app.get('/api/fema-geojson')
async def get_fema_geojson():
    """FEMA flood zone polygons (optional toggle layer)."""
    if fema_geojson is None:
        raise HTTPException(status_code=404, detail='FEMA GeoJSON not available.')
    return fema_geojson


@app.get('/api/block-group/{geoid}')
async def get_block_group(geoid: str):
    """
    Single block group detail — all features + SHAP values.
    Used by the frontend SHAP chart on map click.
    """
    props = block_group_index.get(geoid)
    if props is None:
        raise HTTPException(status_code=404, detail=f'Block group {geoid} not found.')

    # Separate SHAP cols from raw features for clean response structure
    shap_cols    = {k: v for k, v in props.items() if k.endswith('_shap')}
    feature_cols = {k: v for k, v in props.items() if k.startswith('f_')}

    return {
        'geoid':        geoid,
        'fema_zone':    props.get('fema_zone'),
        'rf_prob':      props.get('rf_prob'),
        'risk_score':   props.get('risk_score'),
        'high_risk':    props.get('high_risk'),
        'population':   props.get('population'),
        'median_income':props.get('median_income'),
        'pct_renters':  props.get('pct_renters'),
        'elevation_m':  props.get('elevation_m'),
        'impervious_pct':props.get('impervious_pct'),
        'dist_waterway_m':props.get('dist_waterway_m'),
        'features':     feature_cols,
        'shap_values':  shap_cols,
    }


@app.get('/api/scatter')
async def get_scatter():
    """
    Lightweight payload for the vulnerability vs. risk scatter plot.
    Returns only the fields Plotly needs — keeps the response small.
    """
    points = []
    for feature in risk_geojson['features']:
        p = feature['properties']
        points.append({
            'geoid':         p.get('GEOID'),
            'rf_prob':       p.get('rf_prob'),
            'median_income': p.get('median_income'),
            'population':    p.get('population'),
            'fema_zone':     p.get('fema_zone'),
            'high_risk':     p.get('high_risk'),
        })
    return points


@app.get('/health')
async def health():
    return {'status': 'ok', 'block_groups': len(block_group_index)}