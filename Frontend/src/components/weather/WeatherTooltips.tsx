export const TempTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-lg text-xs'>
        <p className='font-semibold text-neutral-700 mb-1'>{label}</p>
        <p className='text-orange-600'>
          High: {Math.round(payload[0]?.value ?? 0)}°C
        </p>
        <p className='text-sky-600'>
          Low: {Math.round(payload[1]?.value ?? 0)}°C
        </p>
      </div>
    );
  }
  return null;
};

export const RainTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const rain = payload.find(p => p.name === 'rain');
    const prob = payload.find(p => p.name === 'prob');
    return (
      <div className='bg-white border border-blue-200 rounded-xl px-3 py-2 shadow-lg text-xs'>
        <p className='font-semibold text-neutral-700 mb-1'>{label}</p>
        {rain && (
          <p className='text-blue-700 font-medium'>
            💧 {(rain.value ?? 0).toFixed(1)} mm
          </p>
        )}
        {prob && (prob.value ?? 0) > 0 && (
          <p className='text-sky-600'>{Math.round(prob.value ?? 0)}% chance</p>
        )}
      </div>
    );
  }
  return null;
};

export const WeatherIntelligenceTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const temp = payload.find(p => p.dataKey === 'tempAvg')?.value;
  const rain = payload.find(p => p.dataKey === 'rain')?.value;
  const wind = payload.find(p => p.dataKey === 'wind')?.value;

  return (
    <div className='rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs shadow-lg'>
      <p className='font-semibold text-neutral-700'>{label}</p>
      {typeof temp === 'number' && (
        <p className='text-orange-700'>Temp: {temp.toFixed(1)} C</p>
      )}
      {typeof rain === 'number' && (
        <p className='text-blue-700'>Rain: {rain.toFixed(1)} mm</p>
      )}
      {typeof wind === 'number' && (
        <p className='text-teal-700'>Wind: {wind.toFixed(0)} km/h</p>
      )}
    </div>
  );
};
