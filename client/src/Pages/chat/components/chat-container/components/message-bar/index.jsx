import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
  lazy,
} from "react";
const EmojiPicker = lazy(() => import("emoji-picker-react"));
import { RiAttachment2 } from "react-icons/ri";
import { IoSend } from "react-icons/io5";
import { RiEmojiStickerLine } from "react-icons/ri";
import { useAppStore } from "@/store";
import { useSocket } from "@/context/Socketcontext";
import { apiClient } from "@/lib/api-client";
import { UPLOAD_FILE_ROUTE } from "@/utils/constants";
import { motion, AnimatePresence } from "framer-motion";

const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const socket = useSocket();
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const {
    selectedChatType,
    selectedChatData,
    userInfo,
    setIsUploading,
    setFileUploadProgress,
    isDarkMode,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

  // Cleanup typing on unmount or chat change
  useEffect(() => {
    return () => {
      if (isTypingRef.current && socket) {
        emitStopTyping();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedChatData, selectedChatType]);

  const emitStopTyping = useCallback(() => {
    if (!socket || !selectedChatData) return;
    isTypingRef.current = false;

    if (selectedChatType === "contact") {
      socket.emit("stop-typing", { recipientId: selectedChatData._id });
    } else if (selectedChatType === "channel") {
      socket.emit("channel-stop-typing", { channelId: selectedChatData._id });
    }
  }, [socket, selectedChatData, selectedChatType]);

  const handleTyping = useCallback(() => {
    if (!socket || !selectedChatData) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (selectedChatType === "contact") {
        socket.emit("typing", { recipientId: selectedChatData._id });
      } else if (selectedChatType === "channel") {
        socket.emit("channel-typing", { channelId: selectedChatData._id });
      }
    }

    // Reset the stop-typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 2000);
  }, [socket, selectedChatData, selectedChatType, emitStopTyping]);

  const handleAddEmoji = (emoji) => {
    setMessage((msg) => msg + emoji.emoji);
    handleTyping();
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleSendMessage = async () => {
    if (message.trim() === "") return;

    // Stop typing indicator when sending
    emitStopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatData._id,
        messageType: "text",
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        content: message,
        messageType: "text",
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);

        const response = await apiClient.post(UPLOAD_FILE_ROUTE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          },
        });

        if (response.status === 200 && response.data) {
          setIsUploading(false);
          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              sender: userInfo.id,
              content: undefined,
              recipient: selectedChatData._id,
              messageType: "file",
              fileUrl: response.data.filePath,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: undefined,
              messageType: "file",
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.error(error);
    }
  };

  return (
    <motion.div
      className="h-[10vh] bg-white dark:bg-slate-800 flex justify-center items-center px-8 py-4 gap-2 md:gap-4 border-t border-gray-200 dark:border-slate-700 shadow-inner"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex-1 flex bg-gray-100 dark:bg-slate-700 rounded-full items-center gap-3 pr-3 shadow-sm transition-all">
        <textarea
          rows={1}
          placeholder="Type a message..."
          className="flex-1 py-3 px-2 bg-transparent rounded-full focus:outline-none resize-none text-gray-800 dark:text-gray-100 placeholder:px-3 placeholder-gray-400 dark:placeholder-gray-500"
          value={message}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          onClick={handleAttachmentClick}
        >
          <RiAttachment2 className="text-xl" />
        </motion.button>

        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          >
            <RiEmojiStickerLine className="text-xl" />
          </motion.button>

          <AnimatePresence>
            {emojiPickerOpen && (
              <motion.div
                className="fixed bottom-24 left-5  md:absolute md:bottom-12 md:left-auto md:translate-x-0 md:right-0 z-[100] w-[90vw] md:w-[350px]"
                ref={emojiRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense
                  fallback={
                    <div className="w-full h-[400px] bg-white dark:bg-[#222222] rounded-xl shadow-2xl flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                      Loading emojis...
                    </div>
                  }
                >
                  <EmojiPicker
                    theme={isDarkMode ? "dark" : "light"}
                    onEmojiClick={handleAddEmoji}
                    autoFocusSearch={false}
                    width="100%"
                    height={400}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`rounded-full p-3.5 flex items-center justify-center shadow-md transition-all
          ${
            message.trim()
              ? "bg-indigo-500 hover:bg-indigo-600 text-white"
              : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
        onClick={handleSendMessage}
        disabled={!message.trim()}
      >
        <IoSend className="text-xl" />
      </motion.button>
    </motion.div>
  );
};

export default MessageBar;
