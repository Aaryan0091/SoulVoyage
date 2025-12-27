import { Timestamp } from "firebase/firestore";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

export interface FriendRequest {
  id: string;
  name: string;
  avatar?: string;
  fromUserId?: string;
  fromUserName?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdBy: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  conversationId: string;
  type?: "text" | "photo" | "poll";
  photoUrl?: string;
  poll?: Poll;
  deletedForEveryone?: boolean;
  deletedFor?: string[];
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
  };
  reactions?: {
    [emoji: string]: string[]; // emoji -> array of user IDs who reacted
  };
}

export interface Channel {
  id: string;
  name: string;
  type?: "text" | "voice";
  categoryId?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  channels?: Channel[];
  categories?: Category[];
  owner?: string;
  isPublic?: boolean;
  place?: string;
  description?: string;
  members?: number;
}

export interface ServerData {
  name: string;
  icon?: string;
  isPublic?: boolean;
  place?: string;
  description?: string;
}

export interface MessageContextMenu {
  messageId: string;
  x: number;
  y: number;
}
