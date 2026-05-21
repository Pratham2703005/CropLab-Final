import type { Farm, LockVariant } from "@/types"
import { formatHectares } from "@/utils"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import cropData from "@/assets/dashboard-crops.json"
import { useServerStatus } from "@/contexts/serverStatus"
import { LOCK_PILL, LOCK_VARIANT, SERVER_STATUS } from "@/constants"

const CardBody = ({
  farm,
  lockVariant,
}: {
  farm: Farm;
  lockVariant?: LockVariant;
}) => {
  const cropInfo = cropData.find(crop => crop.name === farm.crop);
  const lock = lockVariant ? LOCK_PILL[lockVariant] : null;

  return (
    <>
      {/* Background Image with Low Opacity */}
      {cropInfo?.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 z-0"
          style={{
            backgroundImage: `url(${cropInfo.imageUrl})`,
          }}
        />
      )}

      {/* Content with relative positioning to stay above background */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-md font-medium text-gray-900">{farm.name}</h4>
            {farm.isShowcase && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                Showcase
              </span>
            )}
            {lock && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${lock.classes}`}
              >
                <lock.Icon className="h-2.5 w-2.5" />
                {lock.label}
              </span>
            )}
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {farm.crop}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Area:</span>
            <span className="font-medium">{formatHectares(farm.area)} ha</span>
          </div>
          <div className="flex justify-between">
            <span>Planting:</span>
            <span className="font-medium">
              {new Date(farm.plantingDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Harvest:</span>
            <span className="font-medium">
              {new Date(farm.harvestDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 text-xs text-gray-400">
          Created {new Date(farm.createdAt).toLocaleDateString()}
        </div>
      </div>
    </>
  );
};

export const Card = ({
  farm,
  index,
  locked = false,
}: {
  farm: Farm;
  index: number;
  locked?: boolean;
}) => {
  const { status } = useServerStatus();

  if (locked) {
    const lockVariant: LockVariant =
    status === SERVER_STATUS.ERROR
        ? LOCK_VARIANT.OFFLINE
        : status === SERVER_STATUS.STOPPED
          ? LOCK_VARIANT.PAUSED
          : LOCK_VARIANT.WAKING;
    const title = {
      [LOCK_VARIANT.OFFLINE]: 'Backend is offline - this farm needs the server',
      [LOCK_VARIANT.PAUSED]: 'Health polling is stopped - resume it to open this farm',
      [LOCK_VARIANT.WAKING]: 'Waking up the server - this farm will unlock shortly',
    }[lockVariant];
    return (
      <div
        key={index}
        aria-disabled
        title={title}
        className="border border-gray-200 rounded-lg p-4 bg-white relative overflow-hidden block opacity-60 cursor-not-allowed"
      >
        <CardBody farm={farm} lockVariant={lockVariant} />
      </div>
    );
  }

  return (
    <Link
      to={`/farm/${farm.id}`}
      key={index}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white relative overflow-hidden block cursor-pointer"
    >
      <CardBody farm={farm} />
    </Link>
  );
};

export const AddFarmCard = () => {
  return (
    <Link
      to="/create-farm"
      className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-green-500 hover:bg-green-50 transition min-h-[200px]"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 mb-3">
        <Plus className="w-5 h-5 text-green-600" />
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-1">Add New Farm</h4>
      <p className="text-xs text-gray-500">Create and manage another farm</p>
    </Link>
  )
}
