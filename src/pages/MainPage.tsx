import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ServerCreationDialog } from "@/components/ServerCreationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Users, Plus, Send, MessageSquare, ChevronDown, UserCheck, Settings, Layers, Copy, FileText, Image, Video, PieChart, Trash2, CheckSquare, X, Globe, Smile, Search, Reply, LogOut, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc, updateDoc, deleteDoc, setDoc, getDocs, limit } from "firebase/firestore";
import { SERVER_DEFAULTS } from "@/utils/constants";
import Picker from "emoji-picker-react";

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface FriendRequest {
  id: string;
  name: string;
  avatar?: string;
  fromUserId?: string;
  fromUserName?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdBy: string;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  timeInterval: string;
  budget: string;
  numberOfPeople?: string;
  placesToVisit: string;
  categoryId: string;
  channelId: string;
  createdBy: string;
  createdAt: number;
  members: string[];
}

interface Message {
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
  tripId?: string;
  deletedFor?: string[];
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
  };
}

interface Server {
  id: string;
  name: string;
  icon?: string;
  channels?: Channel[];
  categories?: Category[];
}

interface Channel {
  id: string;
  name: string;
  type?: "text" | "voice";
  categoryId?: string;
  isHidden?: boolean;
  tripId?: string;
}

interface Category {
  id: string;
  name: string;
  isHidden?: boolean;
  tripId?: string;
}

const MainPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentProfile, user } = useAuth();
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showDirectMessages, setShowDirectMessages] = useState(true);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [showServerCreationDialog, setShowServerCreationDialog] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set(["1", "2"])
  );
  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false);
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
  const [channelName, setChannelName] = useState("");
  const [channelError, setChannelError] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [profileTag, setProfileTag] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [serverJoinRequests, setServerJoinRequests] = useState<any[]>([]);
  const [showFriendRequests, setShowFriendRequests] = useState(true);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasSoulMessages, setHasSoulMessages] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showEmojiSearchInterface, setShowEmojiSearchInterface] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [messageContextMenu, setMessageContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [showLeaveServerDialog, setShowLeaveServerDialog] = useState(false);
  const [showTransferOwnershipDialog, setShowTransferOwnershipDialog] = useState(false);
  const [serverMembers, setServerMembers] = useState<any[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
  const [isServerOwner, setIsServerOwner] = useState(false);
  const [showCreateTripDialog, setShowCreateTripDialog] = useState(false);
  const [showManageTripsDialog, setShowManageTripsDialog] = useState(false);
  const [tripDestination, setTripDestination] = useState("");
  const [tripTimeInterval, setTripTimeInterval] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripNumberOfPeople, setTripNumberOfPeople] = useState("");
  const [tripPlacesToVisit, setTripPlacesToVisit] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentProfileName = currentProfile?.name || "You";
  const currentProfileId = user?.uid || null; // Use Firebase Auth UID
  const customUserId = currentProfile?.userId || null; // Custom display ID for friend requests
  const wsRef = useRef<WebSocket | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const defaultServers: Server[] = [];

  const handleEmojiSearchSelect = (emojiObject: any) => {
    if (emojiObject && emojiObject.emoji) {
      setMessage(prev => prev + emojiObject.emoji);
    }
    // Don't close the picker after selecting an emoji
  };

  // Handle reply to message
  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setMessageContextMenu(null);
    // Focus on the input field
    setTimeout(() => {
      const inputElement = document.getElementById('message-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiSearchInterface(prev => !prev);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setShowEmojiSearchInterface(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowEmojiSearchInterface(false);
      }
    };

    if (showEmojiSearchInterface) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showEmojiSearchInterface]);

  const ensureServerHasCategories = (server: Server): Server => {
    if (!server.categories || server.categories.length === 0) {
      return {
        ...server,
        categories: [SERVER_DEFAULTS.defaultCategory],
        channels: server.channels?.map(c => ({ ...c, categoryId: c.categoryId || SERVER_DEFAULTS.defaultCategory.id })) || []
      };
    }
    return {
      ...server,
      channels: server.channels?.map(c => ({ ...c, categoryId: c.categoryId || "cat_1" })) || []
    };
  };

  const [servers, setServers] = useState<Server[]>([]);
  const [isServersLoading, setIsServersLoading] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for Soul bot messages
  useEffect(() => {
    if (!currentProfileId) return;

    const soulConversationId = `soul_${currentProfileId}`;
    const messagesRef = collection(db, "conversations", soulConversationId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const soulMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only count actual messages from Soul bot, not system messages or empty messages
        if (data.senderId === 'soul_bot' && data.content && data.content.trim()) {
          soulMessages.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            content: data.content,
            timestamp: data.timestamp,
            conversationId: soulConversationId,
            type: data.type,
          });
        }
      });

      // Update hasSoulMessages flag - only true if there are actual Soul messages
      setHasSoulMessages(soulMessages.length > 0);

      // Update messages state with Soul messages
      setMessages((prevMessages) => {
        // Remove old Soul messages and add new ones
        const filtered = prevMessages.filter(m => m.conversationId !== soulConversationId);
        return [...filtered, ...soulMessages];
      });

      console.log("Soul messages count:", soulMessages.length, "hasSoulMessages:", soulMessages.length > 0);
    });

    return () => unsubscribe();
  }, [currentProfileId]);

  // Initialize WebSocket connection (for sending/receiving messages in real-time)
  useEffect(() => {
    // Only attempt WebSocket connection if explicitly enabled
    if (!import.meta.env.VITE_WS_URL) {
      return; // Skip WebSocket if not explicitly configured
    }

    try {
      const wsUrl = import.meta.env.VITE_WS_URL;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        // WebSocket connected
      };

      wsRef.current.onmessage = (event) => {
        try {
          const receivedMessage = JSON.parse(event.data);
          
          // Add the message to the current conversation if it matches
          setMessages((prevMessages) => {
            // Check if message already exists (avoid duplicates)
            const isDuplicate = prevMessages.some(m => m.id === receivedMessage.id);
            if (isDuplicate) {
              return prevMessages;
            }
            return [...prevMessages, receivedMessage];
          });
          
          // Auto-scroll to the new message
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        // WebSocket disconnected
      };
    } catch (error) {
      // WebSocket connection error
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Helper function to load friend avatars in background with batch processing
  const loadFriendAvatars = async (friends: any[]) => {
    if (!currentProfileId) return;

    const avatarMap = new Map<string, string>();

    // Process friends in batches of 10 to avoid overwhelming Firestore
    const batchSize = 10;
    for (let i = 0; i < friends.length; i += batchSize) {
      const batch = friends.slice(i, i + batchSize);

      const avatarPromises = batch.map(async (friend) => {
        try {
          const friendDocRef = doc(db, "users", friend.id);
          const friendDocSnap = await getDoc(friendDocRef);
          if (friendDocSnap.exists()) {
            const data = friendDocSnap.data();
            if (data.avatarUrl) {
              avatarMap.set(friend.id, data.avatarUrl);
            }
          }
        } catch (error) {
          console.error(`Error loading avatar for ${friend.id}:`, error);
        }
      });

      await Promise.all(avatarPromises);

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < friends.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Only update cache if we actually loaded some avatars
    if (avatarMap.size > 0) {
      // Save avatar cache
      localStorage.setItem(`friends_avatars_${currentProfileId}`, JSON.stringify(Array.from(avatarMap.entries())));

      // Update friends state with avatars
      setFriends(prev =>
        prev.map(friend => ({
          ...friend,
          avatar: avatarMap.get(friend.id) || friend.avatar || ""
        }))
      );
    }
  };

  // Load friends from Firestore with optimized caching
  useEffect(() => {
    if (!currentProfileId) {
      setIsFriendsLoading(false);
      return;
    }

    // Track if component is mounted
    let isMounted = true;

    // Load from cache first - more comprehensive caching
    const cachedData = localStorage.getItem(`friends_${currentProfileId}`);
    const avatarCache = localStorage.getItem(`friends_avatars_${currentProfileId}`);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // Validate cached data structure
        if (Array.isArray(parsed)) {
          if (isMounted) {
            setFriends(parsed);
            setIsFriendsLoading(false);
            console.log("Loaded friends from cache:", parsed.length);
          }
        }
      } catch (e) {
        console.error("Error parsing cached friends:", e);
      }
    }

    // Set a timeout to prevent indefinite loading - further reduced
    const loadingTimeout = setTimeout(() => {
      console.log("Friends loading timeout - forcing completion");
      if (isMounted) {
        setIsFriendsLoading(false);
      }
    }, 1000); // Reduced to 1 second

    try {
      // Check if friends are stored as subcollections (current approach)
      const userDocRef = doc(db, "users", currentProfileId);
      const friendsSubRef = collection(userDocRef, "friends");

      const unsubscribeFriends = onSnapshot(friendsSubRef, async (snapshot) => {
        if (!isMounted) return;

        if (!snapshot.empty) {
          const firebaseFriends = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || "Unknown",
          }));

          // Parse avatar cache once
          let avatarMap = new Map();
          if (avatarCache) {
            try {
              avatarMap = new Map(JSON.parse(avatarCache));
            } catch (e) {
              console.error("Error parsing avatar cache:", e);
            }
          }

          // Apply cached avatars immediately
          const friendsWithProfiles = firebaseFriends.map(friend => ({
            ...friend,
            avatar: avatarMap.get(friend.id) || "",
          }));

          // Cache the results
          localStorage.setItem(`friends_${currentProfileId}`, JSON.stringify(friendsWithProfiles));

          setFriends(friendsWithProfiles);
          clearTimeout(loadingTimeout);
          setIsFriendsLoading(false);

          // Lazy load avatars in background only if needed
          const needsAvatarUpdate = firebaseFriends.some(friend => !avatarMap.has(friend.id));
          if (needsAvatarUpdate) {
            // Use requestIdleCallback for non-blocking loading
            const loadAvatars = () => {
              if (!isMounted) return;
              loadFriendAvatars(firebaseFriends);
            };

            if (window.requestIdleCallback) {
              window.requestIdleCallback(loadAvatars, { timeout: 2000 });
            } else {
              setTimeout(loadAvatars, 100);
            }
          }
        } else {
          // No friends
          setFriends([]);
          clearTimeout(loadingTimeout);
          setIsFriendsLoading(false);
        }
      }, (error) => {
        // Only log error if we haven't already loaded from cache
        if (!cachedData) {
          console.error("Error loading friends from Firestore:", error);
        }
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setIsFriendsLoading(false);
        }
      });

      return () => {
        isMounted = false;
        unsubscribeFriends();
        clearTimeout(loadingTimeout);
      };
    } catch (error) {
      console.error("Error setting up friends listener:", error);
      if (isMounted) {
        setIsFriendsLoading(false);
        clearTimeout(loadingTimeout);
      }
    }
  }, [currentProfileId]);

  // Load friend requests from Firestore in real-time
  useEffect(() => {
    if (!currentProfileId) {
      return;
    }

    try {
      const friendRequestsRef = collection(db, "friendRequests");
      const q = query(
        friendRequestsRef,
        where("toUserId", "==", currentProfileId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeFriendRequests = onSnapshot(q, (snapshot) => {
        const firebaseFriendRequests = snapshot.docs.map((doc) => {
          return {
            id: doc.id,
            name: doc.data().fromUserName,
            fromUserId: doc.data().fromUserId,
            fromUserName: doc.data().fromUserName,
          };
        });
        setFriendRequests(firebaseFriendRequests);
      });

      return () => unsubscribeFriendRequests();
    } catch (error) {
      console.error("Error setting up friend requests listener:", error);
    }
  }, [currentProfileId]);

  // Load server join requests for all owned servers
  useEffect(() => {
    if (!currentProfileId) {
      console.log("No current profile ID, skipping server requests setup");
      setServerJoinRequests([]);
      return;
    }

    console.log("Setting up server requests listener for user:", currentProfileId);

    // Use cached owned servers if available
    const cachedServers = localStorage.getItem(`servers_${currentProfileId}`);
    if (cachedServers) {
      const parsed = JSON.parse(cachedServers);
      const ownedServerIds = parsed
        .filter(s => s.owner === currentProfileId)
        .map(s => s.id);

      console.log("Using cached owned servers:", ownedServerIds);

      if (ownedServerIds.length > 0) {
        // Set up listeners for cached servers immediately
        console.log("Setting up immediate listeners for cached servers");
        const unsubscribers: (() => void)[] = [];

        for (const serverId of ownedServerIds) {
          const requestsRef = collection(db, "serverJoinRequests");
          const q = query(
            requestsRef,
            where("serverId", "==", serverId),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            setServerJoinRequests(prev => {
              const filtered = prev.filter(r => r.serverId !== serverId);
              return [...filtered, ...requests];
            });
          });

          unsubscribers.push(unsubscribe);
        }

        // Store cleanup function
        const cleanup = () => {
          unsubscribers.forEach(unsub => unsub());
        };

        // Store cleanup for later
        (window as any).serverRequestsCleanup = cleanup;
      } else {
        setServerJoinRequests([]);
      }
    }

    // Also fetch from Firestore in background to update cache
    const setupListener = async () => {
      try {
        const serversRef = collection(db, "servers");
        const serversSnapshot = await getDocs(serversRef);

        const ownedServerIds = serversSnapshot.docs
          .filter(doc => doc.data().owner === currentProfileId)
          .map(doc => doc.id);

        console.log("User owns servers:", ownedServerIds);

        if (ownedServerIds.length === 0) {
          console.log("User doesn't own any servers");
          setServerJoinRequests([]);
          return;
        }

        // Set up listeners for each owned server
        const unsubscribers: (() => void)[] = [];

        for (const serverId of ownedServerIds) {
          console.log(`Setting up listener for server: ${serverId}`);
          const requestsRef = collection(db, "serverJoinRequests");
          const q = query(
            requestsRef,
            where("serverId", "==", serverId),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            console.log(`Found ${requests.length} requests for server ${serverId}:`, requests);

            // Update state with all requests from this server
            setServerJoinRequests(prev => {
              // Remove old requests from this server and add new ones
              const filtered = prev.filter(r => r.serverId !== serverId);
              const updated = [...filtered, ...requests];
              console.log("Updated all server requests:", updated);
              return updated;
            });
          });

          unsubscribers.push(unsubscribe);
        }

        return () => {
          console.log("Cleaning up server request listeners");
          unsubscribers.forEach(unsub => unsub());
        };
      } catch (error) {
        console.error("Error setting up join requests listener:", error);
        setServerJoinRequests([]);
      }
    };

    let unsubscribe: (() => void) | undefined;

    setupListener().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if ((window as any).serverRequestsCleanup) {
        (window as any).serverRequestsCleanup();
      }
    };
  }, [currentProfileId, user]);

  // Generate consistent conversation ID
  const getConversationId = (otherUserId: string | undefined) => {
    if (!otherUserId || !currentProfileId) return "";
    // Create a sorted, consistent ID that both users will use
    const convId = [currentProfileId, otherUserId].sort().join("_");
    return convId;
  };

  // In-memory cache for messages
  const messagesCache = useRef<Map<string, Message[]>>(new Map());

  // Load messages from Firestore for current conversation with caching
  useEffect(() => {
    let conversationId = "";

    if (showDirectMessages && selectedFriend) {
      // Direct message: dm_{uid1}_{uid2}
      conversationId = `dm_${getConversationId(selectedFriend.id)}`;
    } else if (!showDirectMessages && selectedChannel && selectedServer) {
      // Server channel message: server_{serverId}_channel_{channelId}
      conversationId = `server_${selectedServer}_channel_${selectedChannel}`;
    }

        if (!conversationId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setMessages([]);
      return;
    }

    const setupConversationListener = async () => {
      try {
        // Check cache first
        if (messagesCache.current.has(conversationId)) {
          const cachedMessages = messagesCache.current.get(conversationId)!;
          setMessages(cachedMessages);
          console.log("Loaded", cachedMessages.length, "messages from cache for", conversationId);
        }

        // Also check localStorage
        const localStorageKey = `messages_${conversationId}`;
        const cachedMessages = localStorage.getItem(localStorageKey);
        if (cachedMessages && !messagesCache.current.has(conversationId)) {
          try {
            const parsed = JSON.parse(cachedMessages);
            messagesCache.current.set(conversationId, parsed);
            setMessages(parsed);
            console.log("Loaded", parsed.length, "messages from localStorage for", conversationId);
          } catch (e) {
            console.error("Error parsing cached messages:", e);
          }
        }

        // Always ensure the conversation document exists first
        const conversationRef = doc(db, "conversations", conversationId);
        const conversationDoc = await getDoc(conversationRef);

        if (!conversationDoc.exists()) {
          // Create the conversation document if it doesn't exist
          await setDoc(conversationRef, {
            id: conversationId,
            type: showDirectMessages ? "direct_message" : "server_channel",
            serverId: showDirectMessages ? null : selectedServer,
            channelId: showDirectMessages ? null : selectedChannel,
            participants: showDirectMessages ? [currentProfileId, selectedFriend?.id] : null,
            createdAt: Date.now(),
          });
        }

        // Set up the messages listener with limit for initial load
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc"), limit(50));

        unsubscribeRef.current = onSnapshot(q, (snapshot) => {
          const firestoreMessages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              senderId: data.senderId,
              senderName: data.senderName,
              content: data.content,
              timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp,
              conversationId: conversationId, // Ensure conversationId is set
              type: data.type || "text",
              photoUrl: data.photoUrl,
              poll: data.poll,
              deletedForEveryone: data.deletedForEveryone,
              deletedFor: data.deletedFor,
              replyTo: data.replyTo,
              tripId: data.tripId,
            };
          }).reverse(); // Reverse to show oldest first

          // Update cache
          messagesCache.current.set(conversationId, firestoreMessages);

          // Update localStorage (keep only last 50 messages to save space)
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(firestoreMessages));
          } catch (e) {
            console.error("Error saving messages to localStorage:", e);
          }

          console.log("Setting messages state:", firestoreMessages.length, "messages for", conversationId);
          setMessages(firestoreMessages);
        }, (error) => {
          console.error("Error in messages listener:", error);
        });
      } catch (error) {
        console.error("Error setting up Firestore listener:", error);
      }
    };

    setupConversationListener();

    return () => {
      console.log("Cleaning up messages listener");
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedFriend?.id, selectedChannel, showDirectMessages, selectedServer, currentProfileId]);

  // Load trips from Firestore for current server
  useEffect(() => {
    if (!selectedServer) {
      setTrips([]);
      return;
    }

    try {
      const tripsRef = collection(db, "trips");
      const q = query(
        tripsRef,
        where("serverId", "==", selectedServer)
      );

      const unsubscribeTrips = onSnapshot(q, (snapshot) => {
        const firebaseTrips = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Trip[];
        setTrips(firebaseTrips);
      });

      return () => unsubscribeTrips();
    } catch (error) {
      console.error("Error loading trips from Firestore:", error);
    }
  }, [selectedServer]);

  // Load servers from Firestore efficiently
  useEffect(() => {
    if (!currentProfileId) {
      console.log("No currentProfileId, skipping server load");
      setServers([]);
      setIsServersLoading(false);
      return;
    }

    console.log("Loading servers for user:", currentProfileId);
    setIsServersLoading(true);

    const loadServers = async () => {
      try {
        // First load from cache/localStorage if available
        const cachedServers = localStorage.getItem(`servers_${currentProfileId}`);
        if (cachedServers) {
          const parsed = JSON.parse(cachedServers);
          const withCategories = parsed.map(ensureServerHasCategories);
          setServers(withCategories);
          setIsServersLoading(false);
        }

        // Then fetch from Firestore
        const serversRef = collection(db, "servers");
        const snapshot = await getDocs(serversRef);

        console.log("Servers snapshot:", snapshot.docs.length, "total servers in database");

        // Process servers in parallel for better performance
        const serverPromises = snapshot.docs.map(async (docSnap) => {
          const serverData = docSnap.data();

          // Optimized member check - get single document
          const memberRef = doc(db, `servers/${docSnap.id}/members`, currentProfileId);
          const memberSnapshot = await getDoc(memberRef);
          const isMember = memberSnapshot.exists();

          if (isMember) {
            return {
              id: docSnap.id,
              name: serverData.name,
              icon: serverData.icon,
              isPublic: serverData.isPublic,
              channels: serverData.channels || [SERVER_DEFAULTS.defaultChannel],
              categories: serverData.categories || [SERVER_DEFAULTS.defaultCategory],
            };
          }
          return null;
        });

        const serverResults = await Promise.all(serverPromises);
        const memberServers = serverResults.filter(s => s !== null) as Server[];
        const withCategories = memberServers.map(ensureServerHasCategories);

        // Cache the results
        localStorage.setItem(`servers_${currentProfileId}`, JSON.stringify(memberServers));

        console.log("Loaded servers user is member of:", withCategories.length, "servers");
        setServers(withCategories);
        setIsServersLoading(false);
      } catch (error) {
        console.error("Error loading servers:", error);
        setIsServersLoading(false);
      }
    };

    // Initial load
    loadServers();

    // Only reload when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadServers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentProfileId]);

  // Restore last selected server/channel
  useEffect(() => {
    // On initial load, always start with DMs selected and no server selected
    setShowDirectMessages(true);
    setSelectedServer(null);
    setSelectedChannel(null);

    // Preload frequently accessed data in the background
    if (currentProfileId) {
      const preloadData = async () => {
        // Preload first server's data if available
        const cachedServers = localStorage.getItem(`servers_${currentProfileId}`);
        if (cachedServers) {
          try {
            const servers = JSON.parse(cachedServers);
            if (servers.length > 0) {
              // Preload first server channels for instant access when switching
              const firstServer = servers[0];
              const serverRef = doc(db, "servers", firstServer.id);
              await getDoc(serverRef);
            }
          } catch (e) {
            console.error("Error preloading server data:", e);
          }
        }
      };

      // Use requestIdleCallback for non-critical preloading
      if (window.requestIdleCallback) {
        window.requestIdleCallback(preloadData, { timeout: 3000 });
      } else {
        setTimeout(preloadData, 2000);
      }
    }
  }, [currentProfileId]);

  // Save selected server/channel to localStorage
  useEffect(() => {
    if (selectedServer) {
      localStorage.setItem(`lastServer_${currentProfileId}`, selectedServer);
    }
    if (selectedChannel) {
      localStorage.setItem(`lastChannel_${currentProfileId}`, selectedChannel);
    }
  }, [selectedServer, selectedChannel, currentProfileId]);

  useEffect(() => {
    if (searchParams.get("settingsSaved") === "true") {
      toast({
        title: "Success",
        description: "Server settings saved successfully",
      });
      window.history.replaceState({}, document.title, "/main");
    }
  }, [searchParams, toast]);

  const handleServerClick = async (serverId: string) => {
    setSelectedServer(serverId);
    setShowDirectMessages(false);
    setSelectedChannel(servers.find(s => s.id === serverId)?.channels?.[0]?.id || null);

    // Check if current user is the server owner
    try {
      const serverDoc = await getDoc(doc(db, "servers", serverId));
      if (serverDoc.exists()) {
        const serverData = serverDoc.data();
        setIsServerOwner(serverData.owner === currentProfileId);
      }
    } catch (error) {
      console.error("Error checking server ownership:", error);
      setIsServerOwner(false);
    }
  };

  const handleCreateServer = async (serverData: { name: string; icon?: string; isPublic?: boolean }) => {
    if (!currentProfileId) {
      toast({
        title: "Error",
        description: "You must be logged in to create a server",
        variant: "destructive",
      });
      return;
    }

    try {
      const serverId = `server_${Date.now()}`;
      const userId = currentProfileId;

      console.log("Creating server:", serverData.name, "isPublic:", serverData.isPublic);

      // Prepare all data for parallel writes
      const serverDocPromise = setDoc(doc(db, "servers", serverId), {
        name: serverData.name,
        icon: serverData.icon || "",
        isPublic: serverData.isPublic !== undefined ? serverData.isPublic : true,
        owner: userId,
        place: "Location",
        description: "",
        categories: [SERVER_DEFAULTS.defaultCategory],
        channels: [SERVER_DEFAULTS.defaultChannel],
        createdAt: Timestamp.now(),
      });

      const memberDocPromise = setDoc(doc(db, `servers/${serverId}/members`, userId), {
        joinedAt: Timestamp.now(),
        role: "owner",
      });

      // Execute both writes in parallel for faster creation
      await Promise.all([serverDocPromise, memberDocPromise]);

      console.log("Server and member created in Firestore");

      // Update local state immediately for better UX
      const newServer = {
        id: serverId,
        name: serverData.name,
        icon: serverData.icon,
        channels: [SERVER_DEFAULTS.defaultChannel],
        categories: [SERVER_DEFAULTS.defaultCategory],
      };

      const newServerWithCategories = ensureServerHasCategories(newServer);
      setServers(prev => [...prev, newServerWithCategories]);

      // Select the new server immediately
      setExpandedServers(new Set([...expandedServers, serverId]));
      handleServerClick(serverId);

      toast({
        title: "Success",
        description: `Server "${serverData.name}" created successfully!`,
      });
    } catch (error) {
      console.error("Error creating server:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create server";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const toggleChannelsExpanded = (serverId: string) => {
    const newExpandedServers = new Set(expandedServers);
    if (newExpandedServers.has(serverId)) {
      newExpandedServers.delete(serverId);
    } else {
      newExpandedServers.add(serverId);
    }
    setExpandedServers(newExpandedServers);
  };

  const isChannelsExpanded = selectedServer ? expandedServers.has(selectedServer) : false;

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
      setChannelError("Please enter a channel name");
      return;
    }

    if (!selectedServer) return;

    try {
      const newChannel: Channel = {
        id: `channel_${Date.now()}`,
        name: channelName.toLowerCase().replace(/\s+/g, "-"),
        type: channelType,
        categoryId: selectedCategoryId || "cat_1",
      };

      // Get current server data
      const serverRef = doc(db, "servers", selectedServer);
      const serverDoc = await getDoc(serverRef);
      
      if (serverDoc.exists()) {
        const currentChannels = serverDoc.data().channels || [];
        const updatedChannels = [...currentChannels, newChannel];
        
        // Update Firestore
        await updateDoc(serverRef, {
          channels: updatedChannels,
        });

        // Firestore listener will update the UI automatically
        setChannelName("");
        setChannelType("text");
        setChannelError("");
        setShowCreateChannelDialog(false);
        setSelectedCategoryId(null);
        
        toast({
          title: "Success",
          description: `${channelType === "text" ? "Text" : "Voice"} channel "${newChannel.name}" created!`,
        });
      }
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setIsCreatingCategory(false);
      setNewCategoryName("");
      return;
    }

    if (!selectedServer) return;

    try {
      const newCategory: Category = {
        id: `cat_${Date.now()}`,
        name: newCategoryName,
      };

      // Get current server data
      const serverRef = doc(db, "servers", selectedServer);
      const serverDoc = await getDoc(serverRef);
      
      if (serverDoc.exists()) {
        const currentCategories = serverDoc.data().categories || [];
        const updatedCategories = [...currentCategories, newCategory];
        
        // Update Firestore
        await updateDoc(serverRef, {
          categories: updatedCategories,
        });

        // Firestore listener will update the UI automatically
        setNewCategoryName("");
        setIsCreatingCategory(false);
        
        toast({
          title: "Success",
          description: `Category "${newCategory.name}" created!`,
        });
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId);
  };

  const currentServer = servers.find(s => s.id === selectedServer);
  const currentChannel = currentServer?.channels?.find(c => c.id === selectedChannel);
  const currentChannelTrip = currentChannel?.tripId ? trips.find(t => t.id === currentChannel.tripId) : null;

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const getOrCreateInviteLink = async () => {
    if (!currentServer || !selectedServer) return "";

    try {
      // Check if server already has an invite code
      const serverDoc = await getDoc(doc(db, "servers", selectedServer));
      if (serverDoc.exists()) {
        const serverData = serverDoc.data();
        
        // If invite code exists, use it
        if (serverData.inviteCode) {
          return `${window.location.origin}/invite/${serverData.inviteCode}`;
        }
        
        // Generate new invite code and save to Firestore
        const newInviteCode = generateInviteCode();
        await updateDoc(doc(db, "servers", selectedServer), {
          inviteCode: newInviteCode,
        });
        
        return `${window.location.origin}/invite/${newInviteCode}`;
      }
    } catch (error) {
      console.error("Error getting/creating invite link:", error);
    }
    
    return "";
  };

  const [inviteLink, setInviteLink] = useState("");

  // Load invite link when dialog opens
  useEffect(() => {
    if (showInviteDialog && currentServer) {
      getOrCreateInviteLink().then(link => setInviteLink(link));
    }
  }, [showInviteDialog, currentServer]);

  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        toast({
          title: "Copied!",
          description: "Invite link copied to clipboard",
        });
      } else {
        // Fallback for mobile/older browsers
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        
        // Make textarea visible but off-screen for iOS
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.style.opacity = "0";
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        
        // iOS specific selection
        if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          textArea.setSelectionRange(0, 999999);
        } else {
          textArea.select();
        }
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          toast({
            title: "Copied!",
            description: "Invite link copied to clipboard",
          });
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Could not copy automatically",
        description: "Please long-press the link and select 'Copy'",
        variant: "destructive",
      });
    }
  };

  const handleOpenServerSettings = () => {
    if (selectedServer) {
      navigate(`/server/${selectedServer}/settings`);
    }
  };

  const handleLeaveServer = async () => {
    if (!selectedServer || !currentProfileId) return;

    // Fetch server members to check if owner needs to transfer ownership
    if (isServerOwner) {
      try {
        const membersSnapshot = await getDocs(collection(db, `servers/${selectedServer}/members`));
        const membersList = membersSnapshot.docs
          .filter(doc => doc.id !== currentProfileId); // Exclude current user

        // Fetch user profiles for each member
        const membersWithData = await Promise.all(
          membersList.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const userDoc = await getDoc(doc(db, "users", memberDoc.id));

            console.log("Fetching user data for:", memberDoc.id);
            console.log("User doc exists:", userDoc.exists());
            if (userDoc.exists()) {
              console.log("User data:", userDoc.data());
            }

            return {
              id: memberDoc.id,
              ...memberData,
              name: userDoc.exists() ? userDoc.data().name || "Unknown User" : "Unknown User",
              avatar: userDoc.exists() ? userDoc.data().avatarUrl || "" : ""
            };
          })
        );

        console.log("Fetched server members with data:", membersWithData);
        setServerMembers(membersWithData);

        if (membersList.length > 0) {
          // Has other members - need to transfer ownership
          setShowTransferOwnershipDialog(true);
        } else {
          // No other members - can leave directly or offer to delete server
          setShowLeaveServerDialog(true);
        }
      } catch (error) {
        console.error("Error fetching server members:", error);
        toast({
          title: "Error",
          description: "Failed to fetch server members",
          variant: "destructive",
        });
      }
    } else {
      // Not owner - can leave directly
      setShowLeaveServerDialog(true);
    }
  };

  const confirmLeaveServer = async () => {
    if (!selectedServer || !currentProfileId) return;

    try {
      // Remove user from server members collection
      await deleteDoc(doc(db, `servers/${selectedServer}/members`, currentProfileId));

      toast({
        title: "Left Server",
        description: `You have successfully left ${currentServer?.name}`,
      });

      // Remove server from local state immediately
      setServers(prev => prev.filter(s => s.id !== selectedServer));

      // Reset selection to direct messages
      setSelectedServer(null);
      setSelectedChannel(null);
      setShowDirectMessages(true);
      setShowLeaveServerDialog(false);

      // Clean up related state
      setServerMembers([]);
      setIsServerOwner(false);
    } catch (error) {
      console.error("Error leaving server:", error);
      toast({
        title: "Error",
        description: "Failed to leave server",
        variant: "destructive",
      });
    }
  };

  const transferOwnershipAndLeave = async () => {
    if (!selectedServer || !currentProfileId || !selectedNewOwner) return;

    try {
      // Update server ownership
      await updateDoc(doc(db, "servers", selectedServer), {
        owner: selectedNewOwner
      });

      // Update new owner's role
      await updateDoc(doc(db, `servers/${selectedServer}/members`, selectedNewOwner), {
        role: "owner"
      });

      // Remove current owner from server
      await deleteDoc(doc(db, `servers/${selectedServer}/members`, currentProfileId));

      toast({
        title: "Ownership Transferred",
        description: `Server ownership has been transferred and you have left ${currentServer?.name}`,
      });

      // Remove server from local state immediately
      setServers(prev => prev.filter(s => s.id !== selectedServer));

      // Reset selection
      setSelectedServer(null);
      setSelectedChannel(null);
      setShowDirectMessages(true);
      setShowTransferOwnershipDialog(false);
      setSelectedNewOwner(null);

      // Clean up related state
      setServerMembers([]);
      setIsServerOwner(false);
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast({
        title: "Error",
        description: "Failed to transfer ownership",
        variant: "destructive",
      });
    }
  };

  const deleteServerAndLeave = async () => {
    if (!selectedServer || !currentProfileId || !auth.currentUser) {
      console.error("Missing required data for server deletion:", { selectedServer, currentProfileId, hasAuth: !!auth.currentUser });
      return;
    }

    try {
      console.log("Attempting to delete server:", selectedServer);
      console.log("Current user:", auth.currentUser.uid);

      // First check if user is the owner
      const serverDoc = await getDoc(doc(db, "servers", selectedServer));
      if (!serverDoc.exists()) {
        console.error("Server document not found");
        return;
      }

      const serverData = serverDoc.data();
      console.log("Server owner:", serverData.owner);
      console.log("Is owner?:", serverData.owner === auth.currentUser.uid);

      if (serverData.owner !== auth.currentUser.uid) {
        console.error("User is not the server owner");
        toast({
          title: "Error",
          description: "Only the server owner can delete the server",
          variant: "destructive",
        });
        return;
      }

      // Delete all members first
      console.log("Deleting server members...");
      const membersSnapshot = await getDocs(collection(db, `servers/${selectedServer}/members`));
      for (const memberDoc of membersSnapshot.docs) {
        await deleteDoc(memberDoc.ref);
      }

      // Delete all server join requests for this server
      console.log("Deleting server join requests...");
      const joinRequestsQuery = query(
        collection(db, "serverJoinRequests"),
        where("serverId", "==", selectedServer)
      );
      const joinRequestsSnapshot = await getDocs(joinRequestsQuery);
      for (const reqDoc of joinRequestsSnapshot.docs) {
        await deleteDoc(reqDoc.ref);
      }

      // Delete all trips associated with this server
      console.log("Deleting server trips...");
      const tripsQuery = query(
        collection(db, "trips"),
        where("serverId", "==", selectedServer)
      );
      const tripsSnapshot = await getDocs(tripsQuery);
      for (const tripDoc of tripsSnapshot.docs) {
        const tripData = tripDoc.data();

        // Delete trip conversation if exists
        if (tripData.channelId) {
          try {
            await deleteDoc(doc(db, "conversations", `server_${selectedServer}_channel_${tripData.channelId}`));
          } catch (error) {
            console.log("No conversation to delete for trip channel:", tripData.channelId);
          }
        }

        // Delete the trip document
        await deleteDoc(tripDoc.ref);
      }

      // Delete the server document
      console.log("Deleting server document...");
      await deleteDoc(doc(db, "servers", selectedServer));
      console.log("Server deleted successfully");

      // Remove server from local state immediately
      setServers(prev => prev.filter(s => s.id !== selectedServer));

      toast({
        title: "Server Deleted",
        description: `${currentServer?.name} has been deleted successfully`,
      });

      // Reset selection
      setSelectedServer(null);
      setSelectedChannel(null);
      setShowDirectMessages(true);
      setShowLeaveServerDialog(false);

      // Clean up any related state
      setServerMembers([]);
      setIsServerOwner(false);
    } catch (error) {
      console.error("Error deleting server:", error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if user can see a channel
  const canUserSeeChannel = (channel: Channel) => {
    // Always show non-hidden channels
    if (!channel.isHidden) return true;

    // Server owners can see all channels
    if (isServerOwner) return true;

    // Check if user is a member of the trip
    if (channel.tripId) {
      const trip = trips.find(t => t.id === channel.tripId);
      return trip?.members.includes(currentProfileId || "") || trip?.createdBy === currentProfileId;
    }

    return false;
  };

  // Helper function to check if user can create channels in a category
  const canUserCreateChannelInCategory = (category: Category) => {
    // Server owners can create channels anywhere
    if (isServerOwner) return true;

    // Check if user created this trip category
    if (category.tripId) {
      const trip = trips.find(t => t.id === category.tripId);
      return trip?.createdBy === currentProfileId;
    }

    return false;
  };

  // Helper function to check if user can delete a trip
  const canUserDeleteTrip = (trip: Trip) => {
    // Server owners can delete any trip
    if (isServerOwner) return true;

    // Trip creators can delete their own trips
    return trip.createdBy === currentProfileId;
  };

  // Helper function to check if user can see a category
  const canUserSeeCategory = (category: Category) => {
    // Always show non-hidden categories
    if (!category.isHidden) return true;

    // Server owners can see all categories
    if (isServerOwner) return true;

    // Check if user is a member of the trip
    if (category.tripId) {
      const trip = trips.find(t => t.id === category.tripId);
      return trip?.members.includes(currentProfileId || "") || trip?.createdBy === currentProfileId;
    }

    return false;
  };

  const handleCreateTrip = async () => {
    if (!selectedServer || !currentProfileId) return;

    if (!tripDestination.trim() || !tripTimeInterval.trim() || !tripBudget.trim() || !tripPlacesToVisit.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const tripId = `trip_${Date.now()}`;
      const categoryId = `cat_${Date.now()}`;
      const channelId = `channel_${Date.now()}`;
      const tripName = `Trip to ${tripDestination}`;

      // Create hidden category
      const newCategory: Category = {
        id: categoryId,
        name: tripName,
        isHidden: true,
        tripId,
      };

      // Create hidden channel
      const newChannel: Channel = {
        id: channelId,
        name: "trip-planning",
        type: "text",
        categoryId,
        isHidden: true,
        tripId,
      };

      // Create trip object
      const newTrip: Trip = {
        id: tripId,
        name: tripName,
        destination: tripDestination,
        timeInterval: tripTimeInterval,
        budget: tripBudget,
        numberOfPeople: tripNumberOfPeople || undefined,
        placesToVisit: tripPlacesToVisit,
        categoryId,
        channelId,
        createdBy: currentProfileId,
        createdAt: Date.now(),
        members: [currentProfileId],
      };

      // Get current server data
      const serverRef = doc(db, "servers", selectedServer);
      const serverDoc = await getDoc(serverRef);

      if (serverDoc.exists()) {
        const currentCategories = serverDoc.data().categories || [];
        const currentChannels = serverDoc.data().channels || [];

        // Update server with new category and channel
        await updateDoc(serverRef, {
          categories: [...currentCategories, newCategory],
          channels: [...currentChannels, newChannel],
        });

        // Save trip data to a separate collection
        await setDoc(doc(db, "trips", tripId), {
          ...newTrip,
          serverId: selectedServer,
        });

        // Reset form
        setTripDestination("");
        setTripTimeInterval("");
        setTripBudget("");
        setTripNumberOfPeople("");
        setTripPlacesToVisit("");
        setShowCreateTripDialog(false);

        toast({
          title: "Trip Created",
          description: `${tripName} has been created successfully!`,
        });

        // Send messages with a small delay to ensure Firestore listeners have updated
        setTimeout(async () => {
          // Send detailed trip info to the trip channel
          await sendTripInfoToChannel(newTrip);
          // Send announcement to general channel with join button
          await sendTripAnnouncement(tripName, tripId, tripDestination);
          // Auto-select the trip planning channel for the creator
          setSelectedChannel(channelId);
        }, 500);
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      toast({
        title: "Error",
        description: "Failed to create trip",
        variant: "destructive",
      });
    }
  };

  // Function to send trip info to the trip channel
  const sendTripInfoToChannel = async (trip: Trip) => {
    if (!selectedServer || !currentProfileId) return;

    try {
      const conversationId = `server_${selectedServer}_channel_${trip.channelId}`;

      // Create detailed trip info message
      const tripInfoMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId,
        senderId: currentProfileId,
        senderName: currentProfile?.name || "Unknown",
        content: `## 🌟 ${trip.name} 🌟\n\n**Destination:** ${trip.destination}\n**Duration:** ${trip.timeInterval}\n**Budget:** ${trip.budget}\n${trip.numberOfPeople ? `**Group Size:** ${trip.numberOfPeople}\n` : ''}**Places to Visit:** ${trip.placesToVisit}\n\n**Created by:** ${trip.createdBy === currentProfileId ? 'You' : 'Trip Creator'}\n\nThis is your private trip planning channel. Start discussing your travel plans here!`,
        timestamp: Date.now(),
        type: "text",
      };

      // Save the trip info message
      await setDoc(doc(db, "conversations", conversationId), {
        id: conversationId,
        type: "server_channel",
        serverId: selectedServer,
        channelId: trip.channelId,
        createdAt: Date.now(),
      });

      await setDoc(doc(db, "conversations", conversationId, "messages", tripInfoMessage.id), tripInfoMessage);
    } catch (error) {
      console.error("Error sending trip info to channel:", error);
    }
  };

  // Function to send trip announcement to general channel
  const sendTripAnnouncement = async (tripName: string, tripId: string, destination: string) => {
    if (!selectedServer || !currentProfileId) return;

    try {
      // Get the latest server data from Firestore
      const serverRef = doc(db, "servers", selectedServer);
      const serverDoc = await getDoc(serverRef);

      if (!serverDoc.exists()) return;

      const serverData = serverDoc.data();
      // Find the general channel (first non-hidden channel)
      const generalChannel = serverData.channels?.find((c: any) => !c.isHidden);
      if (!generalChannel) return;

      const conversationId = `server_${selectedServer}_channel_${generalChannel.id}`;

      // Create announcement message
      const announcementMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId,
        senderId: currentProfileId,
        senderName: currentProfile?.name || "Unknown",
        content: `🎉 New trip created: **${tripName}** to ${destination}!\n\nClick the button below to join this amazing adventure!`,
        timestamp: Date.now(),
        type: "text",
        tripId: tripId, // Add tripId to identify this message
      };

      // Save the announcement message
      await setDoc(doc(db, "conversations", conversationId), {
        id: conversationId,
        type: "server_channel",
        serverId: selectedServer,
        channelId: generalChannel.id,
        createdAt: Date.now(),
      });

      await setDoc(doc(db, "conversations", conversationId, "messages", announcementMessage.id), announcementMessage);
    } catch (error) {
      console.error("Error sending trip announcement:", error);
    }
  };

  // Function to handle joining a trip
  const handleJoinTrip = async (tripId: string) => {
    if (!currentProfileId) return;

    try {
      const tripRef = doc(db, "trips", tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        toast({
          title: "Error",
          description: "Trip not found",
          variant: "destructive",
        });
        return;
      }

      const tripData = tripDoc.data() as Trip;

      // Check if user is already a member
      if (tripData.members.includes(currentProfileId)) {
        toast({
          title: "Already Joined",
          description: "You are already a member of this trip",
        });
        return;
      }

      // Add user to trip members
      await updateDoc(tripRef, {
        members: [...tripData.members, currentProfileId],
      });

      toast({
        title: "Success",
        description: `You have joined ${tripData.name}!`,
      });

      // Refresh trips to get updated data
      // The real-time listener will handle this automatically
    } catch (error) {
      console.error("Error joining trip:", error);
      toast({
        title: "Error",
        description: "Failed to join trip",
        variant: "destructive",
      });
    }
  };

  // Function to handle deleting a trip
  const handleDeleteTrip = async (tripId: string) => {
    if (!currentProfileId || !selectedServer) return;

    // Get trip details before deletion for cleanup
    const tripRef = doc(db, "trips", tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
      toast({
        title: "Error",
        description: "Trip not found",
        variant: "destructive",
      });
      return;
    }

    const tripData = tripDoc.data() as Trip;

    // Check if user can delete this trip
    if (!canUserDeleteTrip(tripData)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete this trip",
        variant: "destructive",
      });
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(`Are you sure you want to delete "${tripData.name}"? This action cannot be undone and will remove all trip data including the planning channel.`);

    if (!confirmed) return;

    try {
      // Delete all messages in the trip channel
      const conversationId = `server_${selectedServer}_channel_${tripData.channelId}`;
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const messagesSnapshot = await getDocs(messagesRef);

      for (const msgDoc of messagesSnapshot.docs) {
        await deleteDoc(msgDoc.ref);
      }

      // Delete the conversation collection
      await deleteDoc(doc(db, "conversations", conversationId));

      // Remove the category and channel from the server
      const serverRef = doc(db, "servers", selectedServer);
      const serverDoc = await getDoc(serverRef);

      if (serverDoc.exists()) {
        const serverData = serverDoc.data();
        const updatedCategories = (serverData.categories || []).filter((c: Category) => c.id !== tripData.categoryId);
        const updatedChannels = (serverData.channels || []).filter((c: Channel) => c.id !== tripData.channelId);

        await updateDoc(serverRef, {
          categories: updatedCategories,
          channels: updatedChannels,
        });
      }

      // Delete the trip document
      await deleteDoc(tripRef);

      toast({
        title: "Trip Deleted",
        description: `${tripData.name} has been deleted successfully`,
      });

      // If we were in the deleted channel, switch to general channel
      if (selectedChannel === tripData.channelId) {
        const generalChannel = currentServer?.channels?.find(c => !c.isHidden);
        if (generalChannel) {
          setSelectedChannel(generalChannel.id);
        }
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({
        title: "Error",
        description: "Failed to delete trip",
        variant: "destructive",
      });
    }
  };

  // Handle accepting a server join request
  const handleAcceptJoinRequest = async (requestId: string, requesterId: string, serverId: string, serverName: string, requesterName: string) => {
    try {
      // Add user to server members
      await setDoc(doc(db, "servers", serverId, "members", requesterId), {
        userId: requesterId,
        joinedAt: new Date(),
        role: "member",
      });

      // Update request status to accepted
      await updateDoc(doc(db, "serverJoinRequests", requestId), {
        status: "accepted",
        respondedAt: new Date(),
      });

      // Create a notification message in the general channel
      const generalChannel = currentServer?.channels?.find(c => !c.isHidden);
      if (generalChannel) {
        const conversationId = `server_${serverId}_channel_${generalChannel.id}`;
        const notificationMessage = {
          id: `msg_${Date.now()}`,
          conversationId,
          senderId: currentProfileId!,
          senderName: "System",
          content: `${requesterName} has joined the server!`,
          timestamp: Date.now(),
          type: "text",
        };

        await setDoc(doc(db, "conversations", conversationId, "messages", notificationMessage.id), notificationMessage);
      }

      toast({
        title: "Request Accepted",
        description: "User has been added to the server",
      });
    } catch (error) {
      console.error("Error accepting join request:", error);
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    }
  };

  // Handle denying a server join request
  const handleDenyJoinRequest = async (requestId: string, requesterName: string, requesterId: string, serverName: string) => {
    try {
      // Update request status to denied
      await updateDoc(doc(db, "serverJoinRequests", requestId), {
        status: "denied",
        respondedAt: new Date(),
      });

      // Send DM notification to the requester
      const soulConversationId = `soul_${requesterId}`;

      // Create the Soul conversation if it doesn't exist
      await setDoc(doc(db, "conversations", soulConversationId), {
        id: soulConversationId,
        type: "bot_dm",
        userId: requesterId,
        createdAt: Date.now(),
      });

      // Send the denial message from Soul
      const denialMessage = {
        id: `msg_${Date.now()}`,
        conversationId: soulConversationId,
        senderId: "soul_bot",
        senderName: "Soul",
        content: `❌ **Request Denied**\n\n${currentProfile?.name || "The server owner"} has denied your request to join their server "${serverName}".\n\nYou can try sending a new request later if you're still interested.`,
        timestamp: Date.now(),
        type: "text",
      };

      await setDoc(doc(db, "conversations", soulConversationId, "messages", denialMessage.id), denialMessage);

      toast({
        title: "Request Denied",
        description: `${requesterName}'s request has been denied and notified`,
      });
    } catch (error) {
      console.error("Error denying join request:", error);
      toast({
        title: "Error",
        description: "Failed to deny request",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (message.trim()) {
      let conversationId = "";
      
      console.log("Send message - showDirectMessages:", showDirectMessages, "selectedFriend:", selectedFriend, "selectedChannel:", selectedChannel);
      
      if (showDirectMessages && selectedFriend) {
        // Direct message: dm_{uid1}_{uid2}
        if (selectedFriend.id === 'soul_bot') {
          conversationId = `soul_${currentProfileId}`;
        } else {
          conversationId = `dm_${getConversationId(selectedFriend.id)}`;
        }
      } else if (!showDirectMessages && selectedChannel && selectedServer) {
        // Server channel message: server_{serverId}_channel_{channelId}
        conversationId = `server_${selectedServer}_channel_${selectedChannel}`;
      }
      
      console.log("Conversation ID:", conversationId, "Type:", showDirectMessages ? "Direct Message" : "Server Channel");
      
      if (!conversationId) {
        console.log("No conversation ID - cannot send message");
        return;
      }

      if (!currentProfileId) {
        toast({
          title: "Error",
          description: "Please log in to send messages",
          variant: "destructive",
        });
        return;
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: currentProfileId,
        senderName: currentProfileName,
        content: message,
        timestamp: Date.now(),
        conversationId,
        ...(replyToMessage && {
          replyTo: {
            messageId: replyToMessage.id,
            senderId: replyToMessage.senderId,
            senderName: replyToMessage.senderName,
            content: replyToMessage.content,
          }
        })
      };

      setMessage("");
      setReplyToMessage(null);
      
      try {
        console.log("💬 Sending message:", newMessage);
        
        // Save to Firestore
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const docRef = await addDoc(messagesRef, {
          ...newMessage,
          timestamp: Timestamp.now(),
        });
        // Send through WebSocket for real-time broadcast
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(newMessage));
        } else {
          console.warn("⚠️ WebSocket not connected, message saved to Firestore only");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoUrl = event.target?.result as string;
        handleSendPhotoMessage(photoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendPhotoMessage = async (photoUrl: string) => {
    let conversationId = "";
    
    if (showDirectMessages && selectedFriend) {
      conversationId = `dm_${getConversationId(selectedFriend.id)}`;
    } else if (!showDirectMessages && selectedChannel && selectedServer) {
      conversationId = `server_${selectedServer}_channel_${selectedChannel}`;
    }
    
    if (!conversationId || !currentProfileId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentProfileId,
      senderName: currentProfileName,
      content: "📷 Shared a photo",
      timestamp: Date.now(),
      conversationId,
      type: "photo",
      photoUrl,
    };
    
    try {
      console.log("📸 Sending photo message:", newMessage);
      
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      await addDoc(messagesRef, {
        ...newMessage,
        timestamp: Timestamp.now(),
      });
      
      // Send through WebSocket for real-time broadcast
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("📤 Broadcasting photo through WebSocket");
        wsRef.current.send(JSON.stringify(newMessage));
      } else {
        console.warn("⚠️ WebSocket not connected, photo saved to Firestore only");
      }
      
      toast({
        title: "Photo Sent",
        description: "Your photo has been shared",
      });
    } catch (error) {
      console.error("Error sending photo:", error);
      toast({
        title: "Error",
        description: "Failed to send photo",
        variant: "destructive",
      });
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim() || pollOptions.some(opt => !opt.trim())) {
      toast({
        title: "Error",
        description: "Poll title and all options must be filled",
        variant: "destructive",
      });
      return;
    }

    let conversationId = "";
    
    if (showDirectMessages && selectedFriend) {
      conversationId = `dm_${getConversationId(selectedFriend.id)}`;
    } else if (!showDirectMessages && selectedChannel && selectedServer) {
      conversationId = `server_${selectedServer}_channel_${selectedChannel}`;
    }
    
    if (!conversationId || !currentProfileId) return;

    const newPoll: Poll = {
      id: Date.now().toString(),
      title: pollTitle,
      options: pollOptions.map((text, idx) => ({
        id: `opt_${idx}`,
        text,
        votes: [],
      })),
      createdBy: currentProfileId,
    };

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentProfileId,
      senderName: currentProfileName,
      content: `📊 Created a poll: ${pollTitle}`,
      timestamp: Date.now(),
      conversationId,
      type: "poll",
      poll: newPoll,
    };
    
    try {
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      await addDoc(messagesRef, {
        ...newMessage,
        timestamp: Timestamp.now(),
      });
      setPollTitle("");
      setPollOptions(["", ""]);
      setShowPollDialog(false);
      toast({
        title: "Poll Created",
        description: "Your poll has been shared",
      });
    } catch (error) {
      console.error("Error creating poll:", error);
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      });
    }
  };

  const handleVotePoll = async (messageId: string, pollOptionId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.poll || !currentProfileId) return;

    const pollOptionIndex = message.poll.options.findIndex(opt => opt.id === pollOptionId);
    
    if (pollOptionIndex === -1) return;

    // Remove vote if already voted on this option
    const alreadyVoted = message.poll.options[pollOptionIndex].votes.includes(currentProfileId);
    
    const updatedPoll = {
      ...message.poll,
      options: message.poll.options.map((opt, idx) => ({
        ...opt,
        votes: idx === pollOptionIndex
          ? alreadyVoted 
            ? opt.votes.filter(v => v !== currentProfileId)
            : [...opt.votes, currentProfileId]
          : opt.votes,
      })),
    };

    const updatedMessage = { ...message, poll: updatedPoll };

    try {
      const conversationId = message.conversationId;
      const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
      await updateDoc(messageRef, { poll: updatedPoll });
      
      setMessages(messages.map(m => m.id === messageId ? updatedMessage : m));
    } catch (error) {
      console.error("Error voting on poll:", error);
      toast({
        title: "Error",
        description: "Failed to vote on poll",
        variant: "destructive",
      });
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message || !currentProfileId) return;

      const conversationId = message.conversationId;
      const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
      
      const deletedFor = message.deletedFor || [];
      if (!deletedFor.includes(currentProfileId)) {
        deletedFor.push(currentProfileId);
      }
      
      await updateDoc(messageRef, { deletedFor });
      
      setMessages(messages.filter(m => m.id !== messageId));
      setMessageContextMenu(null);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      
      toast({
        title: "Message Deleted",
        description: "Message removed from your view",
      });
    } catch (error) {
      console.error("Error deleting message for me:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message || !currentProfileId) return;
      
      // Only allow deletion if user is the sender
      if (message.senderId !== currentProfileId) {
        toast({
          title: "Error",
          description: "You can only delete your own messages",
          variant: "destructive",
        });
        return;
      }

      const conversationId = message.conversationId;
      const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
      
      await updateDoc(messageRef, { deletedForEveryone: true });
      
      // Update local state to show the deleted message immediately
      setMessages(messages.map(m => 
        m.id === messageId 
          ? { ...m, deletedForEveryone: true }
          : m
      ));
      setMessageContextMenu(null);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      
      toast({
        title: "Message Deleted",
        description: "Message deleted for everyone",
      });
    } catch (error) {
      console.error("Error deleting message for everyone:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (!currentProfileId) return;
    
    try {
      for (const messageId of selectedMessages) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          const conversationId = message.conversationId;
          const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
          
          const deletedFor = message.deletedFor || [];
          if (!deletedFor.includes(currentProfileId)) {
            deletedFor.push(currentProfileId);
          }
          
          await updateDoc(messageRef, { deletedFor });
        }
      }
      
      setMessages(messages.filter(m => !selectedMessages.has(m.id)));
      setSelectedMessages(new Set());
      setDeleteDialogOpen(false);
      setIsDeletingBulk(false);
      
      toast({
        title: "Messages Deleted",
        description: `${selectedMessages.size} message(s) have been removed from your view`,
      });
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast({
        title: "Error",
        description: "Failed to delete messages",
        variant: "destructive",
      });
    }
  };

  const handleMessageRightClick = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    if (selectedMessages.size > 0) {
      // If already in selection mode, toggle this message
      const newSelected = new Set(selectedMessages);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setSelectedMessages(newSelected);
      setMessageContextMenu(null);
    } else {
      // Show context menu
      setMessageContextMenu({ messageId, x: e.clientX, y: e.clientY });
    }
  };

  const handleMessageLongPress = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
    setMessageContextMenu(null);
  };

  const handleMessageClick = (messageId: string) => {
    if (selectedMessages.size > 0) {
      handleMessageLongPress(messageId);
    }
  };

  const clearAllConversations = async () => {
    try {
      console.log("Clearing all conversations...");
      const conversationsRef = collection(db, "conversations");
      const snapshot = await getDocs(conversationsRef);
      
      for (const doc of snapshot.docs) {
        // Delete all messages in this conversation
        const messagesRef = collection(db, "conversations", doc.id, "messages");
        const messagesSnapshot = await getDocs(messagesRef);
        
        for (const msgDoc of messagesSnapshot.docs) {
          await deleteDoc(msgDoc.ref);
        }
        
        // Delete the conversation document itself
        await deleteDoc(doc.ref);
      }
      
      console.log("All conversations cleared!");
      toast({
        title: "Success",
        description: "All conversations have been cleared",
      });
      setMessages([]);
    } catch (error) {
      console.error("Error clearing conversations:", error);
      toast({
        title: "Error",
        description: "Failed to clear conversations",
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = async () => {
    if (!profileTag.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!currentProfileId) {
        toast({
          title: "Error",
          description: "Please log in to add friends",
          variant: "destructive",
        });
        return;
      }

      console.log("Searching for user with ID:", profileTag.trim().toUpperCase());

      // Search Firestore by custom userId field (not document ID)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", profileTag.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: "Error",
          description: "User ID not found",
          variant: "destructive",
        });
        return;
      }

      // Get the first matching user
      const userDoc = querySnapshot.docs[0];
      const foundProfile = userDoc.data();
      const userIdToAdd = userDoc.id; // This is the Firebase Auth UID (document ID)
      
      console.log("Found user:", foundProfile.name, "Auth UID:", userIdToAdd);

      if (currentProfileId === userIdToAdd) {
        toast({
          title: "Error",
          description: "You cannot add yourself",
          variant: "destructive",
        });
        return;
      }

      const alreadyFriend = friends.some((f) => f.id === userIdToAdd);
      if (alreadyFriend) {
        toast({
          title: "Error",
          description: "This user is already your friend",
          variant: "destructive",
        });
        return;
      }

      // Send friend request to Firestore using Auth UIDs
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: currentProfileId, // Firebase Auth UID
        fromUserName: currentProfileName,
        toUserId: userIdToAdd, // This should be the target's Firebase Auth UID
        toUserName: foundProfile.name,
        status: "pending",
        createdAt: Timestamp.now(),
      });

      setProfileTag("");
      setShowAddFriendDialog(false);
      toast({
        title: "Friend Request Sent!",
        description: `Friend request sent to ${foundProfile.name}`,
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      console.log("Accepting friend request:", requestId);
      
      const request = friendRequests.find(r => r.id === requestId);
      console.log("Found request:", request);
      
      if (!request) {
        console.error("Request not found");
        return;
      }
      
      if (!currentProfileId) {
        console.error("No current profile ID");
        return;
      }

      // Add both users as friends
      const newFriend: Friend = {
        id: request.fromUserId || request.id,
        name: request.fromUserName || request.name,
      };

      console.log("New friend:", newFriend);

      // Save friend to Firestore under current user
      const userDocRef = doc(db, "users", currentProfileId);
      const friendsCollectionRef = collection(userDocRef, "friends");
      
      console.log("Saving friend to Firestore...");
      await setDoc(doc(friendsCollectionRef, newFriend.id), {
        name: newFriend.name,
        addedAt: Timestamp.now(),
      });
      console.log("Friend saved to current user");

      // Update request status in Firestore
      const requestDocRef = doc(db, "friendRequests", requestId);
      console.log("Updating request status...");
      await updateDoc(requestDocRef, { status: "accepted" });
      console.log("Request status updated");

      // Also add current user to requester's friends list (reciprocal friendship)
      const requesterUserDocRef = doc(db, "users", request.fromUserId);
      const requesterFriendsRef = collection(requesterUserDocRef, "friends");
      const currentUserName = currentProfileName || "User";
      
      console.log("Current user name:", currentUserName);
      
      try {
        console.log("Adding current user to requester's friends...");
        await setDoc(doc(requesterFriendsRef, currentProfileId), {
          name: currentUserName,
          addedAt: Timestamp.now(),
        });
        console.log("Added current user to requester's friends");
      } catch (reciprocalError) {
        console.error("Error adding reciprocal friendship:", reciprocalError);
        // Don't fail the whole operation if reciprocal add fails
      }

      // Remove from pending requests
      setFriendRequests(friendRequests.filter(r => r.id !== requestId));

      toast({
        title: "Friend Request Accepted",
        description: `${request.fromUserName || request.name} has been added to your friends`,
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({
        title: "Error",
        description: `Failed to accept friend request: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      const request = friendRequests.find(r => r.id === requestId);

      // Delete request from Firestore
      const requestDocRef = doc(db, "friendRequests", requestId);
      await deleteDoc(requestDocRef);

      setFriendRequests(friendRequests.filter(r => r.id !== requestId));

      toast({
        title: "Friend Request Declined",
        description: `Declined request from ${request?.fromUserName || request?.name}`,
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex h-screen">
      {/* Server Sidebar */}
      <div className="w-[72px] bg-card/50 backdrop-blur-sm border-r border-border flex flex-col items-center py-3 gap-2">
        {/* Direct Messages Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowDirectMessages(true);
            setSelectedServer(null);
            setSelectedChannel(null);
          }}
          className={`w-12 h-12 rounded-2xl transition-all ${
            showDirectMessages
              ? "bg-primary text-primary-foreground rounded-xl"
              : "bg-card hover:bg-accent hover:rounded-xl"
          }`}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        {/* Globe Icon Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            sessionStorage.setItem('cameFromMain', 'true');
            navigate("/explore");
          }}
          className="w-12 h-12 rounded-2xl bg-card hover:bg-accent hover:rounded-xl transition-all"
        >
          <Globe className="h-6 w-6 text-primary" />
        </Button>

        <Separator className="w-8" />

        {/* Server Icons */}
        {isServersLoading ? (
          // Loading skeleton for servers
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`loading-${i}`}
              className="w-12 h-12 rounded-2xl bg-muted animate-pulse"
            />
          ))
        ) : (
          servers.map((server) => (
            <Button
              key={server.id}
              variant="ghost"
              size="icon"
              onClick={() => handleServerClick(server.id)}
              className={`w-12 h-12 rounded-2xl transition-all p-0 ${
                selectedServer === server.id
                  ? "bg-primary text-primary-foreground rounded-xl"
                  : "bg-card hover:bg-accent hover:rounded-xl"
              }`}
            >
              {server.icon ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={server.icon} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold rounded-2xl">
                    {getInitials(server.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-sm font-semibold">
                  {getInitials(server.name)}
                </span>
              )}
            </Button>
          ))
        )}

        {/* Add Server Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowServerCreationDialog(true)}
          className="w-12 h-12 rounded-2xl bg-card hover:bg-accent hover:rounded-xl transition-all"
        >
          <Plus className="h-6 w-6 text-primary" />
        </Button>
      </div>

      {/* Server Join Requests Section - Only visible to server owners */}
      {serverJoinRequests.length > 0 && (
        <div className="w-60 bg-card/50 backdrop-blur-sm border-r border-border border-t">
          <div className="p-2">
            <Button
              variant="ghost"
              className="w-full justify-between px-2 py-1 h-auto"
              onClick={() => setShowFriendRequests(!showFriendRequests)}
            >
              <span className="text-xs font-semibold text-muted-foreground">
                Server Requests
              </span>
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {serverJoinRequests.length}
              </span>
            </Button>
          </div>
          {showFriendRequests && (
            <div className="px-2 pb-2 space-y-2">
              {serverJoinRequests.map((request) => (
                <div key={request.id} className="bg-card/50 rounded p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={request.requesterAvatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {request.requesterName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{request.requesterName}</p>
                      <p className="text-xs text-muted-foreground">wants to join: {request.serverName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleAcceptJoinRequest(
                        request.id,
                        request.requesterId,
                        request.serverId,
                        request.serverName,
                        request.requesterName
                      )}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleDenyJoinRequest(
                        request.id,
                        request.requesterName,
                        request.requesterId,
                        request.serverName
                      )}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct Messages / Channels Sidebar */}
      <div className="w-60 bg-card/50 backdrop-blur-sm border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {showDirectMessages ? "Direct Messages" : currentServer?.name}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${showDirectMessages ? "invisible" : ""}`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setShowInviteDialog(true)}
              >
                <UserCheck className="h-4 w-4" />
                <span>Invite People</span>
              </DropdownMenuItem>
              {(isServerOwner || trips.some(t => t.createdBy === currentProfileId)) && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setShowManageTripsDialog(true)}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Manage Trips</span>
                </DropdownMenuItem>
              )}
              {isServerOwner && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={handleOpenServerSettings}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Server Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setIsCreatingCategory(true)}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Create Category</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50/50"
                onClick={handleLeaveServer}
              >
                <LogOut className="h-4 w-4" />
                <span>Leave Server</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showDirectMessages ? (
          <>
            {/* Friend Actions */}
            <div className="p-2 border-b border-border space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-foreground hover:bg-accent/50"
                onClick={() => setShowAddFriendDialog(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add Friend
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-foreground hover:bg-accent/50 relative"
                onClick={() => navigate("/friends")}
              >
                <Users className="h-4 w-4" />
                Friends
                {friendRequests.length > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isFriendsLoading ? (
                // Loading skeleton for friends
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={`friend-loading-${i}`} className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Soul Bot - Only show if there are messages */}
                  {hasSoulMessages && (
                    <div
                      onClick={() => setSelectedFriend({ id: 'soul_bot', name: 'Soul', avatar: '' })}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        selectedFriend?.id === 'soul_bot'
                          ? "bg-accent/50"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                          S
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Soul</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {/* Regular Friends */}
                  {friends.length > 0 ? (
                    friends.map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          selectedFriend?.id === friend.id
                            ? "bg-accent/50"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{friend.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground p-2">No friends yet</p>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Categories Section */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Regular Categories */}
              {currentServer?.categories?.filter(c => !c.isHidden).map((category) => (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold text-muted-foreground">{category.name}</span>
                    {canUserCreateChannelInCategory(category) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setShowCreateChannelDialog(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {currentServer?.channels?.filter(c => c.categoryId === category.id && canUserSeeChannel(c)).map((channel) => (
                    <Button
                      key={channel.id}
                      variant="ghost"
                      onClick={() => handleChannelClick(channel.id)}
                      className={`w-full justify-start gap-3 ml-2 ${
                        selectedChannel === channel.id
                          ? "bg-accent/50 hover:bg-accent/50"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-sm">
                        {channel.type === "voice" ? "🎙" : "#"} {channel.name}
                      </span>
                    </Button>
                  ))}
                </div>
              ))}

              {/* Trip Categories - Visible to trip members and creators */}
              {currentServer?.categories?.filter(c => c.isHidden && c.tripId && canUserSeeCategory(c)).length > 0 && (
                <div className="mt-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold text-muted-foreground">Your Trips</span>
                  </div>
                  {currentServer?.categories?.filter(c => c.isHidden && c.tripId && canUserSeeCategory(c)).map((category) => (
                    <div key={category.id} className="space-y-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-xs font-semibold text-blue-600">{category.name}</span>
                        {canUserCreateChannelInCategory(category) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setShowCreateChannelDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {currentServer?.channels?.filter(c => c.categoryId === category.id && canUserSeeChannel(c)).map((channel) => (
                        <Button
                          key={channel.id}
                          variant="ghost"
                          onClick={() => handleChannelClick(channel.id)}
                          className={`w-full justify-start gap-3 ml-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 ${
                            selectedChannel === channel.id
                              ? "bg-blue-50 hover:bg-blue-50"
                              : ""
                          }`}
                        >
                          <span className="text-sm">
                            {channel.type === "voice" ? "🎙" : "#"} {channel.name}
                          </span>
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

  
              {/* New Category Input */}
              {isCreatingCategory && (
                <div className="px-2 py-1">
                  <Input
                    autoFocus
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onBlur={handleCreateCategory}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleCreateCategory();
                      }
                    }}
                    className="text-xs h-7"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/30 backdrop-blur-sm">
          <h3 className="text-lg font-semibold">
            {showDirectMessages ? (
              selectedFriend ? selectedFriend.name : "Direct Messages"
            ) : (
              <>
                <span className="text-muted-foreground"># </span>
                {currentChannel?.name}
              </>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden" onClick={() => setMessageContextMenu(null)}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-2 flex flex-col">
            {(() => {
              let conversationId = "";
              
              if (showDirectMessages && selectedFriend) {
                if (selectedFriend.id === 'soul_bot') {
                  conversationId = `soul_${currentProfileId}`;
                } else {
                  conversationId = `dm_${getConversationId(selectedFriend.id)}`;
                }
              } else if (!showDirectMessages && selectedChannel && selectedServer) {
                conversationId = `server_${selectedServer}_channel_${selectedChannel}`;
              }
              
              console.log("Display - Looking for messages with conversationId:", conversationId);
              const conversationMessages = messages.filter(m => m.conversationId === conversationId);
              console.log("Display - Found", conversationMessages.length, "messages");
              
              if (conversationMessages.length === 0) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      {showDirectMessages ? (
                        selectedFriend ? (
                          <>
                            <h1 className="text-4xl font-bold mb-2">No messages yet</h1>
                            <p className="text-muted-foreground">
                              Start the conversation with {selectedFriend.name}
                            </p>
                          </>
                        ) : (
                          <>
                            <h1 className="text-4xl font-bold mb-2">Let's get you started</h1>
                            <p className="text-muted-foreground">
                              Select a server, channel, or a DM to begin.
                            </p>
                          </>
                        )
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <h1 className="text-4xl font-bold mb-2">Welcome to #{currentChannel?.name}</h1>
                            {currentChannelTrip && canUserDeleteTrip(currentChannelTrip) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTrip(currentChannelTrip!.id)}
                                className="mb-2"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Trip
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            Start a conversation in this channel.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              }
              
              const currentUserId = currentProfileId;
              console.log("Current User ID for display:", currentUserId);
              
              // Filter out only messages deleted for this specific user
              // Messages with deletedForEveryone should still be visible (showing deletion message)
              const visibleMessages = conversationMessages.filter(msg => {
                if (msg.deletedFor?.includes(currentUserId || "")) return false;
                return true;
              });
              
              return visibleMessages.map((msg) => {
                const isCurrentUser = msg.senderId === currentUserId || msg.senderId === "current-user";
                const isSelected = selectedMessages.has(msg.id);
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isCurrentUser ? "justify-end" : "justify-start"} max-w-full ${
                      isSelected ? "bg-accent/10 rounded-lg px-2 py-1 -mx-2" : ""
                    }`}
                  >
                    {selectedMessages.size > 0 && (
                      <div className="flex items-center pt-1">
                        <div 
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}
                          onClick={() => handleMessageClick(msg.id)}
                        >
                          {isSelected && (
                            <span className="text-primary-foreground text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div
                      onContextMenu={(e) => handleMessageRightClick(e, msg.id)}
                      onTouchStart={() => {
                        longPressTimerRef.current = setTimeout(() => {
                          handleMessageLongPress(msg.id);
                        }, 500);
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onTouchMove={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onClick={() => handleMessageClick(msg.id)}
                      className={`rounded-lg cursor-pointer transition-all max-w-xs relative ${
                        msg.type === "photo"
                          ? "p-0"
                          : `px-4 py-2 ${
                              isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent/20 text-foreground"
                            }`
                      } ${msg.replyTo ? "border-l-4" : ""}`}
                      style={msg.replyTo ? {
                        borderLeftColor: isCurrentUser ? "#3b82f6" : "#fb923c"
                      } : {}}
                    >
                      {msg.type !== "photo" && msg.type !== "poll" && !msg.deletedForEveryone && (
                        <p className="text-xs font-semibold mb-1" style={{ color: isCurrentUser ? "#3b82f6" : "inherit" }}>
                          {isCurrentUser ? "You" : msg.senderName}
                        </p>
                      )}

                      {/* Reply Preview */}
                      {msg.replyTo && !msg.deletedForEveryone && (
                        <div className={`mb-2 p-3 rounded-lg border-l-4 ${
                          isCurrentUser
                            ? ""
                            : ""
                        }`}
                        style={msg.replyTo ? {
                          backgroundColor: isCurrentUser ? '#a8f5e9' : '#fb923c',
                          borderLeftColor: isCurrentUser ? '#1e40af' : '#f97316'
                        } : {}}>
                          <p className={`text-xs font-medium mb-2 ${
                            isCurrentUser
                              ? "text-blue-900"
                              : "text-black"
                          }`}>
                            Replying to {msg.replyTo.senderName}
                          </p>
                          <p className={`text-sm leading-relaxed ${
                            isCurrentUser
                              ? "text-blue-800"
                              : "text-black"
                          }`}>
                            {msg.replyTo.content}
                          </p>
                        </div>
                      )}

                      {msg.deletedForEveryone ? (
                        <p className="italic text-muted-foreground text-sm">This message was deleted by the user</p>
                      ) : (
                        <>
                          {msg.type === "photo" && msg.photoUrl && (
                            <div 
                              className="relative group cursor-pointer"
                              onClick={() => setFullscreenPhotoUrl(msg.photoUrl || null)}
                            >
                              <img
                                src={msg.photoUrl}
                                alt="Shared photo"
                                className="rounded-lg max-h-64 max-w-xs object-cover hover:opacity-80 transition-opacity"
                              />
                              {!isCurrentUser && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-xs text-white font-semibold">{msg.senderName}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {msg.type === "poll" && msg.poll && (
                            <div className="space-y-2">
                              {!isCurrentUser && (
                                <p className="text-xs font-semibold mb-2">{msg.senderName}</p>
                              )}
                              <p className="font-semibold">{msg.poll.title}</p>
                              <div className="space-y-2">
                                {msg.poll.options.map((option) => {
                                  const totalVotes = msg.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                                  const optionVotes = option.votes.length;
                                  const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
                                  const hasVoted = option.votes.includes(currentUserId || "");
                                  
                                  return (
                                    <button
                                      key={option.id}
                                      onClick={() => handleVotePoll(msg.id, option.id)}
                                      className={`w-full text-left p-2 rounded transition-all ${
                                        hasVoted
                                          ? "bg-accent/40 border border-accent"
                                          : "bg-accent/20 border border-transparent hover:border-accent/50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">{option.text}</span>
                                        <span className="text-xs">{optionVotes}</span>
                                      </div>
                                      <div className="h-1 bg-accent/20 rounded mt-1 overflow-hidden">
                                        <div
                                          className="h-full bg-accent transition-all"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {msg.type !== "photo" && msg.type !== "poll" && (
                            <>
                              <p className="break-words">{msg.content}</p>
                              {/* Show join button for trip announcements */}
                              {msg.tripId && (
                                <div className="mt-3 pt-3 border-t border-current/20">
                                  <Button
                                    size="sm"
                                    onClick={() => handleJoinTrip(msg.tripId!)}
                                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                                  >
                                    Join Trip
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        {((showDirectMessages && selectedFriend) || (!showDirectMessages && selectedChannel)) && (
          <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
            {/* Reply Preview */}
            {replyToMessage && (
              <div className="mb-2 p-2 bg-accent/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Reply className="h-4 w-4" />
                    <span>Replying to {replyToMessage.senderName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-accent/50"
                    onClick={() => setReplyToMessage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-1 text-sm text-foreground/80 truncate">
                  {replyToMessage.content}
                </div>
              </div>
            )}
            {/* Emoji Picker Panel */}
            {showEmojiSearchInterface && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full mb-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="rounded-lg shadow-2xl border overflow-hidden"
                  style={{
                    backgroundColor: theme === 'dark' ? '#36393f' : '#ffffff',
                    borderColor: theme === 'dark' ? '#202225' : '#e1e5e9'
                  }}
                >
                  <Picker
                    onEmojiClick={handleEmojiSearchSelect}
                    searchPlaceholder="Search emojis..."
                    width="320px"
                    height="380px"
                    skinTonesDisabled={true}
                    emojiVersion="1.0"
                    theme={theme === 'dark' ? 'dark' : 'light' as any}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-48">
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    <span>Files</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4" />
                    <span>Photos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Video className="h-4 w-4" />
                    <span>Videos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setShowPollDialog(true)}
                  >
                    <PieChart className="h-4 w-4" />
                    <span>Poll</span>
                  </DropdownMenuItem>
                  {!showDirectMessages && selectedServer && (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => setShowCreateTripDialog(true)}
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Add a Trip</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Emoji Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleEmojiPicker}
                className="rounded-full hover:bg-accent transition-colors"
                title="Search and send emojis"
              >
                <Smile className="h-5 w-5" />
              </Button>

              <div className="flex-1 relative">
                <Input
                  id="message-input"
                  placeholder={showDirectMessages ? `Message ${selectedFriend?.name}...` : `Message in #${currentChannel?.name}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pr-10"
                />
              </div>

              <Button
                size="icon"
                className="rounded-full bg-transparent hover:bg-primary text-primary hover:text-primary-foreground transition-colors"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            {selectedMessages.size > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{selectedMessages.size} message(s) selected</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setIsDeletingBulk(true);
                    setDeleteDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription>
              Enter a friend's User ID to add them to your friends list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-tag">User ID</Label>
              <Input
                id="profile-tag"
                placeholder="Paste their User ID here..."
                value={profileTag}
                onChange={(e) => setProfileTag(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddFriend();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Ask your friend to share their User ID from Edit Profile
              </p>
            </div>
            <Button
              onClick={handleAddFriend}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Add Friend
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Server Creation Dialog */}
      <ServerCreationDialog
        open={showServerCreationDialog}
        onOpenChange={setShowServerCreationDialog}
        onServerCreate={handleCreateServer}
      />

      {/* Create Channel Dialog */}
      <Dialog
        open={showCreateChannelDialog}
        onOpenChange={(open) => {
          setShowCreateChannelDialog(open);
          if (!open) setChannelError("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>
              Channels keep conversations organized. Pick a type and give it a name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Channel Type Selection */}
            <div className="space-y-3">
              <Label>Channel Type</Label>
              <RadioGroup value={channelType} onValueChange={(value) => setChannelType(value as "text" | "voice")}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer">
                  <RadioGroupItem value="text" id="text-channel" />
                  <Label htmlFor="text-channel" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold"># Text Channel</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Send messages, images, and more</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer">
                  <RadioGroupItem value="voice" id="voice-channel" />
                  <Label htmlFor="voice-channel" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">🎙 Voice Channel</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Hang out together with voice and video</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Channel Name Input */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name *</Label>
              <Input
                id="channel-name"
                placeholder="new-channel"
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  if (e.target.value.trim()) {
                    setChannelError("");
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCreateChannel();
                  }
                }}
                className={channelError ? "border-destructive" : ""}
              />
              {channelError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>ℹ</span>
                  {channelError}
                </p>
              )}
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateChannel}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite People Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite friends to {currentServer?.name}</DialogTitle>
            <DialogDescription>
              Copy and share this invite link to bring people into your community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="h-10 w-10"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with your friends to invite them to this server.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Poll Creation Dialog */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Poll</DialogTitle>
            <DialogDescription>
              Create a poll and let others vote on options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poll-title">Poll Title</Label>
              <Input
                id="poll-title"
                placeholder="What's your question?"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {pollOptions.map((option, idx) => (
                <Input
                  key={idx}
                  placeholder={`Option ${idx + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[idx] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </Button>
            </div>

            <Button
              onClick={handleCreatePoll}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Create Poll
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Context Menu */}
      {messageContextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-fit"
          style={{
            top: Math.min(messageContextMenu.y, window.innerHeight - 150) + 'px',
            left: Math.min(messageContextMenu.x, window.innerWidth - 200) + 'px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
          onMouseLeave={() => setMessageContextMenu(null)}
        >
          {selectedMessages.size === 0 ? (
            <>
              <button
                onClick={() => {
                  const message = messages.find(m => m.id === messageContextMenu.messageId);
                  if (message) {
                    handleReply(message);
                  }
                }}
                className="w-full px-4 py-2 text-sm hover:bg-accent/50 flex items-center gap-2 text-foreground"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button
                onClick={() => {
                  const message = messages.find(m => m.id === messageContextMenu.messageId);
                  if (message) {
                    setSelectedMessages(new Set([message.id]));
                  }
                  setMessageContextMenu(null);
                }}
                className="w-full px-4 py-2 text-sm hover:bg-accent/50 flex items-center gap-2 text-foreground"
              >
                <CheckSquare className="h-4 w-4" />
                Select Messages
              </button>
              <button
                onClick={() => {
                  setMessageToDelete(messageContextMenu.messageId);
                  setDeleteDialogOpen(true);
                  setMessageContextMenu(null);
                }}
                className="w-full px-4 py-2 text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Message
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setSelectedMessages(new Set());
                setMessageContextMenu(null);
              }}
              className="w-full px-4 py-2 text-sm hover:bg-accent/50 flex items-center gap-2 text-foreground"
            >
              <span className="h-4 w-4">✕</span>
              Cancel Selection
            </button>
          )}
        </div>
      )}

      {/* Delete Message Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setMessageToDelete(null);
            setIsDeletingBulk(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {isDeletingBulk ? "Messages" : "Message"}</DialogTitle>
            <DialogDescription>
              {(() => {
                const currentUserId = currentProfileId;
                
                if (isDeletingBulk) {
                  // Check if all selected messages are owned by current user
                  const allMessagesOwnedByUser = Array.from(selectedMessages).every(msgId => {
                    const msg = messages.find(m => m.id === msgId);
                    return msg?.senderId === currentUserId;
                  });
                  
                  if (allMessagesOwnedByUser) {
                    return `Choose how you want to delete these ${selectedMessages.size} messages.`;
                  } else {
                    return `Delete these ${selectedMessages.size} messages for yourself.`;
                  }
                } else {
                  const message = messageToDelete ? messages.find(m => m.id === messageToDelete) : null;
                  const isMessageOwner = message?.senderId === currentUserId;
                  
                  if (isMessageOwner) {
                    return "Choose how you want to delete this message.";
                  } else {
                    return "Delete this message for yourself.";
                  }
                }
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={() => {
                if (isDeletingBulk) {
                  handleDeleteSelectedMessages();
                } else if (messageToDelete) {
                  handleDeleteForMe(messageToDelete);
                }
              }}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              Delete for Me
            </Button>
            {(() => {
              const currentUserId = currentProfileId;
              
              if (isDeletingBulk) {
                // Check if all selected messages are owned by current user
                const allMessagesOwnedByUser = Array.from(selectedMessages).every(msgId => {
                  const msg = messages.find(m => m.id === msgId);
                  return msg?.senderId === currentUserId;
                });
                
                return allMessagesOwnedByUser && (
                  <Button
                    onClick={async () => {
                      try {
                        for (const messageId of selectedMessages) {
                          const message = messages.find(m => m.id === messageId);
                          if (message) {
                            const conversationId = message.conversationId;
                            const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
                            await updateDoc(messageRef, { deletedForEveryone: true });
                          }
                        }
                        
                        // Update local state to show deleted messages immediately
                        setMessages(messages.map(m =>
                          selectedMessages.has(m.id)
                            ? { ...m, deletedForEveryone: true }
                            : m
                        ));
                        setSelectedMessages(new Set());
                        setDeleteDialogOpen(false);
                        setIsDeletingBulk(false);
                        
                        toast({
                          title: "Messages Deleted",
                          description: `${selectedMessages.size} message(s) deleted for everyone`,
                        });
                      } catch (error) {
                        console.error("Error deleting messages for everyone:", error);
                        toast({
                          title: "Error",
                          description: "Failed to delete messages",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full bg-destructive hover:bg-destructive/90"
                  >
                    Delete for Everyone
                  </Button>
                );
              } else {
                const message = messageToDelete ? messages.find(m => m.id === messageToDelete) : null;
                const isMessageOwner = message?.senderId === currentUserId;
                
                return isMessageOwner && (
                  <Button
                    onClick={() => {
                      if (messageToDelete) {
                        handleDeleteForEveryone(messageToDelete);
                      }
                    }}
                    className="w-full bg-destructive hover:bg-destructive/90"
                  >
                    Delete for Everyone
                  </Button>
                );
              }
            })()}
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setMessageToDelete(null);
                setIsDeletingBulk(false);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreenPhotoUrl(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={fullscreenPhotoUrl}
              alt="Fullscreen photo"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreenPhotoUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Leave Server Confirmation Dialog */}
      <Dialog open={showLeaveServerDialog} onOpenChange={setShowLeaveServerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isServerOwner && serverMembers.length === 0 ? "Delete Server" : "Leave Server"}</DialogTitle>
            <DialogDescription>
              {isServerOwner && serverMembers.length === 0
                ? `You are the only member of ${currentServer?.name}. You can either delete the server or leave it (it will remain without an owner).`
                : `Are you sure you want to leave ${currentServer?.name}? You'll lose access to all channels in this server.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isServerOwner && serverMembers.length === 0 ? (
              <>
                <Button
                  onClick={deleteServerAndLeave}
                  variant="destructive"
                  className="w-full"
                >
                  Delete Server
                </Button>
                <Button
                  onClick={confirmLeaveServer}
                  variant="secondary"
                  className="w-full"
                >
                  Leave Without Deleting
                </Button>
              </>
            ) : (
              <Button
                onClick={confirmLeaveServer}
                variant="destructive"
                className="w-full"
              >
                Leave Server
              </Button>
            )}
            <Button
              onClick={() => setShowLeaveServerDialog(false)}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferOwnershipDialog} onOpenChange={setShowTransferOwnershipDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              You are the owner of {currentServer?.name}. Before leaving, you must transfer ownership to another member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select New Owner</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {serverMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedNewOwner === member.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedNewOwner(member.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {member.avatar ? (
                          <AvatarImage src={member.avatar} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name || "User")}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">{member.name || "Unknown User"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={transferOwnershipAndLeave}
              disabled={!selectedNewOwner}
              variant="destructive"
              className="w-full"
            >
              Transfer Ownership and Leave
            </Button>
            <Button
              onClick={() => {
                setShowTransferOwnershipDialog(false);
                setSelectedNewOwner(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Trip Dialog */}
      <Dialog open={showCreateTripDialog} onOpenChange={setShowCreateTripDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Trip</DialogTitle>
            <DialogDescription>
              Create a hidden channel for trip planning. Only trip members will be able to see this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                placeholder="e.g., Paris, Bali, New York"
                value={tripDestination}
                onChange={(e) => setTripDestination(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-interval">Time Interval *</Label>
              <Input
                id="time-interval"
                placeholder="e.g., Dec 25-30, 2024"
                value={tripTimeInterval}
                onChange={(e) => setTripTimeInterval(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget *</Label>
              <Input
                id="budget"
                placeholder="e.g., $5000"
                value={tripBudget}
                onChange={(e) => setTripBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-of-people">Number of People (Optional)</Label>
              <Input
                id="number-of-people"
                placeholder="e.g., 4 people"
                value={tripNumberOfPeople}
                onChange={(e) => setTripNumberOfPeople(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places-to-visit">Places to Visit *</Label>
              <textarea
                id="places-to-visit"
                className="w-full min-h-[80px] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border rounded-md resize-none"
                placeholder="List the places you want to visit..."
                value={tripPlacesToVisit}
                onChange={(e) => setTripPlacesToVisit(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateTrip} className="w-full">
              Create Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Trips Dialog */}
      <Dialog open={showManageTripsDialog} onOpenChange={setShowManageTripsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Trips</DialogTitle>
            <DialogDescription>
              View and manage all trips in this server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {trips.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No trips created yet</p>
            ) : (
              trips.map((trip) => {
                const isCreator = trip.createdBy === currentProfileId;
                const canDelete = isServerOwner || isCreator;

                return (
                  <div key={trip.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{trip.name}</h3>
                      {canDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTrip(trip.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Trip
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Destination:</span> {trip.destination}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {trip.timeInterval}
                      </div>
                      <div>
                        <span className="font-medium">Budget:</span> {trip.budget}
                      </div>
                      <div>
                        <span className="font-medium">Members:</span> {trip.members.length}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Places to Visit:</span>
                      <p className="mt-1">{trip.placesToVisit}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created by: {isCreator ? 'You' : trip.createdBy}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedChannel(trip.channelId);
                        setShowManageTripsDialog(false);
                      }}
                      className="mt-2"
                    >
                      View Trip Channel
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
};


export default MainPage;
