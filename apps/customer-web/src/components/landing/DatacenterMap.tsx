'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import React from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

interface DatacenterLocation {
  name: string;
  coordinates: [number, number];
  code: string;
}

// DigitalOcean-like locations
const locations: DatacenterLocation[] = [
  { name: "New York", coordinates: [-74.006, 40.7128], code: "NYC" },
  { name: "San Francisco", coordinates: [-122.4194, 37.7749], code: "SFO" },
  { name: "Toronto", coordinates: [-79.3832, 43.6532], code: "TOR" },
  { name: "London", coordinates: [-0.1276, 51.5074], code: "LON" },
  { name: "Amsterdam", coordinates: [4.9041, 52.3676], code: "AMS" },
  { name: "Frankfurt", coordinates: [8.6821, 50.1109], code: "FRA" },
  { name: "Singapore", coordinates: [103.8198, 1.3521], code: "SGP" },
  { name: "Bangalore", coordinates: [77.5946, 12.9716], code: "BLR" },
  { name: "Sydney", coordinates: [151.2093, -33.8688], code: "SYD" },
];

export function DatacenterMap() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-[500px] bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 z-10 pointer-events-none" />
      
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
          center: [0, 20]
        }}
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={isDark ? "#1e293b" : "#e2e8f0"}
                stroke={isDark ? "#334155" : "#cbd5e1"}
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: isDark ? "#334155" : "#cbd5e1", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {locations.map(({ name, coordinates, code }, index) => (
          <Marker key={name} coordinates={coordinates}>
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
               {/* Pulse Effect */}
              <circle r={8} fill="var(--primary)" opacity={0.2} className="animate-ping origin-center" />
              {/* Core Dot */}
              <circle r={3} fill="var(--primary)" stroke="var(--background)" strokeWidth={1} />
            </motion.g>
            
            <text
              textAnchor="middle"
              y={-12}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "10px",
                fill: "var(--foreground)",
                fontWeight: 600,
                pointerEvents: "none",
              }}
            >
              {code}
            </text>
          </Marker>
        ))}
      </ComposableMap>

      <div className="absolute bottom-4 left-4 z-20">
         <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Global Network Active
         </div>
      </div>
    </div>
  );
}
