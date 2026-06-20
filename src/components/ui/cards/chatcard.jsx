import Avatar from "./Avatar";
import Badge from "./Badge";

export default function ChatCard({
  name = "Customer",
  lastMessage = "",
  time = "",
  unread = 0,
  online = false,
  avatar = "",
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full
        bg-white
        border
        border-[#E8F4F1]
        rounded-3xl
        p-4
        flex
        items-center
        gap-4
        shadow-sm
        active:scale-[0.99]
        transition-all
      "
    >
      <div className="relative">
        <Avatar src={avatar} name={name} size="lg" />

        {online && (
          <span
            className="
              absolute
              bottom-0
              right-0
              w-4
              h-4
              rounded-full
              bg-green-500
              border-2
              border-white
            "
          />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-[#073B35] truncate">
            {name}
          </h3>

          <span className="text-xs text-[#7A8A86]">
            {time}
          </span>
        </div>

        <p className="text-sm text-[#7A8A86] truncate mt-1">
          {lastMessage}
        </p>
      </div>

      {unread > 0 && (
        <Badge color="primary">
          {unread}
        </Badge>
      )}
    </button>
  );
}