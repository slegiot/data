export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-neutral-800 rounded-lg" />
                <div className="h-9 w-28 bg-neutral-800 rounded-lg" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <div className="h-4 w-24 bg-neutral-800 rounded mb-3" />
                        <div className="h-8 w-16 bg-neutral-800 rounded" />
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                    <div className="h-5 w-32 bg-neutral-800 rounded" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border-b border-neutral-800/50">
                        <div className="h-4 w-1/4 bg-neutral-800 rounded" />
                        <div className="h-4 w-1/3 bg-neutral-800 rounded" />
                        <div className="h-4 w-1/6 bg-neutral-800 rounded" />
                        <div className="h-4 w-20 bg-neutral-800 rounded ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    )
}
