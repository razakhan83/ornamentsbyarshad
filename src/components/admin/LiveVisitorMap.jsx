'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Minus, RotateCcw, MapPin, Loader2, Sun, Moon } from 'lucide-react';

const GEO_URL = '/countries-110m.json';

export default function LiveVisitorMap({ visitors = [] }) {
  const [geoData, setGeoData] = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });
  const [hoveredVisitor, setHoveredVisitor] = useState(null);
  const [mapTheme, setMapTheme] = useState('light'); // 'light' or 'dark'

  useEffect(() => {
    let active = true;
    fetch(GEO_URL)
      .then((res) => res.json())
      .then((data) => {
        if (active) setGeoData(data);
      })
      .catch(() => {
        // Fallback to CDN if local fails
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
          .then((r) => r.json())
          .then((d) => {
            if (active) setGeoData(d);
          })
          .catch(() => {});
      });

    return () => {
      active = false;
    };
  }, []);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [0, 20], zoom: 1 });
  };

  // Group coordinates to show count badge if multiple users are in the same city
  const groupedMarkers = useMemo(() => {
    const groups = new Map();
    visitors.forEach((v) => {
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const key = `${lat.toFixed(1)}_${lng.toFixed(1)}`;
      const isAdm = v.isAdmin || v.role === 'admin';
      if (!groups.has(key)) {
        groups.set(key, {
          lat,
          lng,
          city: v.city || 'Visitor',
          country: v.country || 'Global',
          count: 1,
          hasAdmin: isAdm,
          visitors: [v],
        });
      } else {
        const item = groups.get(key);
        item.count += 1;
        if (isAdm) item.hasAdmin = true;
        item.visitors.push(v);
      }
    });
    return Array.from(groups.values());
  }, [visitors]);

  const isLight = mapTheme === 'light';

  // Theme palettes
  const styles = {
    cardBg: isLight ? 'bg-white border-border shadow-sm' : 'bg-slate-950 border-slate-800 shadow-2xl',
    oceanBg: isLight ? '#f8fafc' : '#020617',
    landFill: isLight ? '#e2e8f0' : '#1e293b',
    landStroke: isLight ? '#cbd5e1' : '#334155',
    landHover: isLight ? '#cbd5e1' : '#334155',
    overlayBg: isLight ? 'bg-white/95 border-border text-foreground shadow-md' : 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-sm',
    badgeText: isLight ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-slate-900/90 border-slate-700',
    controlsBg: isLight ? 'bg-white/95 border-border shadow-md text-slate-700' : 'bg-slate-900/90 border-slate-800 shadow-lg text-slate-300',
    btnHover: isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200',
    footer: isLight ? 'bg-slate-50/80 border-border text-slate-500' : 'bg-slate-900/60 border-slate-800 text-slate-400',
  };

  return (
    <Card className={`relative w-full overflow-hidden border p-1.5 sm:p-2.5 rounded-2xl transition-colors duration-300 ${styles.cardBg}`}>
      {/* Map Hotspots Count */}
      <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-10 pointer-events-none">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border backdrop-blur-md shadow-xs ${isLight ? 'bg-white/90 border-border text-foreground' : 'bg-slate-900/90 border-slate-800 text-slate-300'}`}>
          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
          {groupedMarkers.length} {groupedMarkers.length === 1 ? 'Location' : 'Locations'}
        </span>
      </div>

      {/* Map Theme & Zoom Controls */}
      <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-1 backdrop-blur-md p-1 rounded-xl border shadow-sm ${styles.controlsBg}`}>
        {/* Light / Dark Mode Toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMapTheme(isLight ? 'dark' : 'light')}
          className={`h-7 sm:h-8 px-2 text-xs font-medium gap-1.5 rounded-lg transition-colors ${styles.btnHover}`}
          title={isLight ? 'Switch to Dark Radar' : 'Switch to Clean Light Map'}
        >
          {isLight ? (
            <>
              <Moon className="size-3.5 text-slate-600" />
              <span className="text-[11px] hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="size-3.5 text-amber-400" />
              <span className="text-[11px] hidden sm:inline">Light</span>
            </>
          )}
        </Button>
      </div>

      {/* Map Zoom Controls (Bottom Right) */}
      <div className={`absolute bottom-10 right-3 sm:bottom-12 sm:right-4 z-10 flex flex-col gap-1 backdrop-blur-md p-1 rounded-xl border shadow-sm ${styles.controlsBg}`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          className={`size-7 sm:size-8 rounded-lg ${styles.btnHover}`}
          title="Zoom In"
        >
          <Plus className="size-3.5 sm:size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomOut}
          className={`size-7 sm:size-8 rounded-lg ${styles.btnHover}`}
          title="Zoom Out"
        >
          <Minus className="size-3.5 sm:size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleReset}
          className={`size-7 sm:size-8 rounded-lg ${styles.btnHover}`}
          title="Reset View"
        >
          <RotateCcw className="size-3 sm:size-3.5" />
        </Button>
      </div>

      {/* Interactive SVG World Map */}
      <div className="w-full h-[290px] sm:h-[400px] md:h-[500px] flex items-center justify-center cursor-grab active:cursor-grabbing rounded-xl overflow-hidden transition-colors duration-300" style={{ backgroundColor: styles.oceanBg }}>
        {!geoData ? (
          <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
            <Loader2 className="size-6 sm:size-7 animate-spin text-emerald-500" />
            <span className="text-xs font-mono">Loading World Map Geometries...</span>
          </div>
        ) : (
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 165 }}
            width={800}
            height={440}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={setPosition}
              maxZoom={5}
              minZoom={1}
            >
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={styles.landFill}
                      stroke={styles.landStroke}
                      strokeWidth={0.75}
                      style={{
                        default: { outline: 'none', transition: 'fill 300ms' },
                        hover: { fill: styles.landHover, outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Glowing Real-Time Visitor Markers */}
              {groupedMarkers.map((marker, index) => (
                <Marker key={`${marker.lat}-${marker.lng}-${index}`} coordinates={[marker.lng, marker.lat]}>
                  <g
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredVisitor(marker)}
                    onMouseLeave={() => setHoveredVisitor(null)}
                  >
                    {/* Hit area for mouse hover */}
                    <circle r={10} fill="transparent" />

                    {/* Subtle soft ambient glow aura */}
                    <circle
                      r={5}
                      fill={marker.hasAdmin ? '#a855f7' : '#10b981'}
                      opacity={0.2}
                      className="pointer-events-none"
                    />

                    {/* Ultra-minimal crisp dot */}
                    <circle
                      r={2.2}
                      fill={marker.hasAdmin ? '#a855f7' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth={0.8}
                      className="drop-shadow-[0_0_4px_rgba(16,185,129,0.85)] pointer-events-none transition-transform duration-150 group-hover:scale-125"
                    />

                    {/* Multi-visitor badge count if stacked */}
                    {marker.count > 1 && (
                      <text
                        textAnchor="middle"
                        y={-8}
                        fontSize={7}
                        fontWeight="bold"
                        fill="#a7f3d0"
                        className="pointer-events-none select-none drop-shadow"
                      >
                        {marker.count}
                      </text>
                    )}
                  </g>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        )}

        {/* Hovered Marker Floating Tooltip Overlay */}
        {hoveredVisitor && (
          <div className={`absolute top-12 left-3 sm:top-14 sm:left-4 z-20 pointer-events-none px-3.5 py-2 rounded-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 border shadow-lg ${styles.overlayBg}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <MapPin className="size-3.5 shrink-0" />
              <span>{hoveredVisitor.city}, {hoveredVisitor.country}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
              {hoveredVisitor.hasAdmin ? (
                <span className="text-purple-600 dark:text-purple-400 font-semibold">Admin (HQ)</span>
              ) : (
                <span>{hoveredVisitor.count} {hoveredVisitor.count === 1 ? 'Live Visitor' : 'Active Visitors'}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
