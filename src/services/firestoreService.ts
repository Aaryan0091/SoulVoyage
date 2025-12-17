import { db, auth } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import type { Friend, FriendRequest, Message, Poll, PollOption, Server } from "@/types";

type AdditionalMessageData = {
  photoUrl?: string;
  poll?: Poll;
};

// Helper to generate consistent conversation IDs
export const getConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};

// Friend Operations
export const subscribeFriends = (
  userId: string,
  callback: (friends: Friend[]) => void
): (() => void) => {
  const userDocRef = doc(db, "users", userId);
  const friendsDocRef = collection(userDocRef, "friends");

  return onSnapshot(friendsDocRef, (snapshot) => {
    const friends = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      avatar: doc.data().avatar,
    }));
    callback(friends);
  });
};

export const subscribeFriendRequests = (
  userId: string,
  callback: (requests: FriendRequest[]) => void
): (() => void) => {
  const friendRequestsRef = collection(db, "friendRequests");
  const q = query(
    friendRequestsRef,
    where("toUserId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().fromUserName,
      fromUserId: doc.data().fromUserId,
      fromUserName: doc.data().fromUserName,
      avatar: doc.data().avatar,
    }));
    callback(requests);
  });
};

export const sendFriendRequest = async (
  fromUserId: string,
  fromUserName: string,
  toUserId: string
): Promise<void> => {
  const toUserDoc = await getDoc(doc(db, "users", toUserId));
  if (!toUserDoc.exists()) {
    throw new Error("User not found");
  }

  const toUserName = toUserDoc.data()?.name || "Unknown";

  await addDoc(collection(db, "friendRequests"), {
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    status: "pending",
    createdAt: Timestamp.now(),
  });
};

export const acceptFriendRequest = async (
  requestId: string,
  currentUserId: string,
  friendId: string,
  friendName: string
): Promise<void> => {
  const currentUserName = localStorage.getItem("currentProfileName") || "Unknown";

  await setDoc(doc(db, "users", currentUserId, "friends", friendId), {
    name: friendName,
    addedAt: Timestamp.now(),
  });

  await setDoc(doc(db, "users", friendId, "friends", currentUserId), {
    name: currentUserName,
    addedAt: Timestamp.now(),
  });

  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "accepted",
  });
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await deleteDoc(doc(db, "friendRequests", requestId));
};

// Message Operations
export const subscribeMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      senderId: doc.data().senderId,
      senderName: doc.data().senderName,
      content: doc.data().content,
      timestamp: doc.data().timestamp,
      conversationId: doc.data().conversationId,
      type: doc.data().type,
      photoUrl: doc.data().photoUrl,
      poll: doc.data().poll,
      deletedForEveryone: doc.data().deletedForEveryone,
      deletedFor: doc.data().deletedFor || [],
    }));
    callback(messages);
  });
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: "text" | "photo" | "poll" = "text",
  additionalData?: AdditionalMessageData
): Promise<void> => {
  const messageData = {
    senderId,
    senderName,
    content,
    timestamp: Date.now(),
    conversationId,
    type,
    createdAt: Timestamp.now(),
    deletedForEveryone: false,
    deletedFor: [],
    ...additionalData,
  };

  await addDoc(
    collection(db, `conversations/${conversationId}/messages`),
    messageData
  );
};

export const deleteMessageForMe = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
  const messageDoc = await getDoc(messageRef);

  if (messageDoc.exists()) {
    const deletedFor = messageDoc.data()?.deletedFor || [];
    if (!deletedFor.includes(userId)) {
      await updateDoc(messageRef, {
        deletedFor: [...deletedFor, userId],
      });
    }
  }
};

export const deleteMessageForEveryone = async (
  conversationId: string,
  messageId: string
): Promise<void> => {
  const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
  await updateDoc(messageRef, {
    deletedForEveryone: true,
  });
};

// Server Operations
export const subscribeServers = (
  callback: (servers: Server[]) => void
): (() => void) => {
  const serversRef = collection(db, "servers");

  return onSnapshot(serversRef, async (snapshot) => {
    const serversPromises = snapshot.docs.map(async (docSnap) => {
      const serverData = docSnap.data();
      const membersSnapshot = await getDocs(
        collection(db, `servers/${docSnap.id}/members`)
      );

      return {
        id: docSnap.id,
        name: serverData.name,
        icon: serverData.icon,
        owner: serverData.owner,
        isPublic: serverData.isPublic,
        place: serverData.place,
        description: serverData.description,
        members: membersSnapshot.size,
        channels: serverData.channels || [],
        categories: serverData.categories || [],
      };
    });

    const servers = await Promise.all(serversPromises);
    callback(servers);
  });
};

export const createServer = async (
  userId: string,
  serverData: {
    name: string;
    icon?: string;
    isPublic?: boolean;
    place?: string;
    description?: string;
  }
): Promise<Server> => {
  const serverId = `server_${Date.now()}`;

  const newServer: Server = {
    id: serverId,
    name: serverData.name,
    icon: serverData.icon,
    owner: userId,
    isPublic: serverData.isPublic ?? true,
    place: serverData.place || "",
    description: serverData.description || "",
    categories: [{ id: "cat_1", name: "TEXT MESSAGES" }],
    channels: [
      { id: "1", name: "general", type: "text", categoryId: "cat_1" },
      { id: "2", name: "announcements", type: "text", categoryId: "cat_1" },
    ],
  };

  await setDoc(doc(db, "servers", serverId), {
    name: newServer.name,
    icon: newServer.icon || "",
    owner: userId,
    isPublic: newServer.isPublic,
    place: newServer.place,
    description: newServer.description,
    categories: newServer.categories,
    channels: newServer.channels,
    createdAt: Timestamp.now(),
  });

  await setDoc(doc(db, `servers/${serverId}/members`, userId), {
    joinedAt: Timestamp.now(),
    role: "owner",
  });

  return newServer;
};

export const updateServer = async (
  serverId: string,
  updates: Partial<Server>
): Promise<void> => {
  await updateDoc(doc(db, "servers", serverId), updates);
};

export const deleteServer = async (serverId: string): Promise<void> => {
  console.log("Attempting to delete server:", serverId);
  console.log("Current auth state:", auth.currentUser);
  console.log("User UID:", auth.currentUser?.uid);

  try {
    await deleteDoc(doc(db, "servers", serverId));
    console.log("Server deleted successfully");
  } catch (error) {
    console.error("Delete operation failed:", error);
    throw error;
  }
};

// Vote on poll
export const voteOnPoll = async (
  conversationId: string,
  messageId: string,
  optionId: string,
  userId: string
): Promise<void> => {
  const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
  const messageDoc = await getDoc(messageRef);

  if (messageDoc.exists()) {
    const poll = messageDoc.data()?.poll as Poll | undefined;
    if (poll) {
      const updatedOptions: PollOption[] = poll.options.map((option: PollOption) => {
        if (option.id === optionId) {
          const votes = option.votes || [];
          if (!votes.includes(userId)) {
            return { ...option, votes: [...votes, userId] };
          }
        }
        return option;
      });

      await updateDoc(messageRef, {
        poll: { ...poll, options: updatedOptions },
      });
    }
  }
};
