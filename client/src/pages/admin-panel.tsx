import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgentCard } from "@/components/agent-card";
import { TeamPresetsManager } from "@/components/team-presets-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Activity,
  Volume2,
  AudioWaveform,
  BarChart3,
  PieChart,
  Sparkles,
  Settings
} from "lucide-react";
import type { Agent, AgentStatusType } from "@shared/schema";

interface TeamStats {
  total: number;
  online: number;
  busy: number;
  away: number;
  offline: number;
  processing: number;
  noiseReductionActive: number;
  accentModifierActive: number;
  presetUsage: Record<string, number>;
  avgNoiseReduction: number;
  avgClarityBoost: number;
  volumeNormalizationCount: number;
}

const presetLabels: Record<string, string> = {
  neutral: "Neutral",
  deeper: "Deeper Voice",
  higher: "Higher Voice",
  warm: "Warm Tone",
  clear: "Clear Tone",
  british: "British",
  australian: "Australian",
  southern_us: "Southern US",
  midwest_us: "Midwest US",
  new_york: "New York",
};

export default function AdminPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatusType | "all">("all");
  const [activeTab, setActiveTab] = useState("agents");

  const { data: agents = [], isLoading, refetch, isRefetching } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 5000,
  });

  const { data: teamStats, isLoading: statsLoading } = useQuery<TeamStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
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

  const sortedPresetUsage = useMemo(() => {
    if (!teamStats?.presetUsage) return [];
    return Object.entries(teamStats.presetUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [teamStats]);

  const maxPresetCount = useMemo(() => {
    if (sortedPresetUsage.length === 0) return 1;
    return Math.max(...sortedPresetUsage.map(([, count]) => count));
  }, [sortedPresetUsage]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Team Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor audio processing status and analytics for all agents
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
                <div className="p-2 rounded-md bg-green-500/10">
                  <Activity className="w-5 h-5 text-green-500" />
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
                <div className="p-2 rounded-md bg-yellow-500/10">
                  <Phone className="w-5 h-5 text-yellow-500" />
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents" data-testid="tab-agents">
              <Users className="w-4 h-4 mr-2" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Team Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
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

            {!isLoading && filteredAgents.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Showing {filteredAgents.length} of {agents.length} agents
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-40 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : teamStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-500/10">
                          <Volume2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold" data-testid="stat-noise-reduction">{teamStats.noiseReductionActive}</p>
                          <p className="text-xs text-muted-foreground">Noise Reduction</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-purple-500/10">
                          <AudioWaveform className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold" data-testid="stat-accent-modifier">{teamStats.accentModifierActive}</p>
                          <p className="text-xs text-muted-foreground">Voice Modifier</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-cyan-500/10">
                          <Sparkles className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold" data-testid="stat-clarity-boost">{teamStats.avgClarityBoost}%</p>
                          <p className="text-xs text-muted-foreground">Avg Clarity Boost</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-orange-500/10">
                          <BarChart3 className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold" data-testid="stat-volume-norm">{teamStats.volumeNormalizationCount}</p>
                          <p className="text-xs text-muted-foreground">Volume Norm</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <PieChart className="w-4 h-4" />
                        Voice Preset Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sortedPresetUsage.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No preset data available
                        </p>
                      ) : (
                        sortedPresetUsage.map(([preset, count]) => (
                          <div key={preset} className="space-y-1" data-testid={`preset-usage-${preset}`}>
                            <div className="flex items-center justify-between text-sm">
                              <span>{presetLabels[preset] || preset}</span>
                              <span className="text-muted-foreground">{count} agents</span>
                            </div>
                            <Progress 
                              value={(count / maxPresetCount) * 100} 
                              className="h-2"
                            />
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="w-4 h-4" />
                        Feature Adoption
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Noise Reduction</span>
                          <span className="text-muted-foreground">
                            {teamStats.noiseReductionActive}/{teamStats.total} ({Math.round((teamStats.noiseReductionActive / teamStats.total) * 100)}%)
                          </span>
                        </div>
                        <Progress 
                          value={(teamStats.noiseReductionActive / teamStats.total) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Voice Modifier</span>
                          <span className="text-muted-foreground">
                            {teamStats.accentModifierActive}/{teamStats.total} ({Math.round((teamStats.accentModifierActive / teamStats.total) * 100)}%)
                          </span>
                        </div>
                        <Progress 
                          value={(teamStats.accentModifierActive / teamStats.total) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Volume Normalization</span>
                          <span className="text-muted-foreground">
                            {teamStats.volumeNormalizationCount}/{teamStats.total} ({Math.round((teamStats.volumeNormalizationCount / teamStats.total) * 100)}%)
                          </span>
                        </div>
                        <Progress 
                          value={(teamStats.volumeNormalizationCount / teamStats.total) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span>Avg Noise Reduction Level</span>
                          <span className="font-medium">{teamStats.avgNoiseReduction}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span>Avg Clarity Boost</span>
                          <span className="font-medium">{teamStats.avgClarityBoost}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="w-4 h-4" />
                      Agent Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-md bg-green-500/10">
                        <p className="text-3xl font-semibold text-green-600 dark:text-green-400">{teamStats.online}</p>
                        <p className="text-sm text-muted-foreground mt-1">Online</p>
                      </div>
                      <div className="text-center p-4 rounded-md bg-yellow-500/10">
                        <p className="text-3xl font-semibold text-yellow-600 dark:text-yellow-400">{teamStats.busy}</p>
                        <p className="text-sm text-muted-foreground mt-1">Busy</p>
                      </div>
                      <div className="text-center p-4 rounded-md bg-orange-500/10">
                        <p className="text-3xl font-semibold text-orange-600 dark:text-orange-400">{teamStats.away}</p>
                        <p className="text-sm text-muted-foreground mt-1">Away</p>
                      </div>
                      <div className="text-center p-4 rounded-md bg-muted">
                        <p className="text-3xl font-semibold text-muted-foreground">{teamStats.offline}</p>
                        <p className="text-sm text-muted-foreground mt-1">Offline</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <TeamPresetsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
