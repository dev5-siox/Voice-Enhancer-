import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgentCard } from "@/components/agent-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Mic, 
  Phone,
  Activity
} from "lucide-react";
import type { Agent, AgentStatusType } from "@shared/schema";

export default function AdminPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatusType | "all">("all");

  const { data: agents = [], isLoading, refetch, isRefetching } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 5000,
  });

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.email && agent.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const online = agents.filter((a) => a.status === "online").length;
    const busy = agents.filter((a) => a.status === "busy").length;
    const processing = agents.filter((a) => a.isProcessingActive).length;
    return { total: agents.length, online, busy, processing };
  }, [agents]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Team Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor audio processing status for all agents
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-agents"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-total-agents">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-status-online/10">
                  <Activity className="w-5 h-5 text-status-online" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-online-agents">{stats.online}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-status-busy/10">
                  <Phone className="w-5 h-5 text-status-busy" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-busy-agents">{stats.busy}</p>
                  <p className="text-xs text-muted-foreground">On Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-processing-agents">{stats.processing}</p>
                  <p className="text-xs text-muted-foreground">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-agents"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as AgentStatusType | "all")}
              >
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No agents found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "No agents have been registered yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredAgents.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
        )}
      </div>
    </div>
  );
}
