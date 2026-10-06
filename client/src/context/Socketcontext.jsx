import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo) {
      socket.current = io(HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });

      socket.current.on("connect", () => {
        console.log("Connected to socket server");
      });

      // === ONLINE STATUS EVENTS ===
      socket.current.on("online-users", (onlineUserIds) => {
        const { setOnlineUsers } = useAppStore.getState();
        setOnlineUsers(onlineUserIds);
      });

      socket.current.on("user-status-change", ({ userId, isOnline }) => {
        const { onlineUsers, setOnlineUsers } = useAppStore.getState();
        if (isOnline) {
          if (!onlineUsers.includes(userId)) {
            setOnlineUsers([...onlineUsers, userId]);
          }
        } else {
          setOnlineUsers(onlineUsers.filter((id) => id !== userId));
        }
      });

      // === TYPING INDICATOR EVENTS (DM) ===
      socket.current.on("user-typing", ({ senderId }) => {
        const { setTypingUser } = useAppStore.getState();
        setTypingUser(senderId, senderId, null);
      });

      socket.current.on("user-stop-typing", ({ senderId }) => {
        const { removeTypingUser } = useAppStore.getState();
        removeTypingUser(senderId, senderId);
      });

      // === TYPING INDICATOR EVENTS (CHANNEL) ===
      socket.current.on("channel-user-typing", ({ channelId, senderId, senderName }) => {
        const { setTypingUser } = useAppStore.getState();
        setTypingUser(channelId, senderId, senderName);
      });

      socket.current.on("channel-user-stop-typing", ({ channelId, senderId }) => {
        const { removeTypingUser } = useAppStore.getState();
        removeTypingUser(channelId, senderId);
      });

      // === MESSAGE EVENTS ===
      socket.current.on("receiveMessage", (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addContactsInDMContacts,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          (selectedChatData._id === message.sender._id ||
            selectedChatData._id === message.recipient._id)
        ) {
          console.log("message rcv", message);
          addMessage(message);
        }
        addContactsInDMContacts(message);
      });

      socket.current.on("receive-channel-message", (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addChannelInChannelList,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          selectedChatData._id === message.channelId
        ) {
          addMessage(message);
        }
        addChannelInChannelList(message);
      });

      // === READ RECEIPTS ===
      socket.current.on("messagesRead", ({ recipientId }) => {
        const { markMyMessagesAsRead } = useAppStore.getState();
        markMyMessagesAsRead();
      });

      // === TRANSLATION EVENTS ===
      socket.current.on("messageTranslated", (translatedMessage) => {
        try {
          console.log("Received translated message:", translatedMessage);
          const { userInfo, selectedChatMessages, setSelectedChatMessages } =
            useAppStore.getState();

          if (
            translatedMessage.sender &&
            translatedMessage.sender._id === userInfo.id
          ) {
            return;
          }

          if (translatedMessage && translatedMessage._id) {
            if (!Array.isArray(selectedChatMessages)) return;

            const updatedMessages = selectedChatMessages.map((message) => {
              if (message && message._id === translatedMessage._id) {
                return {
                  ...message,
                  content: translatedMessage.content || message.content,
                };
              }
              return message;
            });
            setSelectedChatMessages(updatedMessages);
          }
        } catch (error) {
          console.error("Error handling translated message:", error);
        }
      });

      socket.current.on("channel-message-translated", (translatedMessage) => {
        try {
          console.log("Received translated channel message:", translatedMessage);
          const { userInfo, selectedChatMessages, setSelectedChatMessages } =
            useAppStore.getState();

          if (
            translatedMessage.sender &&
            translatedMessage.sender._id === userInfo.id
          ) {
            return;
          }

          if (translatedMessage && translatedMessage._id) {
            if (!Array.isArray(selectedChatMessages)) return;

            const updatedMessages = selectedChatMessages.map((message) => {
              if (message && message._id === translatedMessage._id) {
                return {
                  ...message,
                  content: translatedMessage.content || message.content,
                };
              }
              return message;
            });
            setSelectedChatMessages(updatedMessages);
          }
        } catch (error) {
          console.error("Error handling translated channel message:", error);
        }
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};
