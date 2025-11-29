import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Plus, Trash2, Edit2, Users, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TeamPreset, AudioSettings, AccentPresetType } from "@shared/schema";
import { defaultAudioSettings, accentPresetConfigs } from "@shared/schema";

const presetGroups = {
  "Basic": ["neutral", "deeper", "higher", "warm", "clear"],
  "Regional": ["british", "australian", "southern_us", "midwest_us", "new_york"],
};

export function TeamPresetsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TeamPreset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AudioSettings>(defaultAudioSettings);
  const { toast } = useToast();

  const { data: teamPresets = [], isLoading } = useQuery<TeamPreset[]>({
    queryKey: ["/api/team-presets"],
  });

  const createPresetMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; isActive: boolean; audioSettings: AudioSettings }) => {
      return apiRequest("POST", "/api/team-presets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-presets"] });
      resetForm();
      toast({
        title: "Team preset created",
        description: "The preset is now available to all agents.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePresetMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TeamPreset> }) => {
      return apiRequest("PATCH", `/api/team-presets/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-presets"] });
      resetForm();
      toast({
        title: "Preset updated",
        description: "Changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      return apiRequest("DELETE", `/api/team-presets/${presetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-presets"] });
      toast({
        title: "Preset deleted",
        description: "The team preset has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setPresetName("");
    setPresetDescription("");
    setIsActive(true);
    setSettings(defaultAudioSettings);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (preset: TeamPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetDescription(preset.description || "");
    setIsActive(preset.isActive);
    setSettings(preset.audioSettings);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the preset.",
        variant: "destructive",
      });
      return;
    }

    if (editingPreset) {
      updatePresetMutation.mutate({
        id: editingPreset.id,
        updates: {
          name: presetName.trim(),
          description: presetDescription.trim() || undefined,
          isActive,
          audioSettings: settings,
        },
      });
    } else {
      createPresetMutation.mutate({
        name: presetName.trim(),
        description: presetDescription.trim() || undefined,
        isActive,
        audioSettings: settings,
      });
    }
  };

  const handleSettingsChange = (newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const togglePresetActive = (preset: TeamPreset) => {
    updatePresetMutation.mutate({
      id: preset.id,
      updates: { isActive: !preset.isActive },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Team Presets
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} data-testid="button-create-team-preset">
                <Plus className="w-4 h-4 mr-2" />
                Create Preset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPreset ? "Edit Team Preset" : "Create Team Preset"}</DialogTitle>
                <DialogDescription>
                  {editingPreset 
                    ? "Update the team-wide voice preset settings." 
                    : "Create a voice preset that will be available to all agents on your team."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="e.g., Professional Call, Warm & Friendly"
                      data-testid="input-team-preset-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-desc">Description (optional)</Label>
                    <Input
                      id="preset-desc"
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      placeholder="When to use this preset"
                      data-testid="input-team-preset-description"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Only active presets are visible to agents
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    data-testid="switch-team-preset-active"
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Audio Settings</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Noise Reduction</Label>
                        <Switch
                          checked={settings.noiseReductionEnabled}
                          onCheckedChange={(checked) => handleSettingsChange({ noiseReductionEnabled: checked })}
                        />
                      </div>
                      {settings.noiseReductionEnabled && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Level</span>
                            <span>{settings.noiseReductionLevel}%</span>
                          </div>
                          <Slider
                            value={[settings.noiseReductionLevel]}
                            onValueChange={([value]) => handleSettingsChange({ noiseReductionLevel: value })}
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Voice Modifier</Label>
                        <Switch
                          checked={settings.accentModifierEnabled}
                          onCheckedChange={(checked) => handleSettingsChange({ accentModifierEnabled: checked })}
                        />
                      </div>
                      {settings.accentModifierEnabled && (
                        <Select
                          value={settings.accentPreset}
                          onValueChange={(value: AccentPresetType) => {
                            const config = accentPresetConfigs[value];
                            handleSettingsChange({
                              accentPreset: value,
                              pitchShift: config.pitchShift,
                              formantShift: config.formantShift,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(presetGroups).map(([group, presets]) => (
                              <div key={group}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group}</div>
                                {presets.map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {settings.accentModifierEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Pitch</span>
                          <span>{settings.pitchShift > 0 ? "+" : ""}{settings.pitchShift} st</span>
                        </div>
                        <Slider
                          value={[settings.pitchShift]}
                          onValueChange={([value]) => handleSettingsChange({ pitchShift: value })}
                          max={12}
                          min={-12}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Formant</span>
                          <span>{(settings.formantShift || 0) > 0 ? "+" : ""}{settings.formantShift || 0}%</span>
                        </div>
                        <Slider
                          value={[settings.formantShift || 0]}
                          onValueChange={([value]) => handleSettingsChange({ formantShift: value })}
                          max={50}
                          min={-50}
                          step={5}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Clarity Boost</span>
                        <span>{settings.clarityBoost || 0}%</span>
                      </div>
                      <Slider
                        value={[settings.clarityBoost || 0]}
                        onValueChange={([value]) => handleSettingsChange({ clarityBoost: value })}
                        max={100}
                        min={0}
                        step={5}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label className="text-sm">Volume Normalization</Label>
                      <Switch
                        checked={settings.volumeNormalization || false}
                        onCheckedChange={(checked) => handleSettingsChange({ volumeNormalization: checked })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Input Gain</span>
                        <span>{settings.inputGain}%</span>
                      </div>
                      <Slider
                        value={[settings.inputGain]}
                        onValueChange={([value]) => handleSettingsChange({ inputGain: value })}
                        max={200}
                        min={0}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Output Gain</span>
                        <span>{settings.outputGain}%</span>
                      </div>
                      <Slider
                        value={[settings.outputGain]}
                        onValueChange={([value]) => handleSettingsChange({ outputGain: value })}
                        max={200}
                        min={0}
                        step={5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={createPresetMutation.isPending || updatePresetMutation.isPending}
                  data-testid="button-save-team-preset"
                >
                  {(createPresetMutation.isPending || updatePresetMutation.isPending) 
                    ? "Saving..." 
                    : (editingPreset ? "Save Changes" : "Create Preset")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading team presets...
          </div>
        ) : teamPresets.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No team presets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create presets that all agents can use for consistent voice settings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamPresets.map((preset) => (
              <div 
                key={preset.id}
                className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                data-testid={`team-preset-item-${preset.id}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{preset.name}</span>
                      {preset.isActive ? (
                        <Badge variant="default" className="shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {preset.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {preset.audioSettings.noiseReductionEnabled && (
                        <span className="text-xs text-muted-foreground">Noise: {preset.audioSettings.noiseReductionLevel}%</span>
                      )}
                      {preset.audioSettings.accentModifierEnabled && (
                        <span className="text-xs text-muted-foreground">Voice: {preset.audioSettings.accentPreset}</span>
                      )}
                      {(preset.audioSettings.clarityBoost || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">Clarity: {preset.audioSettings.clarityBoost}%</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => togglePresetActive(preset)}
                    title={preset.isActive ? "Deactivate" : "Activate"}
                    data-testid={`button-toggle-preset-${preset.id}`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${preset.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenEdit(preset)}
                    data-testid={`button-edit-preset-${preset.id}`}
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deletePresetMutation.mutate(preset.id)}
                    disabled={deletePresetMutation.isPending}
                    data-testid={`button-delete-preset-${preset.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
