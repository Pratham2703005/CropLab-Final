import type { NdviChartPoint } from "@/types";

export const NdviTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: NdviChartPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className='bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs'>
      <p className='font-semibold text-neutral-700'>{d.longLabel}</p>
      <p className='text-emerald-700 font-bold'>
        NDVI: {(d.ndvi as number).toFixed(4)}
      </p>
    </div>
  );
};