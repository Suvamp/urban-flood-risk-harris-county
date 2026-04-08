# Urban Flood Risk & Vulnerability Mapping
### Harris County, Texas — Census Tract Level Analysis

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![GeoPandas](https://img.shields.io/badge/GeoPandas-0.14-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

An end-to-end spatial machine learning pipeline that predicts flood vulnerability at the census tract level using FEMA flood zone data, OpenStreetMap waterways, and US Census demographics. Built as part of a GIS Data Science Portfolio targeting roles in urban planning, emergency management, and geospatial data science.

---

## Interactive Map

> 📍 **[View the Live Flood Risk Map](https://Suvamp.githuh.io/urban-flood-risk-harris-county/outputs/flood_vulnerability_harris_county.html)**


---

## Key Results

| Metric | Value |
|--------|-------|
| Census tracts analyzed | 1,110 |
| FEMA flood zone polygons | 750 |
| OSM waterway features | 12,742 |
| Global Moran's I | **0.3916** (p = 0.001) |
| LISA hotspot tracts (HH) | 91 |
| LISA coldspot tracts (LL) | 116 |
| Random Forest R² | **0.9585** |
| Mean Absolute Error | **0.88 / 100 points** |
| High / Very High risk tracts | 6 (0.5%) |

**Environmental justice signal:** High-risk tracts have a mean poverty rate of 29.2% versus 11.9% in Very Low risk tracts — a 145% differential.

---

## Repository Structure

```
urban-flood-risk-harris-county/
│
├── Urban_Flood_Risk.ipynb          # Full reproducible analysis notebook
├── environment.yml                 # Conda environment specification
├── README.md
│
└── outputs/
    ├── 01_raw_data_check.png       # 3-panel raw data visualization
    ├── 02_distributions.png        # Variable distribution histograms
    ├── 03_lisa_map.png             # LISA hotspot/coldspot cluster map
    ├── 04_predictions_vs_actual.png # Random Forest evaluation plot
    ├── 05_feature_importance.png   # Feature importance bar chart
    └── flood_vulnerability_harris_county.html  # Interactive Folium web map
```

---

## Methodology

### Data Sources
| Dataset | Source | Records |
|---------|--------|---------|
| FEMA National Flood Hazard Layer (NFHL) | ArcGIS Online / hazards.fema.gov | 750 polygons |
| Census ACS 5-Year Estimates (2022) | api.census.gov | 1,115 tracts |
| OpenStreetMap Waterways | OSMnx | 12,742 features |

### Pipeline Steps

**1. Data Acquisition**
- FEMA NFHL flood zones via ArcGIS Online REST API (zones AE, AO, VE, A, X)
- Census tract boundaries from TIGER/Line + ACS demographics via Census API
- Rivers, streams, bayous, and lakes from OpenStreetMap via OSMnx

**2. Spatial Feature Engineering**
- `fema_flood_pct` — fraction of each tract's area within a high-risk FEMA flood zone (overlay intersection)
- `dist_to_water_m` — distance in meters from each tract centroid to the nearest waterway (mean: 420m)
- `waterways_within_1km` — count of OSM waterway features within a 1km buffer (mean: 7.4)
- `poverty_rate` / `median_income` — ACS socioeconomic vulnerability indicators

**3. Composite Vulnerability Score (Target Variable)**
A rule-based score (0–100) combining four components when labeled flood claim data is unavailable:
```
40% × FEMA flood zone coverage  (physical hazard)
25% × Proximity to water        (physical hazard, inverted)
15% × Waterway density          (physical hazard)
20% × Poverty rate              (social vulnerability)
```

**4. Spatial Autocorrelation Analysis**
- Global Moran's I = **0.3916** (p = 0.001) — statistically significant positive clustering
- LISA (Local Indicators of Spatial Association) identifies **91 HH hotspot** and **116 LL coldspot** tracts

**5. Random Forest Regression**
- 200 trees, max depth 8, trained on 888 tracts / tested on 222 tracts
- R² = **0.9585**, MAE = **0.88 score points**
- Top predictors: `fema_flood_pct` (0.419), `dist_to_water_m` (0.391), `poverty_rate` (0.179)

**6. Interactive Web Map**
- Folium choropleth with hover tooltips showing score, risk tier, poverty rate, and distance to water
- Toggleable LISA cluster overlay

---

## Getting Started

### Option A — Conda (Recommended)
```bash
conda env create -f environment.yml
conda activate flood-risk-p01
python -m ipykernel install --user --name flood-risk-p01 --display-name "Flood Risk P01 (Python 3.11)"
jupyter lab
```

### Option B — pip + venv
```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install geopandas folium esda libpysal scikit-learn matplotlib
pip install contextily osmnx shapely requests numpy scipy pandas
pip install jupyterlab ipykernel
jupyter lab
```

Open `Urban_Flood_Risk.ipynb` and run all cells top to bottom.

---

## Limitations

1. **Synthetic target variable** — The vulnerability score is constructed from the same spatial features used to predict it. A production model would use historical FEMA flood insurance claims or damage assessments as ground truth, making the R² a more meaningful benchmark.
2. **Random train/test split** — Adjacent census tracts share spatial characteristics, meaning a random 80/20 split can leak information across the boundary. Spatial k-fold cross-validation (included as Extension B in the notebook) gives a more honest performance estimate.
3. **Static snapshot** — ACS data represents a 5-year rolling average and does not capture year-to-year population or income shifts.
4. **MAUP** — Results may differ at the block group or ZIP code level (Modifiable Areal Unit Problem).
5. **No elevation data** — Terrain slope and mean elevation are strong flood predictors not included in this baseline model (see Extension A in the notebook).

---

## Portfolio Context

This project is **Project 01** in a GIS Data Science Portfolio series demonstrating applied geospatial analysis skills for roles in:
- Regional planning agencies (SCAG, RCTC, county GIS departments)
- Emergency management and hazard mitigation
- PropTech / smart cities spatial analytics

**Skills demonstrated:** GeoPandas · spatial joins & overlay · buffer analysis · spatial autocorrelation (Moran's I / LISA) · Random Forest regression · interactive web mapping (Folium) · Census & FEMA API data pipelines

---

## License

MIT License — free to use, adapt, and build upon with attribution.
