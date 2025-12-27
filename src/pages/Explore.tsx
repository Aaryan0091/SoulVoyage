import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ArrowLeft, Globe, Search, Lock, Globe2, Users } from "lucide-react";
import Globe3D from "@/components/Globe3D";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, getDocs, setDoc, doc, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface Server {
  id: string;
  name: string;
  place?: string;
  description?: string;
  isPublic: boolean;
  icon?: string;
  owner?: string;
  members?: number;
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningServerId, setJoiningServerId] = useState<string | null>(null);

  // Tour state
  const [runTour, setRunTour] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Check if tour should be shown
  useEffect(() => {
    const savedTourState = sessionStorage.getItem('soulvoyage_tour_state');
    if (savedTourState) {
      setShowTour(true);
      setTimeout(() => setRunTour(true), 300);
    }
  }, []);

  // Check if user came from main page and prevent refresh loop
  useEffect(() => {
    // Check if this is a direct load/refresh of explore page
    const cameFromMain = sessionStorage.getItem('cameFromMain');

    if (!cameFromMain) {
      // If user didn't come from main page, redirect back
      navigate("/main");
    } else {
      // Clear the flag so refresh will redirect
      sessionStorage.removeItem('cameFromMain');
    }
  }, [navigate]);

  // Fetch servers from Firestore
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const q = query(collection(db, "servers"));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const serversData: Server[] = [];

          for (const doc of snapshot.docs) {
            const serverData = doc.data();
            
            // Count members in the server
            const membersQuery = query(
              collection(db, `servers/${doc.id}/members`)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const memberCount = membersSnapshot.size;

            serversData.push({
              id: doc.id,
              name: serverData.name,
              place: serverData.place || "Unknown Location",
              description: serverData.description || "No description",
              isPublic: serverData.isPublic !== undefined ? serverData.isPublic : true,
              icon: serverData.icon,
              owner: serverData.owner,
              members: memberCount,
            });
          }

          // Sort by members (popular first)
          serversData.sort((a, b) => (b.members || 0) - (a.members || 0));
          setServers(serversData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching servers:", error);
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  // Filter servers based on search query
  const filteredServers = servers.filter((server) =>
    server.place?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinServer = async (serverId: string, serverName: string, isPublic: boolean) => {
    if (!currentProfile || !auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to join a server",
        variant: "destructive",
      });
      return;
    }

    setJoiningServerId(serverId);

    try {
      // Check if user is already a member
      const memberQuery = query(
        collection(db, "servers", serverId, "members"),
        where("userId", "==", auth.currentUser.uid)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (!memberSnapshot.empty) {
        toast({
          title: "Already a member",
          description: `You're already a member of ${serverName}`,
        });
        setJoiningServerId(null);
        return;
      }

      // For private servers, create a join request
      if (!isPublic) {
        // Check if user has already sent a request
        const requestQuery = query(
          collection(db, "serverJoinRequests"),
          where("serverId", "==", serverId),
          where("requesterId", "==", auth.currentUser.uid),
          where("status", "==", "pending")
        );
        const requestSnapshot = await getDocs(requestQuery);

        if (!requestSnapshot.empty) {
          toast({
            title: "Request Already Sent",
            description: "You have already sent a request to join this server",
          });
          setJoiningServerId(null);
          return;
        }

        // Create the join request
        const requestData = {
          serverId,
          serverName,
          requesterId: auth.currentUser.uid,
          requesterName: currentProfile?.name || "Unknown",
          requesterAvatar: currentProfile?.avatarUrl || "",
          status: "pending",
          createdAt: new Date(),
        };

        console.log("Creating join request:", requestData);
        await setDoc(doc(collection(db, "serverJoinRequests")), requestData);

        toast({
          title: "Request Sent",
          description: `Your request to join ${serverName} has been sent to the owner`,
        });
      } else {
        // For public servers, join directly
        await setDoc(doc(db, "servers", serverId, "members", auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          joinedAt: new Date(),
          role: "member",
        });

        toast({
          title: "Success!",
          description: `You've joined ${serverName}`,
        });

        // Navigate to the server after a short delay
        setTimeout(() => {
          navigate("/main");
        }, 1000);
      }

      setJoiningServerId(null);
    } catch (error) {
      console.error("Error joining server:", error);
      setJoiningServerId(null);
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/main")}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Explore Servers</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold mb-2">Discover Servers</h2>
            <p className="text-muted-foreground mb-8">
              Explore and join amazing communities on SoulVoyage
            </p>
          </div>

          {/* 3D Globe */}
          <div 
            className="rounded-lg border border-border overflow-hidden mb-8"
            style={{ touchAction: 'none' }}
          >
            <Globe3D />
          </div>

          {/* Search Section */}
          <div className="mt-8 mb-8">
            <div className="flex gap-2 max-w-md">
              <Input
                type="text"
                placeholder="Search servers by place or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Found {filteredServers.length} server{filteredServers.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Popular Servers Section */}
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-6">
              {searchQuery ? "Search Results" : "Popular Servers"}
            </h3>

            {loading && servers.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground mt-4">Searching for servers...</p>
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="text-center py-12">
                <Globe2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `No servers found for "${searchQuery}"`
                    : "No existing servers right now"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServers.map((server) => (
                  <div
                    key={server.id}
                    className="border border-border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-200"
                  >
                    {/* Server Card */}
                    <div
                      className="p-6 cursor-pointer"
                      onClick={() =>
                        setExpandedServerId(
                          expandedServerId === server.id ? null : server.id
                        )
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{server.name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Globe2 className="h-4 w-4" />
                            {server.place}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {server.isPublic ? (
                            <div title="Public Server">
                              <Globe2 className="h-5 w-5 text-primary" />
                            </div>
                          ) : (
                            <div title="Private Server">
                              <Lock className="h-5 w-5 text-yellow-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {server.description}
                      </p>

                      {/* Members Count */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{server.members || 0} members</span>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {expandedServerId === server.id && (
                      <div className="border-t border-border px-6 py-4 bg-card/30 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {server.isPublic
                            ? "Public server - Click to join and start exploring!"
                            : "Private server - Only accessible through direct invitation from the owner"}
                        </p>
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => handleJoinServer(server.id, server.name, server.isPublic)}
                          disabled={joiningServerId === server.id}
                          variant={!server.isPublic ? "secondary" : "default"}
                        >
                          {joiningServerId === server.id
                            ? !server.isPublic ? "Requesting..." : "Joining..."
                            : !server.isPublic ? "Request to Join" : "Join This Server"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          run={runTour}
          onTourComplete={() => {
            setShowTour(false);
            setRunTour(false);
            // Navigation is handled by OnboardingTour
          }}
          isExplorePage={true}
        />
      )}
    </div>
  );
};

export default Explore;
