import { GlobeAltIcon } from '@heroicons/react/24/outline';
// import { lusitana } from '@/app/ui/fonts';

export default function AcmeLogo() {
  return (
    <div
      className="flex flex-row items-center leading-none text-white"
    >
      <GlobeAltIcon className="h-24 w-24 rotate-[15deg]" />
      <p className="text-[25px]">萍乡再生资源交易中心</p>
    </div>
  );
}
