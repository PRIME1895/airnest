import React, { useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { classifyAqi } from '../../packages/shared/impact/index';
import type { AqiSnapshot, Language } from '../../packages/shared/schemas';

interface AirQualityMapProps {
  snapshot: AqiSnapshot;
  language: Language;
  quotaExceeded: boolean;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const AqiMarkerWithInfo: React.FC<{ snapshot: AqiSnapshot }> = ({ snapshot }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const cls = classifyAqi(snapshot.aqi);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: snapshot.approxLat, lng: snapshot.approxLng }}
        onClick={() => setOpen((v) => !v)}
        title={`${snapshot.city} AQI ${snapshot.aqi} (${cls.band})`}
      >
        <Pin
          background={cls.colorHex}
          borderColor="#ffffff"
          glyphColor="#ffffff"
          glyphText={String(snapshot.aqi)}
        />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onClose={() => setOpen(false)}>
          <div className="p-1 text-xs text-[#122620] space-y-1">
            <div className="font-bold">
              {snapshot.city} — AQI {snapshot.aqi} ({cls.band})
            </div>
            <div>
              PM2.5: {snapshot.pm25} µg/m³ · Best Window: {snapshot.bestWindow}
            </div>
            <div className="text-[11px] text-[#49635A]">
              Approximate grid cell (~1.1 km) for privacy
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const AirQualityMap: React.FC<AirQualityMapProps> = ({
  snapshot,
  language,
  quotaExceeded,
}) => {
  const cls = classifyAqi(snapshot.aqi);

  if (!MAPS_API_KEY || quotaExceeded) {
    return (
      <div className="h-[230px] rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] border border-[#D8E8DF] dark:border-[#253F34] p-4 flex flex-col items-center justify-center text-center gap-2">
        <MapPin className="w-6 h-6 text-[#1B4D3E] dark:text-[#4ADE80]" aria-hidden="true" />
        <div className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
          {snapshot.city}, {snapshot.region}
        </div>
        <div className="text-xs font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
          Grid: {snapshot.approxLat.toFixed(2)}°, {snapshot.approxLng.toFixed(2)}° · AQI {snapshot.aqi} ({cls.band})
        </div>
      </div>
    );
  }

  return (
    <div className="h-[230px] w-full rounded-xl overflow-hidden border border-[#D8E8DF] dark:border-[#253F34]">
      <APIProvider apiKey={MAPS_API_KEY} language={language} region="IN">
        <GoogleMap
          center={{ lat: snapshot.approxLat, lng: snapshot.approxLng }}
          zoom={11}
          mapId="DEMO_MAP_ID"
          gestureHandling="cooperative"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <AqiMarkerWithInfo snapshot={snapshot} />
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
