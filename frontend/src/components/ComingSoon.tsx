export default function ComingSoonPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">Section</div>
        <h1 className="h-heading text-5xl font-bold mt-1">{title}</h1>
        <p className="text-white/50 mt-2 max-w-xl">{subtitle}</p>
      </div>
      <div className="card-elev rounded-2xl p-16 text-center">
        <div className="label-cap">Phase 2</div>
        <div className="h-heading text-3xl mt-2 text-white/60">Coming soon</div>
        <p className="text-white/40 mt-3 max-w-md mx-auto">
          This module unlocks after league matches begin. For now, focus on the live auction and
          team squad building.
        </p>
      </div>
    </div>
  );
}
