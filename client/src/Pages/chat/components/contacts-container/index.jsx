import { useEffect } from "react";
import NewDM from "./components/new-dm/index.jsx";
import ProfileInfo from "./components/profile-info/index.jsx";
import { apiClient } from "@/lib/api-client.js";
import {
  GET_DM_CONTACTS_ROUTES,
  GET_USER_CHANNELS_ROUTE,
} from "@/utils/constants.js";
import { useAppStore } from "@/store/index.js";
import ContactList from "@/components/contact-list.jsx";
import CreateChannel from "./components/create-channel/index.jsx";
import PendingRequests from "./components/pending-requests/index.jsx";

import { FiMoon, FiSun } from "react-icons/fi";
import { motion } from "framer-motion";

const ContactsContainer = () => {
  const {
    setDirectMessagesContacts,
    directMessagesContacts,
    channels,
    setChannels,
    isDarkMode,
    toggleDarkMode,
  } = useAppStore();

  useEffect(() => {
    const getContacts = async () => {
      const response = await apiClient.get(GET_DM_CONTACTS_ROUTES, {
        withCredentials: true,
      });
      if (response.data.contacts) {
        setDirectMessagesContacts(response.data.contacts);
      }
    };

    const getChannels = async () => {
      const response = await apiClient.get(GET_USER_CHANNELS_ROUTE, {
        withCredentials: true,
      });
      if (response.data.channels) {
        setChannels(response.data.channels);
      }
    };

    getContacts();
    getChannels();
  }, [setChannels, setDirectMessagesContacts]);

  return (
    <div className="relative flex flex-col h-full md:w-[35vw] lg:w-[30vw] xl:w-[20vw] bg-slate-50 dark:bg-slate-900 border-r-2 border-gray-200 dark:border-slate-800 w-full transition-colors">
      <div className="h-[10vh] flex justify-between items-center pr-5 border-b border-gray-200 dark:border-slate-700">
        <Logo />
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? (
              <FiSun className="text-lg" />
            ) : (
              <FiMoon className="text-lg" />
            )}
          </motion.button>
          <PendingRequests />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        <div className="my-5">
          <div className="flex items-center justify-between pr-8">
            <Title text="Direct Messages" />
            <NewDM />
          </div>
          <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
            <ContactList contacts={directMessagesContacts} />
          </div>
        </div>
        <div className="my-5">
          <div className="flex items-center justify-between pr-8">
            <Title text="Channels" />
            <CreateChannel />
          </div>
          <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
            <ContactList contacts={channels} isChannel={true} />
          </div>
        </div>
      </div>

      <ProfileInfo />
    </div>
  );
};

export default ContactsContainer;

const Logo = () => {
  return (
    <div className="flex pl-5 justify-start items-center gap-2">
      <svg
        id="logo-38"
        width="48"
        height="20"
        viewBox="0 0 78 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {" "}
        <path
          d="M55.5 0H77.5L58.5 32H36.5L55.5 0Z"
          className="ccustom"
          fill="#8338ec"
        ></path>{" "}
        <path
          d="M35.5 0H51.5L32.5 32H16.5L35.5 0Z"
          className="ccompli1"
          fill="#975aed"
        ></path>{" "}
        <path
          d="M19.5 0H31.5L12.5 32H0.5L19.5 0Z"
          className="ccompli2"
          fill="#a16ee8"
        ></path>{" "}
      </svg>
      <span className="text-xl font-semibold text-gray-800 dark:text-white transition-colors">
        Polychat
      </span>
    </div>
  );
};

const Title = ({ text }) => {
  return (
    <h6 className="uppercase tracking-widest text-neutral-500 dark:text-neutral-400 pl-8 md:pl-5 font-light text-opacity-90 text-sm">
      {text}
    </h6>
  );
};
