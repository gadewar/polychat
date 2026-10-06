import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { HOST, LEAVE_CHANNEL_ROUTE } from "@/utils/constants";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { RiCloseFill } from "react-icons/ri";
import { FiMoon, FiSun } from "react-icons/fi";
import { IoExitOutline } from "react-icons/io5";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const ChatHeader = () => {
  const {
    closeChat,
    selectedChatData,
    selectedChatType,
    isDarkMode,
    toggleDarkMode,
    onlineUsers,
    removeChannel,
    typingUsers,
  } = useAppStore();

  const isContactOnline =
    selectedChatType === "contact" &&
    onlineUsers.includes(selectedChatData?._id);

  // Get typing status for current chat
  const getTypingText = () => {
    if (!selectedChatData) return null;

    if (selectedChatType === "contact") {
      // For DMs, check if the other person is typing
      const typingData = typingUsers[selectedChatData._id];
      if (typingData && Object.keys(typingData).length > 0) {
        return "typing...";
      }
    } else if (selectedChatType === "channel") {
      const typingData = typingUsers[selectedChatData._id];
      if (typingData && Object.keys(typingData).length > 0) {
        const names = Object.values(typingData);
        if (names.length === 1) {
          return `${names[0]} is typing...`;
        } else if (names.length === 2) {
          return `${names[0]} and ${names[1]} are typing...`;
        } else {
          return `${names[0]} and ${names.length - 1} others are typing...`;
        }
      }
    }
    return null;
  };

  const typingText = getTypingText();

  const handleLeaveChannel = async () => {
    try {
      const response = await apiClient.delete(
        `${LEAVE_CHANNEL_ROUTE}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      if (response.status === 200) {
        toast.success(response.data.message || "Left channel successfully");
        removeChannel(selectedChatData._id);
        closeChat();
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
      toast.error("Failed to leave channel");
    }
  };

  return (
    <motion.div 
      className="h-[10vh] border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-800 shadow-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex gap-5 items-center w-full justify-between">
        <div className="flex gap-3 items-center justify-center">
          <div className="w-12 h-12 relative">
            {selectedChatType === "contact" ? (
              <Avatar className="h-12 w-12 rounded-full overflow-hidden shadow-md">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`uppercase h-12 w-12 text-lg border flex items-center justify-center rounded-full shadow-sm ${getColor(
                      selectedChatData.color
                    )}`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.split("").shift()
                      : selectedChatData.email.split("").shift()}
                  </motion.div>
                )}
              </Avatar>
            ) : (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-indigo-100 dark:bg-indigo-900/40 h-12 w-12 flex items-center justify-center rounded-full shadow-sm text-indigo-600 dark:text-indigo-300"
              >
                #
              </motion.div>
            )}
            {/* Online status dot on avatar */}
            {selectedChatType === "contact" && (
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${
                  isContactOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {selectedChatType === "channel" && selectedChatData.name}
              {selectedChatType === "contact" && selectedChatData.firstName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatType === "contact" ? selectedChatData.email : null}
            </div>
            {/* Status / Typing text */}
            <div className="text-xs h-4">
              {typingText ? (
                <motion.span
                  className="text-indigo-500 dark:text-indigo-400 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {typingText}
                </motion.span>
              ) : selectedChatType === "contact" ? (
                <span className={isContactOnline ? "text-green-500" : "text-gray-400 dark:text-gray-500"}>
                  {isContactOnline ? "Online" : "Offline"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Leave Channel button */}
          {selectedChatType === "channel" && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              onClick={handleLeaveChannel}
              title="Leave Channel"
            >
              <IoExitOutline className="text-xl" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            onClick={closeChat}
          >
            <RiCloseFill className="text-xl" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatHeader;
