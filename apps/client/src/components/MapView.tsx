'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para íconos de Leaflet en Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Position {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
  userName?: string;
}

interface Props {
  positions: Position[];
  height?: string;
}

export default function MapView({ positions, height = '400px' }: Props) {
  // Centro en Asunción, Paraguay por defecto
  const center = positions.length > 0
    ? [positions[0].latitude, positions[0].longitude] as [number, number]
    : [-25.2637, -57.5759] as [number, number];

  return (
    <MapContainer center={center} zoom={positions.length > 0 ? 14 : 6} style={{ height, width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.map((pos, i) => (
        <Marker key={i} position={[pos.latitude, pos.longitude]} icon={defaultIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{pos.userName || pos.userId}</p>
              <p>Lat: {pos.latitude.toFixed(6)}</p>
              <p>Lng: {pos.longitude.toFixed(6)}</p>
              {pos.speed != null && <p>Velocidad: {pos.speed.toFixed(1)} m/s</p>}
              {pos.batteryLevel != null && <p>Batería: {pos.batteryLevel}%</p>}
              <p className="text-gray-400 text-xs mt-1">{new Date(pos.recordedAt).toLocaleString('es-PY')}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
