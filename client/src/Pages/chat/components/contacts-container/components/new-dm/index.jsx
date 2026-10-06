import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import animationData, { getColor } from "@/lib/utils";
import Lottie from "lottie-react"; // ✅ Use lottie-react
import { apiClient } from "@/lib/api-client";
import { HOST, SEARCH_CONTACTS_ROUTES, SEND_FRIEND_REQUEST_ROUTE, ACCEPT_FRIEND_REQUEST_ROUTE } from "@/utils/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { useAppStore } from "@/store";

const NewDM = () => {
  const { setSelectedChatType, setSelectedChatData } = useAppStore();
  const [openNewContactModal, setOpenNewContactModal] = useState(false);
  const [searchedContacts, setSearchedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (searchTerm.length === 0) {
      setSearchedContacts([]);
    }
  }, [searchTerm]);

  const searchContacts = async (term) => {
    setSearchTerm(term);
    try {
      if (term.length > 0) {
        const response = await apiClient.post(
          SEARCH_CONTACTS_ROUTES,
          { searchTerm: term },
          { withCredentials: true }
        );
        if (response.status === 200 && response.data.contacts) {
          setSearchedContacts(response.data.contacts);
        }
      } else {
        setSearchedContacts([]);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const selectNewContact = (contact) => {
    if (contact.relationship !== "friend") return;
    setOpenNewContactModal(false);
    setSelectedChatType("contact");
    setSelectedChatData(contact);
    setSearchedContacts([]);
  };

  const sendFriendRequest = async (targetId) => {
    try {
      await apiClient.post(SEND_FRIEND_REQUEST_ROUTE, { targetId }, { withCredentials: true });
      // Update UI optimistically
      setSearchedContacts((prev) => 
        prev.map(c => c._id === targetId ? { ...c, relationship: "outgoing_request" } : c)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const acceptFriendRequest = async (targetId) => {
    try {
      await apiClient.post(ACCEPT_FRIEND_REQUEST_ROUTE, { targetId }, { withCredentials: true });
      // Update UI optimistically
      setSearchedContacts((prev) => 
        prev.map(c => c._id === targetId ? { ...c, relationship: "friend" } : c)
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className="text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setOpenNewContactModal(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1c1b1e] border-none text-white font-bold rounded-md p-1 text-xs shadow-md transition-all duration-300">
            Select New Contact
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog 
        open={openNewContactModal} 
        onOpenChange={(open) => {
          setOpenNewContactModal(open);
          if (!open) {
            setSearchedContacts([]);
            setSearchTerm("");
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border-none text-gray-800 dark:text-white w-[90vw] max-w-[400px] h-[400px] max-h-[80vh] flex flex-col rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex justify-center mt-4">
              Please Select a Contact
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div>
            <Input
              placeholder="Search Contacts"
              className="rounded-lg p-6 bg-gray-100 dark:bg-slate-800 border-none text-gray-800 dark:text-white"
              value={searchTerm}
              onChange={(e) => searchContacts(e.target.value)}
            />
          </div>
          {searchedContacts.length > 0 && (
            <ScrollArea className="h-[250px] ">
              <div className="flex flex-col gap-5 pr-2">
                {searchedContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-0 py-2"
                  >
                    <div 
                      className={`flex gap-3 items-center ${contact.relationship === 'friend' ? 'cursor-pointer' : ''}`}
                      onClick={() => selectNewContact(contact)}
                    >
                      <div className="w-12 h-12 relative ">
                        <Avatar className="h-12 w-12 rounded-full overflow-hidden">
                          {contact.image ? (
                            <AvatarImage
                              src={`${HOST}/${contact.image}`}
                              alt="profile"
                              className="object-cover w-full h-full bg-black rounded-full"
                            />
                          ) : (
                            <div
                              className={`uppercase h-12 w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                                contact.color
                              )}`}
                            >
                              {contact.firstName
                                ? contact.firstName.split("").shift()
                                : contact.email.split("").shift()}
                            </div>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex flex-col">
                        <span>
                          {contact.firstName && contact.lastName
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.email}
                        </span>
                        <span className="text-xs">{contact.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center ml-2">
                      {contact.relationship === "none" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); sendFriendRequest(contact._id); }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                      {contact.relationship === "outgoing_request" && (
                        <button
                          disabled
                          className="bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full"
                        >
                          Pending
                        </button>
                      )}
                      {contact.relationship === "incoming_request" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); acceptFriendRequest(contact._id); }}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      {contact.relationship === "friend" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); selectNewContact(contact); }}
                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                        >
                          Message
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {searchedContacts.length <= 0 && (
            <div className="w-full flex flex-col justify-center items-center mt-5 md:mt-5 duration-1000 transition-all">
              <Lottie
                animationData={animationData}
                loop={true}
                className="w-[120px] h-[120px]" // Keep size fixed
              />
              <div className="text-opacity-80 text-gray-800 dark:text-white flex flex-col gap-5 items-center mt-7 lg:text-2xl text-xl transition-all duration-300 text-center">
                <h3 className="poppins-medium">
                  Hi <span className="text-purple-500">! </span>
                  Search new
                  <span className="text-purple-500"> Contact. </span>
                </h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewDM;
