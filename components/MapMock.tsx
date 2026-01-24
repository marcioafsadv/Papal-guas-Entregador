
import React, { useEffect, useRef } from 'react';
import { DriverStatus } from '../types';

interface MapMockProps {
  status: string;
  showRoute?: boolean;
  theme?: 'dark' | 'light';
}

export const MapMock: React.FC<MapMockProps> = ({ status, showRoute = false, theme = 'dark' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  // Fix: Accept string to handle potential narrowing issues with literal types from props
  const getTileUrl = (t: string) => 
    t === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-23.5505, -46.6333], 15);

    // Fix: getTileUrl now accepts the theme variable correctly
    tileLayerRef.current = L.tileLayer(getTileUrl(theme), {
      maxZoom: 19
    }).addTo(mapRef.current);

    navigator.geolocation.getCurrentPosition((position) => {
      if (!mapRef.current) return;
      
      const { latitude, longitude } = position.coords;
      mapRef.current.setView([latitude, longitude], 16);
      
      const driverIcon = L.divIcon({
        className: 'driver-marker-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-10 h-10 bg-[#FF6B00] rounded-full border-2 border-white flex items-center justify-center shadow-lg relative z-10">
              <i class="fas fa-motorcycle text-white text-sm"></i>
            </div>
            <div class="absolute w-12 h-12 bg-[#FF6B00] rounded-full opacity-30 animate-ping"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      driverMarkerRef.current = L.marker([latitude, longitude], { icon: driverIcon }).addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when theme changes
  useEffect(() => {
    if (tileLayerRef.current && mapRef.current) {
      // Fix: getTileUrl correctly handles the theme change
      tileLayerRef.current.setUrl(getTileUrl(theme));
    }
  }, [theme]);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (destinationMarkerRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (showRoute) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (!mapRef.current) return;
        
        const { latitude, longitude } = pos.coords;
        let destCoords: [number, number];
        let iconHtml = '';
        
        if (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE) {
          destCoords = [latitude + 0.005, longitude + 0.005];
          iconHtml = `
            <div class="w-10 h-10 bg-white rounded-full border-4 border-[#FF6B00] flex items-center justify-center shadow-lg">
              <i class="fas fa-store text-[#FF6B00]"></i>
            </div>
          `;
        } else {
          destCoords = [latitude - 0.003, longitude - 0.003];
          iconHtml = `
            <div class="w-10 h-10 bg-[#FFD700] rounded-full border-4 border-white flex items-center justify-center shadow-lg">
              <i class="fas fa-home text-black"></i>
            </div>
          `;
        }

        const destIcon = L.divIcon({
          className: 'dest-marker-icon',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        destinationMarkerRef.current = L.marker(destCoords, { icon: destIcon }).addTo(mapRef.current);
        
        const markers = [];
        if (driverMarkerRef.current) markers.push(driverMarkerRef.current);
        if (destinationMarkerRef.current) markers.push(destinationMarkerRef.current);
        
        if (markers.length > 0) {
          const group = L.featureGroup(markers);
          mapRef.current.fitBounds(group.getBounds(), { padding: [100, 100] });
        }
      });
    } else {
       if (driverMarkerRef.current && mapRef.current) {
         mapRef.current.setView(driverMarkerRef.current.getLatLng(), 16);
       }
    }
  }, [status, showRoute]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="leaflet-vignette absolute inset-0 pointer-events-none"></div>
    </div>
  );
};
