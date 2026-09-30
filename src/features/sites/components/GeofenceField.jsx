import { useState } from 'react';
import { toast } from 'sonner';
import { Crosshair, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const RADII = [100, 200, 300, 500, 1000];

// "12.97, 77.59", or a Google Maps link (…/@12.97,77.59,17z or ?q=12.97,77.59) -> { lat, lng }.
export const parseLatLng = (text) => {
  const s = String(text || '');
  const m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

// value: { lat, lng, radius } or null. Staff-app check-ins must happen within the radius.
export function GeofenceField({ value, onChange }) {
  const [text, setText] = useState('');
  const [locating, setLocating] = useState(false);
  const on = Boolean(value);

  const useHere = () => {
    if (!navigator.geolocation) return toast.error('This device cannot share its location');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onChange({ lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)), radius: value?.radius || 200 });
        toast.success(`Location set (±${Math.round(coords.accuracy)} m)`);
      },
      () => {
        setLocating(false);
        toast.error('Could not get your location. Allow location access, or paste a Google Maps link.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id="site-fence"
          checked={on}
          onCheckedChange={(checked) => onChange(checked ? { lat: '', lng: '', radius: 200 } : null)}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="site-fence" className="font-medium">Staff must be at the site to check in</Label>
          <p className="text-xs text-muted-foreground">The staff app checks their phone's location against this spot.</p>
        </div>
      </div>

      {on && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={useHere} disabled={locating} className="shrink-0">
              <Crosshair /> {locating ? 'Finding you…' : 'Use my current location'}
            </Button>
            <Input
              aria-label="Paste a Google Maps link or latitude, longitude"
              placeholder="or paste Maps link / 9.9816, 76.2999"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const point = parseLatLng(e.target.value);
                if (point) onChange({ ...point, radius: value?.radius || 200 });
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {value.lat !== '' && value.lat !== undefined ? `${value.lat}, ${value.lng}` : 'No location yet'}
            </span>
            {value.lat !== '' && value.lat !== undefined && (
              <a href={`https://www.google.com/maps?q=${value.lat},${value.lng}`} target="_blank" rel="noreferrer" className="tap inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                <Navigation className="h-3.5 w-3.5" /> Check on map
              </a>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground">Within</span>
              <Select value={String(value.radius || 200)} onValueChange={(v) => onChange({ ...value, radius: Number(v) })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RADII.map((r) => <SelectItem key={r} value={String(r)}>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
