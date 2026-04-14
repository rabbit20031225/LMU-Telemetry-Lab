import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import os

# Configuration
DATA_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.csv'
METADATA_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\session_metadata.json'
FUSED_META_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_metadata.json'
LAPS_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\session_laps.csv'

st.set_page_config(layout="wide", page_title="Sim Racing Telemetry Analysis")

@st.cache_data
def load_data():
    if not os.path.exists(DATA_FILE):
        return None, None, None, None
        
    df = pd.read_csv(DATA_FILE)
    
    # Load Metadata
    meta = {}
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'r') as f:
            meta = json.load(f)
            
    # Load Fused Metadata (Real Car Name)
    fused_meta = {}
    if os.path.exists(FUSED_META_FILE):
        with open(FUSED_META_FILE, 'r') as f:
            fused_meta = json.load(f)

    # Load Laps
    laps_df = pd.DataFrame()
    if os.path.exists(LAPS_FILE):
        laps_df = pd.read_csv(LAPS_FILE)
        
    return df, meta, fused_meta, laps_df

def main():
    st.title("🏎️ Sim Racing Telemetry - Prototype")
    
    df, meta, fused_meta, laps_df = load_data()
    
    if df is None:
        st.error(f"Data file not found: {DATA_FILE}")
        return

    # Sidebar: Session Info
    with st.sidebar:
        st.header("Session Info")
        if meta:
            st.write(f"**Track:** {meta.get('TrackName', 'Unknown')}")
            
            # Show Real Car Name if available
            real_car = fused_meta.get('RealCarName', meta.get('CarName', 'Unknown'))
            display_car = real_car
            if 'RealCarName' in fused_meta:
                 display_car += f" ({meta.get('CarName', 'Unknown')})"
            
            st.write(f"**Car:** {display_car}")
                 
            st.write(f"**Driver:** {meta.get('DriverName', 'Unknown')}")
            
        st.divider()
        st.header("Lap Selection")
        
        # Process Laps for Display
        if laps_df is None or laps_df.empty:
             available_laps = sorted(df['Lap'].unique().tolist())
             fastest_lap = None
        else:
             available_laps = sorted(laps_df['Lap'].unique().tolist())
             # Determine Fastest Lap (LapTime > 0)
             valid_laps = laps_df[laps_df['LapTime'] > 0]
             fastest_lap = valid_laps.loc[valid_laps['LapTime'].idxmin(), 'Lap'] if not valid_laps.empty else None

        def format_lap_option(lap):
            # If no lap time data, simple format
            if laps_df is None or laps_df.empty or 'LapTime' not in laps_df.columns:
                return f"Lap {lap}"
            
            # Find row
            row = laps_df[laps_df['Lap'] == lap]
            if row.empty:
                return f"Lap {lap}"
            
            time_sec = row.iloc[0]['LapTime']
            
            # Invalid Logic (0 or negative)
            if time_sec <= 0:
                return f"Lap {lap} - INVALID 🔴"
            
            # Format Time
            m = int(time_sec // 60)
            s = int(time_sec % 60)
            ms = int((time_sec * 1000) % 1000)
            time_str = f"{m}:{s:02d}.{ms:03d}"
            
            suffix = ""
            if lap == fastest_lap:
                suffix = " 🟪 (Fastest)"
            
            return f"Lap {lap} ({time_str}){suffix}"

        # Current Lap (Default: Lap 1 if exists, else first available)
        default_idx = 0
        if 1 in available_laps:
             default_idx = available_laps.index(1)
        
        current_lap = st.selectbox(
            "Select Current Lap", 
            available_laps, 
            index=default_idx,
            format_func=format_lap_option
        )
        
        # Reference Lap (Optional)
        # Options: None + Laps
        ref_options = [None] + available_laps
        ref_lap = st.selectbox(
            "Select Reference Lap", 
            ref_options, 
            index=0, # Default None
            format_func=lambda x: "None" if x is None else format_lap_option(x)
        )
        
    # Main Area
    if current_lap is None:
        st.info("Please select a Current Lap.")
        return
        
    # Prepare List to Plot
    # Order: [Reference, Current] so Current is on TOP? 
    # User said: "Gray dashed line and add transparency on top of solid line" (放在實線的上層).
    # So Reference should be drawn AFTER Current.
    # Order: [Current, Reference]
    
    laps_to_plot = []
    laps_to_plot.append({'lap': current_lap, 'type': 'current'})
    
    if ref_lap is not None and ref_lap != current_lap:
         laps_to_plot.append({'lap': ref_lap, 'type': 'ref'})
    
    # Graphs
    # 1. Speed Trace (Speed vs Distance)
    # We want X axis = Lap Dist (normalized).
    
    st.subheader("Telemetry Traces")
    
    # Plotly
    # -------------------------------------------------------------------------
    # LAYOUT STRATEGY: Single X-Axis with Multiple Y-Axes (Custom Domains)
    # -------------------------------------------------------------------------
    # Goal: Unified Hover across the entire height of the chart.
    # We use ONE 'xaxis' that spans the full height implicitly, but we restrict
    # the 'yaxis' domains to create the visual effect of subplots.
    # This ensures that hovering ANYWHERE on the chart triggers the hover events
    # for ALL traces that share this 'xaxis'.
    
    # Domains (Total Height=1.0, Gap=0.02)
    # y1 (HUD):     0.92 - 1.00 (8%)
    # y2 (Speed):   0.67 - 0.90 (23%) 
    # y3 (Throttle):0.52 - 0.65 (13%)
    # y4 (Brake):   0.37 - 0.50 (13%)
    # y5 (Gear):    0.27 - 0.35 (8%)
    # y6 (Steer):   0.00 - 0.25 (25%)
    
    fig = go.Figure()

    for item in laps_to_plot:
        lap = item['lap']
        l_type = item['type']
        
        lap_data = df[df['Lap'] == lap]
        
        # Downsample strictly for plotting performance and sync stability
        # 1000Hz is too dense for hover sync across subplots
        # 100Hz (every 10th point) is visually identical but 10x lighter
        lap_data = lap_data.iloc[::10]
        
        name = f"Lap {lap}"
        
        # Style
        if l_type == 'current':
            # Solid, Vivid Colors
            style = 'solid'
            width = 2
            opacity = 1.0
            color_speed = '#00BFFF'    # DeepSkyBlue
            color_throt = '#00FF00'    # Green
            color_brake = '#FF0000'    # Red
            color_gear  = '#FFA500'    # Orange
            color_steer = '#9370DB'    # MediumPurple
            legend_group = "Current"
        else:
            # Reference: Whiter, Denser, Less Transparent
            style = 'dot' # Denser than dash
            width = 1.5
            opacity = 0.9 # Less transparent
            color_base = 'rgba(220, 220, 220, 0.9)' # Whiter
            color_speed = color_base
            color_throt = color_base
            color_brake = color_base
            color_gear  = color_base
            color_steer = color_base
            legend_group = "Reference"
            name = f"Ref Lap {lap}"
        
        # X Axis = Lap Dist
        x_data = lap_data['Lap Dist']
        
        # ---------------------------------------------------------
        # COLUMN RESOLUTION (Before HUD Logic)
        # ---------------------------------------------------------
        # Speed
        speed_col = 'GPS Speed' if 'GPS Speed' in lap_data.columns else 'Ground Speed'
        # Throttle
        t_col = 'Throttle Pos' if 'Throttle Pos' in lap_data.columns else ('Throttle' if 'Throttle' in lap_data.columns else None)
        # Brake
        b_col = 'Brake Pos' if 'Brake Pos' in lap_data.columns else ('Brake' if 'Brake' in lap_data.columns else None)
        # Steering
        if 'Steering Angle' in lap_data.columns:
             s_col = 'Steering Angle'
        elif 'Steering Pos' in lap_data.columns:
             s_col = 'Steering Pos'
        else:
             s_col = None

        # ---------------------------------------------------------
        # PREPARE DATA FOR HUD
        # ---------------------------------------------------------
        # We need a single consolidated source for the hover label to ensure
        # all metrics are available at once in a custom format.
        
        # 1. Speed
        speed_val = lap_data[speed_col] if speed_col in lap_data.columns else pd.Series(0, index=lap_data.index)
        # Unit conversion check (if max < 100, likely m/s, convert to km/h)
        if speed_val.max() < 100: speed_val = speed_val * 3.6
        
        # 2. Throttle
        if t_col:
            throt_val = lap_data[t_col]
        else:
            throt_val = pd.Series(0, index=lap_data.index)
            
        # 3. Brake
        if b_col:
            brake_val = lap_data[b_col]
        else:
            brake_val = pd.Series(0, index=lap_data.index)
            
        # 4. Steering
        if s_col:
            steer_val = lap_data[s_col]
        else:
            steer_val = pd.Series(0, index=lap_data.index)
            
        # 5. Gear
        gear_val = lap_data['Gear'] if 'Gear' in lap_data.columns else pd.Series(0, index=lap_data.index)
        
        # 6. RPM
        rpm_val = lap_data['Engine RPM'] if 'Engine RPM' in lap_data.columns else pd.Series(0, index=lap_data.index)
        
        # 7. Time
        time_val = lap_data['Time'] - lap_data['Time'].iloc[0]
        
        # Stack into Custom Data (N x 7)
        # Columns: 0=Speed, 1=Thr, 2=Brk, 3=Str, 4=Gear, 5=RPM, 6=Time
        custom_data = np.stack([
            speed_val.values, 
            throt_val.values, 
            brake_val.values, 
            steer_val.values, 
            gear_val.values, 
            rpm_val.values, 
            time_val.values
        ], axis=-1)
        
        # ---------------------------------------------------------
        # MASTER HUD TRACE (Invisible Line on Y1)
        # ---------------------------------------------------------
        # This trace handles ALL hover interactions.
        # We use a table-like HTML structure to mimic the dashboard look.
        
        hover_template = (
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>SPD</span> "
            "<span style='font-size:20px; font-weight:bold; color:#FFF'>%{customdata[0]:.0f}</span>"
            "<span style='color:#888; font-size:12px'> km/h</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>THR</span> "
            "<span style='font-size:20px; font-weight:bold; color:#0F0'>%{customdata[1]:.1f}</span>"
            "<span style='color:#888; font-size:12px'> %</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>BRK</span> "
            "<span style='font-size:20px; font-weight:bold; color:#F00'>%{customdata[2]:.1f}</span>"
            "<span style='color:#888; font-size:12px'> %</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>STR</span> "
            "<span style='font-size:20px; font-weight:bold; color:#44F'>%{customdata[3]:.1f}</span>"
            "<span style='color:#888; font-size:12px'> °</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>GR</span> "
            "<span style='font-size:20px; font-weight:bold; color:#FFD700'>%{customdata[4]:.0f}</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>RPM</span> "
            "<span style='font-size:20px; font-weight:bold; color:#FA0'>%{customdata[5]:.0f}</span>"
            "   "
            "<span style='font-size:16px; font-weight:bold; color:#DDD'>TIME</span> "
            "<span style='font-size:20px; font-weight:bold; color:#FFF'>%{customdata[6]:.3f}</span>"
            "<extra></extra>" # Removes the secondary box name
        )
        
        # Add to Y1 (The HUD Axis)
        fig.add_trace(go.Scatter(x=x_data, y=[speed_val.min()]*len(x_data), mode='lines', name=f"HUD",
                                 line=dict(width=0), # Invisible but continuous
                                 opacity=0,          # Fully transparent
                                 showlegend=False,
                                 xaxis='x', yaxis='y1',
                                 customdata=custom_data,
                                 hovertemplate=hover_template))

        # ---------------------------------------------------------
        # STANDARD TRACES (Mapped to Y2-Y6)
        # ---------------------------------------------------------

        # Speed (Y2)
        if speed_col in lap_data.columns:
            fig.add_trace(go.Scatter(x=x_data, y=speed_val, mode='lines', name=f"{name} Speed", 
                                     line=dict(color=color_speed, width=width, dash=style),
                                     opacity=opacity, legendgroup=legend_group,
                                     xaxis='x', yaxis='y2',
                                     hovertemplate="%{y:.1f}"))
                                     
        # Throttle (Y3)
        if t_col:
            fig.add_trace(go.Scatter(x=x_data, y=lap_data[t_col], mode='lines', name=f"{name} Throttle",
                                     line=dict(color=color_throt, width=width, dash=style),
                                     opacity=opacity, legendgroup=legend_group, showlegend=False,
                                     xaxis='x', yaxis='y3',
                                     hovertemplate="%{y:.1f}"))

        # Brake (Y4)
        if b_col:
            fig.add_trace(go.Scatter(x=x_data, y=lap_data[b_col], mode='lines', name=f"{name} Brake",
                                     line=dict(color=color_brake, width=width, dash=style),
                                     opacity=opacity, legendgroup=legend_group, showlegend=False,
                                     xaxis='x', yaxis='y4',
                                     hovertemplate="%{y:.1f}"))
                                     
        # Gear (Y5)
        if 'Gear' in lap_data.columns:
             fig.add_trace(go.Scatter(x=x_data, y=lap_data['Gear'], mode='lines', name=f"{name} Gear",
                                     line=dict(color=color_gear, width=width, dash=style),
                                     opacity=opacity, legendgroup=legend_group, showlegend=False,
                                     xaxis='x', yaxis='y5',
                                     hovertemplate="%{y:.0f}"))
                                     
        # Steering (Y6)
        if s_col:
             fig.add_trace(go.Scatter(x=x_data, y=lap_data[s_col], mode='lines', name=f"{name} Steer",
                                     line=dict(color=color_steer, width=width, dash=style),
                                     opacity=opacity, legendgroup=legend_group, showlegend=False,
                                     xaxis='x', yaxis='y6',
                                     hovertemplate=f"%{{y:.1f}}"))

    # ---------------------------------------------------------
    # Layout configuration
    # ---------------------------------------------------------
    
    # Constrain X-Axis Range to eliminate empty space
    # Find max distance across all plotted laps
    max_dist = 0
    for item in laps_to_plot:
         l_df = df[df['Lap'] == item['lap']]
         max_dist = max(max_dist, l_df['Lap Dist'].max())
    
    # Manually configure Axes domains to simulate subplots
    fig.update_layout(
        xaxis=dict(range=[0, max_dist], constrain='domain', matches='x'),
        # Y1: HUD (Top 8%)
        yaxis1=dict(domain=[0.92, 1.0], visible=False, fixedrange=True),
        # Y2: Speed (23%)
        yaxis2=dict(domain=[0.67, 0.90], title="Speed (km/h)"),
        # Y3: Throttle (13%)
        yaxis3=dict(domain=[0.52, 0.65], title="Throttle (%)", range=[-5, 105]),
        # Y4: Brake (13%)
        yaxis4=dict(domain=[0.37, 0.50], title="Brake (%)", range=[-5, 105]),
        # Y5: Gear (8%)
        yaxis5=dict(domain=[0.27, 0.35], title="Gear"),
        # Y6: Steer (25%)
        yaxis6=dict(domain=[0.00, 0.25], title="Steering (deg)")
    )
    
    fig.update_layout(
        height=1000, 
        # Unified Hover for Single X-Axis
        hovermode="x unified", 
        template="plotly_dark",
        hoverdistance=-1, # Infinite search distance
        spikedistance=-1,
        # Add margin at the top
        margin=dict(t=50, b=50, l=100, r=50) 
    )    
    # Configure hover label style
    fig.update_layout(
        hoverlabel=dict(
            bgcolor="rgba(30, 30, 30, 0.9)",
            font_size=14,
            font_family="Consolas, monospace"
        )
    )
    
    # Apply to ALL x-axes
    fig.update_xaxes(
        range=[0, max_dist], 
        constrain='domain',
        matches='x',
        showspikes=True,
        spikemode='across',
        spikesnap='cursor',
        showline=False,
        spikedash='solid',
        spikecolor='#FFFFFF',
        spikethickness=1
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
         # Map (Optional)
    st.subheader("Track Map (Current Lap)")
    # RGB color based on Throttle/Brake
    if 'GPS Latitude' in df.columns and 'GPS Longitude' in df.columns:
         lap_data = df[df['Lap'] == current_lap].copy()
         
         # Downsample for performance (every 10th point = 100Hz -> 10Hz?)
         # Original is 1000Hz. 
         # 1000Hz is too much for markers.
         # Let's take every 20th point (50Hz) or 50th (20Hz).
         # 50th point is safe.
         downsample_rate = 20
         lap_data_map = lap_data.iloc[::downsample_rate]
         
         lats = lap_data_map['GPS Latitude']
         lons = lap_data_map['GPS Longitude']
         
         # Calculate Zoom
         delta_lat = lats.max() - lats.min()
         delta_lon = lons.max() - lons.min()
         max_delta = max(delta_lat, delta_lon) if not np.isnan(lats.max()) else 0.05
         
         zoom_level = 13.5 # Default
         if max_delta > 0:
             # Heuristic: smaller delta -> larger zoom
             # 0.05 deg ~ 5km -> Zoom 13-14
             # 0.01 deg ~ 1km -> Zoom 15-16
             zoom_level = 12.5 - np.log10(max_delta)
             zoom_level = min(max(zoom_level, 10), 16) # Clamp
         
         # Prepare Data for Tooltip
         # Prepare Data for Tooltip
         # Speed (kph)
         s_col = 'GPS Speed' if 'GPS Speed' in lap_data_map.columns else 'Ground Speed'
         # Check max value to guess unit.
         # If > 100, assume km/h. If < 100, assume m/s.
         # 100 m/s = 360 km/h (Fastest cars ~340 km/h). So 100 is a safe threshold.
         if s_col in lap_data_map.columns:
             s_vals_raw = lap_data_map[s_col].values
             if s_vals_raw.max() < 100:
                 s_vals = s_vals_raw * 3.6
             else:
                 s_vals = s_vals_raw
         else:
             s_vals = np.zeros(len(lap_data_map))
             
         # Throttle
         t_col = 'Throttle Pos' if 'Throttle Pos' in lap_data_map.columns else ('Throttle' if 'Throttle' in lap_data_map.columns else None)
         t_vals = lap_data_map[t_col].values if t_col else np.zeros(len(lap_data_map))
         # Brake
         b_col = 'Brake Pos' if 'Brake Pos' in lap_data_map.columns else ('Brake' if 'Brake' in lap_data_map.columns else None)
         b_vals = lap_data_map[b_col].values if b_col else np.zeros(len(lap_data_map))
         # Gear
         g_vals = lap_data_map['Gear'].values if 'Gear' in lap_data_map.columns else np.zeros(len(lap_data_map))

         # Create color strings
         # R, G, B
         colors_map = []
         
         # Normalize inputs for color (0-100 assumption)
         t_norm = np.clip(t_vals, 0, 100) / 100.0
         b_norm = np.clip(b_vals, 0, 100) / 100.0
         
         for t, b in zip(t_norm, b_norm):
             r = int(b * 255)
             g = int(t * 255)
             # If both are low, use blue/gray?
             b_component = 0
             if r < 20 and g < 20: 
                 b_component = 150 # Blue for coasting
             
             colors_map.append(f"rgb({r},{g},{b_component})")
         
         # Customdata for hover
         # Stack along axis 1
         customdata = np.stack((s_vals, t_vals, b_vals, g_vals), axis=-1)
             
         map_fig = go.Figure()
         map_fig.add_trace(go.Scattermapbox(
             lat=lats,
             lon=lons,
             mode='markers', # Markers to support individual colors
             marker=dict(size=5, color=colors_map), # size slightly larger
             name=f"Lap {current_lap}",
             customdata=customdata,
             hovertemplate="<b>Speed:</b> %{customdata[0]:.1f} km/h<br>" +
                           "<b>Throttle:</b> %{customdata[1]:.1f}%<br>" +
                           "<b>Brake:</b> %{customdata[2]:.1f}%<br>" +
                           "<b>Gear:</b> %{customdata[3]:.0f}<br>" +
                           "<extra></extra>" # Hide trace name
         ))
        
         
         map_fig.update_layout(
            mapbox_style="carto-darkmatter",
            mapbox_zoom=zoom_level - 0.2, # Zoom out slightly
            mapbox_center={"lat": (lats.max() + lats.min()) / 2, "lon": (lons.max() + lons.min()) / 2}, # Center of Bounding Box
            height=600,
            margin={"r":0,"t":0,"l":0,"b":0}
        )
         st.plotly_chart(map_fig, use_container_width=True)
    else:
        st.warning("GPS Coordinates not found for map.")

if __name__ == "__main__":
    main()
