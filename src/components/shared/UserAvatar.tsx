import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const colors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-indigo-500", "bg-amber-500",
];

function getColor(name: string): string {
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function UserAvatar({ name, image, size = "md", className }: UserAvatarProps) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0",
        sizeClasses[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export function AvatarGroup({ users, max = 3 }: { users: { name: string; image?: string | null }[]; max?: number }) {
  const visible = users.slice(0, max);
  const rest = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <div key={i} className="ring-2 ring-background rounded-full">
          <UserAvatar name={u.name} image={u.image} size="sm" />
        </div>
      ))}
      {rest > 0 && (
        <div className="ring-2 ring-background rounded-full w-6 h-6 bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{rest}
        </div>
      )}
    </div>
  );
}
