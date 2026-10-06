import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store";
import {
  GET_ALL_MESSAGES_ROUTE,
  GET_CHANNEL_MESSAGES,
  HOST,
} from "@/utils/constants";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { MdFolderZip } from "react-icons/md";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp, IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { getColor } from "@/lib/utils";
import { languages } from "@/utils/languages";
import { useSocket } from "@/context/Socketcontext";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";

const MessageContainer = () => {
  const parentRef = useRef(null);
  const socket = useSocket();
  const {
    selectedChatType,
    selectedChatData,
    userInfo,
    selectedChatMessages,
    setSelectedChatMessages,
    setFileDownloadProgress,
    setIsDownloading,
    onlineUsers,
    typingUsers,
  } = useAppStore();

  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);

  // Get typing status for current chat
  const isTyping = (() => {
    if (!selectedChatData) return false;
    const chatId = selectedChatData._id;
    const typingData = typingUsers[chatId];
    return typingData && Object.keys(typingData).length > 0;
  })();

  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await apiClient.post(
          GET_ALL_MESSAGES_ROUTE,
          { id: selectedChatData._id },
          { withCredentials: true }
        );
        if (response.data.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error({ error });
      }
    };

    const getChannelMessages = async () => {
      try {
        const response = await apiClient.get(
          `${GET_CHANNEL_MESSAGES}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        if (response.data.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error({ error });
      }
    };

    if (selectedChatData._id) {
      if (selectedChatType === "contact") getMessages();
      else if (selectedChatType === "channel") getChannelMessages();
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (selectedChatType === "contact" && selectedChatData && userInfo && socket) {
      const hasUnread = selectedChatMessages.some(
        (msg) => 
          (msg.sender._id === selectedChatData._id || msg.sender === selectedChatData._id) && 
          msg.messageStatus !== "read"
      );
      
      if (hasUnread) {
        socket.emit("markMessagesAsRead", {
          senderId: selectedChatData._id,
          recipientId: userInfo.id,
        });
      }
    }
  }, [selectedChatMessages, selectedChatData, selectedChatType, userInfo, socket]);

  const virtualizer = useVirtualizer({
    count: selectedChatMessages.length + (isTyping ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Estimate height
    overscan: 10,
  });

  useEffect(() => {
    const totalItems = selectedChatMessages.length + (isTyping ? 1 : 0);
    if (totalItems > 0) {
      setTimeout(() => {
        virtualizer.scrollToIndex(totalItems - 1, { align: "end", behavior: "smooth" });
      }, 50);
    }
  }, [selectedChatMessages.length, isTyping, virtualizer]);

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const renderMessageWithDate = (index) => {
    const message = selectedChatMessages[index];
    const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
    const previousMessageDate = index > 0 ? moment(selectedChatMessages[index - 1].timestamp).format("YYYY-MM-DD") : null;
    const showDate = messageDate !== previousMessageDate;
    
    return (
      <div className="px-2 md:px-4 lg:px-6">
        {showDate && (
          <motion.div 
            className="flex justify-center my-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-xs rounded-full shadow-sm">
              {moment(message.timestamp).format("LL")}
            </span>
          </motion.div>
        )}
        {selectedChatType === "contact" && renderDMMessages(message, index)}
        {selectedChatType === "channel" && renderChannelMessages(message, index)}
      </div>
    );
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setFileDownloadProgress(0);

    try {
      const response = await apiClient.get(`${HOST}/${url}`, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          if (total) {
            const percentCompleted = Math.round((loaded * 100) / total);
            setFileDownloadProgress(percentCompleted);
          }
        },
      });

      if (response.status === 200) {
        const urlBlob = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = urlBlob;
        link.setAttribute("download", url.split("/").pop());
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(urlBlob);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      setIsDownloading(false);
      setFileDownloadProgress(0);
    }
  };

  const renderDMMessages = (message, index) => {
    const isCurrentUser = (message.sender?._id || message.sender) === userInfo.id;
    
    return (
      <motion.div
        className={`mb-3 ${isCurrentUser ? "text-right" : "text-left"}`}
        initial={{ opacity: 0, y: 20, x: isCurrentUser ? 20 : -20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {message.messageType === "text" && (
          <div
            className={`relative ${
              isCurrentUser
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-100 ml-auto"
                : "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 mr-auto"
            } p-3 px-4 rounded-2xl my-1 max-w-[70%] w-fit shadow-sm break-words`}
          >
            <p className="whitespace-pre-line break-words text-left">
              {message.content}
            </p>
          </div>
        )}

        {message.messageType === "file" && (
          <div
            className={`inline-block p-3 rounded-2xl my-1 max-w-[50%] break-words shadow-sm ${
              isCurrentUser
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-100"
                : "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
            }`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer flex justify-center items-center"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  height={250}
                  width={250}
                  className="rounded-xl shadow-sm max-w-full"
                />
              </div>
            ) : (
              <div className="h-auto w-auto flex items-center justify-center gap-3 py-1 px-2">
                <span className="text-indigo-600 dark:text-indigo-300 text-2xl rounded-full p-2 bg-white/50 dark:bg-slate-600/50">
                  <MdFolderZip />
                </span>
                <span className="text-sm overflow-hidden text-ellipsis max-w-[120px]">
                  {message.fileUrl.split("/").pop()}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-xl rounded-full bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 transition-colors"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </motion.button>
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 mx-1 flex items-center gap-1 justify-end">
          {moment(message.timestamp).format("LT")}
          {isCurrentUser && (
            <span className="text-lg">
              {message.messageStatus === "read" ? (
                <IoCheckmarkDone className="text-blue-500" />
              ) : message.messageStatus === "delivered" ? (
                <IoCheckmarkDone className="text-gray-400" />
              ) : (
                <IoCheckmark className="text-gray-400" />
              )}
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  const renderChannelMessages = (message, index) => {
    const isCurrentUser = message.sender._id === userInfo.id;
    const senderIsOnline = onlineUsers.includes(message.sender._id);
    
    return (
      <motion.div
        className={`mt-4 ${isCurrentUser ? "text-right" : "text-left"}`}
        initial={{ opacity: 0, y: 20, x: isCurrentUser ? 20 : -20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {message.messageType === "text" && (
          <div
            className={`relative ${
              isCurrentUser
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-100 ml-auto"
                : "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 mr-auto"
            } p-3 px-4 rounded-2xl my-1 max-w-[70%] w-fit shadow-sm break-words`}
          >
            <p className="whitespace-pre-line break-words text-left">
              {message.content}
            </p>
          </div>
        )}

        {message.messageType === "file" && (
          <div
            className={`inline-block p-3 rounded-2xl my-1 max-w-[50%] break-words shadow-sm ${
              isCurrentUser
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-100"
                : "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
            }`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer flex justify-center items-center"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  height={250}
                  width={250}
                  className="rounded-xl shadow-sm max-w-full"
                />
              </div>
            ) : (
              <div className="h-auto w-auto flex items-center justify-center gap-3 py-1 px-2">
                <span className="text-indigo-600 dark:text-indigo-300 text-2xl rounded-full p-2 bg-white/50 dark:bg-slate-600/50">
                  <MdFolderZip />
                </span>
                <span className="text-sm overflow-hidden text-ellipsis max-w-[120px]">
                  {message.fileUrl.split("/").pop()}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-xl rounded-full bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 transition-colors"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </motion.button>
              </div>
            )}
          </div>
        )}
        {message.sender._id !== userInfo.id ? (
          <div className="mt-1 ml-1 flex items-center justify-start gap-2">
            <div className="relative">
              <Avatar className="h-6 w-6 rounded-full overflow-hidden shadow-sm">
                {message.sender.image && (
                  <AvatarImage
                    src={`${HOST}/${message.sender.image}`}
                    alt="profile"
                    className="object-cover w-full h-full"
                  />
                )}
                <AvatarFallback
                  className={`uppercase h-6 w-6 text-sm flex items-center justify-center rounded-full shadow-sm ${getColor(
                    message.sender.color
                  )}`}
                >
                  {message.sender.firstName
                    ? message.sender.firstName.split("").shift()
                    : message.sender.email.split("").shift()}
                </AvatarFallback>
              </Avatar>
              {/* Real online status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-50 dark:border-slate-900 ${
                  senderIsOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              {`${message.sender.firstName} ${message.sender.lastName}`}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {moment(message.timestamp).format("LT")}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 mr-1">
            {moment(message.timestamp).format("LT")}
          </div>
        )}
      </motion.div>
    );
  };

  // Typing indicator animation
  const typingIndicator = () => (
    <motion.div 
      className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-700 rounded-full w-24 shadow-sm ml-2 mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <motion.div 
        className="w-2 h-2 bg-indigo-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
      />
      <motion.div 
        className="w-2 h-2 bg-indigo-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
      />
      <motion.div 
        className="w-2 h-2 bg-indigo-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
      />
    </motion.div>
  );

  return (
    <motion.div 
      ref={parentRef}
      className="flex-1 overflow-y-auto overflow-x-hidden py-4 bg-gray-50 dark:bg-slate-900 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const isTypingItem = isTyping && virtualItem.index === selectedChatMessages.length;
          
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {isTypingItem ? (
                <div className="px-2 md:px-4 lg:px-6">
                  {typingIndicator()}
                </div>
              ) : (
                renderMessageWithDate(virtualItem.index)
              )}
            </div>
          );
        })}
      </div>
      
      {showImage && (
        <motion.div
          className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg flex-col bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setShowImage(false);
            setImageURL(null);
          }}
        >
          <motion.div 
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={`${HOST}/${imageURL}`}
              className="h-[80vh] max-w-[80vw] object-contain rounded-xl shadow-2xl"
              alt="Preview"
            />
          </motion.div>

          <div className="flex gap-4 absolute top-5 right-5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white/10 backdrop-blur-md p-3 text-3xl rounded-full text-white cursor-pointer transition-all hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(imageURL);
              }}
            >
              <IoMdArrowRoundDown />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white/10 backdrop-blur-md p-3 text-3xl rounded-full text-white cursor-pointer transition-all hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <IoCloseSharp />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MessageContainer;
