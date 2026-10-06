export const createChatSlice = (set, get) => ({
  selectedChatType: undefined,
  selectedChatData: undefined,
  selectedChatMessages: [],
  directMessagesContacts: [],
  isUploading: false,
  isDownloading: false,
  fileUploadProgress: 0,
  fileDownloadProgress: 0,
  isDarkMode: true,
  
  channels: [],
  setChannels: (channels) => set({ channels }),

  // Privacy & Relationships
  friends: [],
  setFriends: (friends) => set({ friends }),
  
  friendRequests: [],
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  
  sentFriendRequests: [],
  setSentFriendRequests: (sentFriendRequests) => set({ sentFriendRequests }),

  channelInvites: [],
  setChannelInvites: (channelInvites) => set({ channelInvites }),

  // Online status
  onlineUsers: [],
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  // Typing indicators
  typingUsers: {}, // { recipientId/channelId: { senderId: senderName, ... } }
  setTypingUser: (chatId, senderId, senderName) => {
    const typingUsers = { ...get().typingUsers };
    if (!typingUsers[chatId]) {
      typingUsers[chatId] = {};
    }
    typingUsers[chatId][senderId] = senderName || "Someone";
    set({ typingUsers });
  },
  removeTypingUser: (chatId, senderId) => {
    const typingUsers = { ...get().typingUsers };
    if (typingUsers[chatId]) {
      delete typingUsers[chatId][senderId];
      if (Object.keys(typingUsers[chatId]).length === 0) {
        delete typingUsers[chatId];
      }
    }
    set({ typingUsers });
  },

  setIsUploading: (isUploading) => set({ isUploading }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),

  setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
  setFileDownloadProgress: (fileDownloadProgress) =>
    set({ fileDownloadProgress }),

  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.isDarkMode;
    localStorage.setItem('darkMode', newDarkMode.toString());
    return { isDarkMode: newDarkMode };
  }),
  
  setIsDarkMode: (isDarkMode) => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    set({ isDarkMode });
  },

  setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
  setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
  setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessages }),
  setDirectMessagesContacts: (directMessagesContacts) =>
    set({ directMessagesContacts }),

  addChannel: (channel) => {
    const channels = get().channels;
    set({ channels: [channel, ...channels] });
  },

  removeChannel: (channelId) => {
    const channels = get().channels.filter((c) => c._id !== channelId);
    set({ channels });
  },

  closeChat: () =>
    set({
      selectedChatData: undefined,
      selectedChatType: undefined,
      selectedChatMessages: [],
    }),

  addMessage: (message) => {
    const selectedChatMessages = get().selectedChatMessages || [];
    const selectedChatType = get().selectedChatType;

    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          recipient:
            selectedChatType === "channel"
              ? message.recipient
              : message.recipient._id,
          sender:
            selectedChatType === "channel"
              ? message.sender
              : message.sender._id,
        },
      ],
    });
  },

  markMessagesAsRead: (recipientId) => {
    const messages = get().selectedChatMessages;
    // We only mark messages as read if the current selected chat matches
    // and if the message was sent to the current user (which means sender == recipientId of the event)
    const updatedMessages = messages.map(msg => {
      // If the message was sent BY the person we are chatting with, it means we have read it.
      // Wait, if we are marking messages as read, the backend updates all messages where sender=recipientId, recipient=me.
      // For the UI, we just update the status of messages sent by recipientId.
      if (
        (msg.sender._id === recipientId || msg.sender === recipientId) &&
        msg.messageStatus !== "read"
      ) {
        return { ...msg, messageStatus: "read" };
      }
      return msg;
    });
    set({ selectedChatMessages: updatedMessages });
  },

  markMyMessagesAsRead: () => {
    // This is called when we receive a 'messagesRead' socket event, meaning the OTHER person read OUR messages.
    const messages = get().selectedChatMessages;
    const updatedMessages = messages.map(msg => {
      if (
        (msg.sender._id === get().userInfo.id || msg.sender === get().userInfo.id) &&
        msg.messageStatus !== "read"
      ) {
        return { ...msg, messageStatus: "read" };
      }
      return msg;
    });
    set({ selectedChatMessages: updatedMessages });
  },
  addChannelInChannelList: (message) => {
    const channels = get().channels;
    const data = channels.find((channel) => channel._id === message.channelId);
    const index = channels.findIndex(
      (channel) => channel._id === message.channelId
    );
    if (index !== -1 && index !== undefined) {
      channels.splice(index, 1);
      channels.unshift(data);
    }
  },

  addContactsInDMContacts: (message) => {
    const userId = get().userInfo.id;
    const fromId =
      message.sender._id === userId
        ? message.recipient._id
        : message.sender._id;
    const fromData =
      message.sender._id === userId ? message.recipient : message.sender;
    const dmContacts = get().directMessagesContacts;
    const data = dmContacts.find((contact) => contact._id === fromId);
    const index = dmContacts.findIndex((contact) => contact._id === fromId);

    if (index !== -1 && index !== undefined) {
      dmContacts.splice(index, 1);
      dmContacts.unshift(data);
    } else {
      dmContacts.unshift(fromData);
    }

    set({ directMessagesContacts: dmContacts });
  },
});
