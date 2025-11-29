import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Save, Trash2, User, Users, Plus, Building2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AudioSettings, CustomProfile, TeamPreset } from "@shared/schema";

interface CustomProfilesProps {
  agentId: string;
  currentSettings: AudioSettings;
  onApplyProfile: (settings: AudioSettings) => void;
}

export function CustomProfiles({
  agentId,
  currentSettings,
  onApplyProfile,
}: CustomProfilesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [activeTab, setActiveTab] = useState("my-profiles");
  const { toast } = useToast();

  const { data: myProfiles = [], isLoading: loadingMyProfiles } = useQuery<CustomProfile[]>({
    queryKey: ["/api/agents", agentId, "profiles"],
  });

  const { data: sharedProfiles = [], isLoading: loadingShared } = useQuery<CustomProfile[]>({
    queryKey: ["/api/profiles/shared"],
  });

  const { data: teamPresets = [], isLoading: loadingTeamPresets } = useQuery<TeamPreset[]>({
    queryKey: ["/api/team-presets/active"],
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: { name: string; isShared: boolean; audioSettings: AudioSettings }) => {
      return apiRequest("POST", "/api/profiles", {
        agentId,
        name: data.name,
        isShared: data.isShared,
        audioSettings: data.audioSettings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/shared"] });
      setIsDialogOpen(false);
      setProfileName("");
      setIsShared(false);
      toast({
        title: "Profile saved",
        description: "Your custom voice profile has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return apiRequest("DELETE", `/api/profiles/${profileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/shared"] });
      toast({
        title: "Profile deleted",
        description: "The voice profile has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your profile.",
        variant: "destructive",
      });
      return;
    }

    createProfileMutation.mutate({
      name: profileName.trim(),
      isShared,
      audioSettings: currentSettings,
    });
  };

  const handleApplyProfile = (profile: CustomProfile) => {
    onApplyProfile(profile.audioSettings);
    toast({
      title: "Profile applied",
      description: `Applied "${profile.name}" voice profile.`,
    });
  };

  const handleApplyTeamPreset = (preset: TeamPreset) => {
    onApplyProfile(preset.audioSettings);
    toast({
      title: "Team preset applied",
      description: `Applied "${preset.name}" team preset.`,
    });
  };

  const allProfiles = [...myProfiles, ...sharedProfiles.filter((sp) => sp.agentId !== agentId)];
  const isProfilesLoading = loadingMyProfiles || loadingShared;
  const isTeamPresetsLoading = loadingTeamPresets;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Save className="w-4 h-4" />
            Custom Profiles
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-save-profile">
                <Plus className="w-4 h-4 mr-1" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Voice Profile</DialogTitle>
                <DialogDescription>
                  Save your current voice settings as a custom profile that you can apply later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Profile Name</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g., Morning Calls, Client Meeting"
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="share-profile"
                    checked={isShared}
                    onCheckedChange={(checked) => setIsShared(checked === true)}
                    data-testid="checkbox-share-profile"
                  />
                  <label
                    htmlFor="share-profile"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Share with team
                  </label>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p className="font-medium">Current Settings Preview:</p>
                  <ul className="text-muted-foreground text-xs space-y-1">
                    <li>Noise Reduction: {currentSettings.noiseReductionEnabled ? `${currentSettings.noiseReductionLevel}%` : "Off"}</li>
                    <li>Voice Modifier: {currentSettings.accentModifierEnabled ? currentSettings.accentPreset : "Off"}</li>
                    <li>Pitch: {currentSettings.pitchShift > 0 ? "+" : ""}{currentSettings.pitchShift} st</li>
                    <li>Formant: {(currentSettings.formantShift || 0) > 0 ? "+" : ""}{currentSettings.formantShift || 0}%</li>
                    <li>Clarity: {currentSettings.clarityBoost || 0}%</li>
                    <li>Volume Norm: {currentSettings.volumeNormalization ? "On" : "Off"}</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={createProfileMutation.isPending}
                  data-testid="button-confirm-save-profile"
                >
                  {createProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="my-profiles" className="flex-1" data-testid="tab-my-profiles">
              <User className="w-3 h-3 mr-1" />
              My Profiles
            </TabsTrigger>
            <TabsTrigger value="team-presets" className="flex-1" data-testid="tab-team-presets">
              <Building2 className="w-3 h-3 mr-1" />
              Team Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-profiles" className="mt-0">
            {isProfilesLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading profiles...
              </div>
            ) : allProfiles.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No saved profiles yet. Save your current settings to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {allProfiles.map((profile) => (
                  <div 
                    key={profile.id}
                    className="flex items-center justify-between p-2 rounded-md border hover-elevate"
                    data-testid={`profile-item-${profile.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => handleApplyProfile(profile)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        data-testid={`button-apply-profile-${profile.id}`}
                      >
                        <span className="text-sm font-medium truncate">{profile.name}</span>
                        {profile.isShared && (
                          <Badge variant="secondary" className="shrink-0">
                            <Users className="w-3 h-3 mr-1" />
                            Team
                          </Badge>
                        )}
                        {profile.agentId === agentId && !profile.isShared && (
                          <Badge variant="outline" className="shrink-0">
                            <User className="w-3 h-3 mr-1" />
                            Mine
                          </Badge>
                        )}
                      </button>
                    </div>
                    {profile.agentId === agentId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 h-8 w-8"
                        onClick={() => deleteProfileMutation.mutate(profile.id)}
                        disabled={deleteProfileMutation.isPending}
                        data-testid={`button-delete-profile-${profile.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team-presets" className="mt-0">
            {isTeamPresetsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading team presets...
              </div>
            ) : teamPresets.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No team presets available. Ask your admin to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {teamPresets.map((preset) => (
                  <div 
                    key={preset.id}
                    className="flex items-center justify-between p-2 rounded-md border hover-elevate"
                    data-testid={`team-preset-${preset.id}`}
                  >
                    <button
                      onClick={() => handleApplyTeamPreset(preset)}
                      className="flex flex-col flex-1 min-w-0 text-left"
                      data-testid={`button-apply-team-preset-${preset.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{preset.name}</span>
                        <Badge variant="default" className="shrink-0">
                          <Building2 className="w-3 h-3 mr-1" />
                          Team
                        </Badge>
                      </div>
                      {preset.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {preset.description}
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
