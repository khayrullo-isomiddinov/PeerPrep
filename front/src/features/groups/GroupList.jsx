import GroupCard from "./GroupCard"

export default function GroupList({ groups, setGroups }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-slate-500 dark:text-slate-400">
        No groups yet. Create one to get started!
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          onDelete={() => setGroups(groups.filter((x) => x.id !== g.id))}
        />
      ))}
    </div>
  )
}
