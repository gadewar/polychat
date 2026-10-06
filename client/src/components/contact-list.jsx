import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";

const ContactList = ({ contacts, isChannel = false }) => {
  const {
    selectedChatData,
    setSelectedChatData,
    selectedChatType,
    setSelectedChatType,
    setSelectedChatMessages,
    onlineUsers,
  } = useAppStore();

  const handleClick = (contact) => {
    if (isChannel) setSelectedChatType("channel");
    else setSelectedChatType("contact");
    setSelectedChatData(contact);

    if (selectedChatData && selectedChatData._id !== contact._id) {
      setSelectedChatMessages([]);
    }
  };

  return (
    <div className="mt-5">
      {contacts.map((contact) => {
        const isOnline = !isChannel && onlineUsers.includes(contact._id);

        return (
          <div
            key={contact._id}
            className={`pl-8 md:pl-5 py-2 transition-all duration-300 cursor-pointer ${
              selectedChatData && selectedChatData._id === contact._id
                ? "bg-[#6a11cb]/20 hover:bg-[#6a11cb]/40"
                : "hover:bg-[#6a11cb]/40"
            }`}
            onClick={() => handleClick(contact)}
          >
            <div className="flex gap-5 items-center justify-start text-gray-800 dark:text-gray-300">
              {!isChannel && (
                <div className="relative">
                  <Avatar className="h-10 w-10 rounded-full overflow-hidden">
                    {contact.image ? (
                      <AvatarImage
                        src={`${HOST}/${contact.image}`}
                        alt="profile"
                        className="object-cover w-full h-full bg-black"
                      />
                    ) : (
                      <div
                        className={`uppercase h-10 w-10 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                          contact.color,
                        )}`}
                      >
                        {contact.firstName
                          ? contact.firstName.split("").shift()
                          : contact.email.split("").shift()}
                      </div>
                    )}
                  </Avatar>
                  {/* Online status dot */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-50 dark:border-slate-900 ${
                      isOnline ? "bg-green-500" : "bg-gray-400 dark:bg-gray-500"
                    }`}
                  />
                </div>
              )}
              {isChannel && (
                <div className="bg-gray-200 dark:bg-[#ffffff22] h-10 w-10 flex items-center justify-center rounded-full text-gray-800 dark:text-white">
                  #
                </div>
              )}
              {isChannel ? (
                <span>{contact.name}</span>
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium">
                    {contact.firstName
                      ? `${contact.firstName} ${contact.lastName}`
                      : contact.email}
                  </span>
                  {isOnline && (
                    <span className="text-xs text-green-500 dark:text-green-400">
                      Online
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContactList;
