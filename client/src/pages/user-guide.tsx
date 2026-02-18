import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mic,
  Volume2,
  Headphones,
  Monitor,
  Settings,
  Users,
  BarChart3,
  Save,
  CirclePlay,
  CircleStop,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  HelpCircle,
  Sliders,
  AudioWaveform,
  Cable,
  Shield,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function SectionHeading({ icon: Icon, title, id }: { icon: any; title: string; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-16">
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
    </div>
  );
}

function TableOfContents() {
  const sections = [
    { id: "overview", label: "Product Overview" },
    { id: "getting-started", label: "Getting Started" },
    { id: "dashboard", label: "Agent Dashboard" },
    { id: "presets", label: "Voice Presets Reference" },
    { id: "profiles", label: "Custom Profiles" },
    { id: "admin", label: "Admin Panel" },
    { id: "setup", label: "Call App Setup" },
    { id: "troubleshooting", label: "Troubleshooting" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <Card data-testid="card-toc">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Table of Contents</CardTitle>
      </CardHeader>
      <CardContent>
        <nav className="flex flex-col gap-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm text-muted-foreground hover-elevate rounded-md px-3 py-1.5 transition-colors"
              data-testid={`link-toc-${s.id}`}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}

export default function UserGuide() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" data-testid="page-user-guide">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-guide-title">VoxFilter User Guide</h1>
        <p className="text-muted-foreground mt-1">Complete documentation for the audio processing companion application</p>
      </div>

      <TableOfContents />

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={AudioWaveform} title="Product Overview" id="overview" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">
              VoxFilter is a browser-based audio processing companion application designed for sales teams making outbound calls. It provides real-time voice enhancement, noise reduction, and accent modification to help agents sound their professional best on every call.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">For Sales Agents</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Real-time noise reduction</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> 21 voice presets including accents and personas</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Clarity boost and volume normalization</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Custom profiles to save settings</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Session recording (local download)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">For Administrators</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Real-time team monitoring</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Team-wide preset management</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Analytics dashboard</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">How It Works</h4>
              <p className="text-sm text-muted-foreground">VoxFilter captures your microphone audio and processes it through a real-time pipeline:</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">High-pass filter</Badge>
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
                <Badge variant="secondary">Hum removal</Badge>
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
                <Badge variant="secondary">Low-pass filter</Badge>
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
                <Badge variant="secondary">Formant shifting</Badge>
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
                <Badge variant="secondary">Compressor</Badge>
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
                <Badge variant="secondary">Clarity boost</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={CirclePlay} title="Getting Started" id="getting-started" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium">First-Time Setup</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
              <li>Open VoxFilter in your web browser (Chrome recommended)</li>
              <li>Enter your name in the welcome dialog to register</li>
              <li>Click <strong>"Get Started"</strong> to access your dashboard</li>
              <li>Allow microphone access when your browser asks</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              <strong>Returning users:</strong> VoxFilter remembers you automatically. Your browser stores your agent ID locally, so you'll go straight to your dashboard with saved settings.
            </p>
            <h4 className="font-medium pt-2">Quick Start Checklist</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><span className="w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 text-xs">1</span> Register with your name (first time only)</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 text-xs">2</span> Click "Start Audio Processing" to enable your microphone</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 text-xs">3</span> Enable Noise Reduction (recommended)</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 text-xs">4</span> Choose a Voice Preset for your calling style</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 text-xs">5</span> Save settings as a Custom Profile for easy recall</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={Sliders} title="Agent Dashboard Guide" id="dashboard" />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Mic className="w-4 h-4" /> Audio Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Control</th>
                    <th className="text-left py-2 font-medium">Function</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Start Audio Processing</td><td className="py-2">Enables microphone capture and processing</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Stop</td><td className="py-2">Disables audio processing</td></tr>
                  <tr><td className="py-2 pr-4">Record</td><td className="py-2">Records processed audio (requires active processing). Saved locally.</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Noise Reduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Reduces unwanted background sounds while preserving voice clarity.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Setting</th>
                    <th className="text-left py-2 pr-4 font-medium">Range</th>
                    <th className="text-left py-2 font-medium">Recommended</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Enable/Disable</td><td className="py-2 pr-4">On/Off</td><td className="py-2">On</td></tr>
                  <tr><td className="py-2 pr-4">Intensity</td><td className="py-2 pr-4">0-100%</td><td className="py-2">50% normal, 75%+ noisy</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Filters: keyboard clicks, AC hum, fan noise, traffic, background chatter. Start at 50% and increase if needed.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Mic className="w-4 h-4" /> Voice Modifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Transform your voice with professional presets or manual fine-tuning.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Manual Control</th>
                    <th className="text-left py-2 pr-4 font-medium">Range</th>
                    <th className="text-left py-2 font-medium">Effect</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Pitch Shift</td><td className="py-2 pr-4">-12 to +12 semitones</td><td className="py-2">Raises or lowers voice pitch</td></tr>
                  <tr><td className="py-2 pr-4">Formant Shift</td><td className="py-2 pr-4">-50% to +50%</td><td className="py-2">Positive = brighter, Negative = warmer</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Volume2 className="w-4 h-4" /> Voice Enhancement & Volume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Control</th>
                    <th className="text-left py-2 pr-4 font-medium">Range</th>
                    <th className="text-left py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Clarity Boost</td><td className="py-2 pr-4">0-100%</td><td className="py-2">Enhances vocal frequencies. Start at 25-50%</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Volume Normalization</td><td className="py-2 pr-4">On/Off</td><td className="py-2">Maintains consistent volume. Recommended: On</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Input Gain</td><td className="py-2 pr-4">0-200%</td><td className="py-2">Microphone sensitivity. Default: 100%</td></tr>
                  <tr><td className="py-2 pr-4">Output Gain</td><td className="py-2 pr-4">0-200%</td><td className="py-2">Final output volume. Default: 100%</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={Headphones} title="Voice Presets Reference" id="presets" />

        <Card>
          <CardHeader><CardTitle className="text-base">Basic Presets (5)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Preset</th>
                    <th className="text-left py-2 pr-4 font-medium">Pitch</th>
                    <th className="text-left py-2 pr-4 font-medium">Formant</th>
                    <th className="text-left py-2 font-medium">Best For</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Neutral</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">0%</td><td className="py-2">Natural voice, no changes</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Deeper</td><td className="py-2 pr-4">-3</td><td className="py-2 pr-4">-15%</td><td className="py-2">Authority, leadership calls</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Higher</td><td className="py-2 pr-4">+3</td><td className="py-2 pr-4">+15%</td><td className="py-2">Energy, enthusiasm</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Warm</td><td className="py-2 pr-4">-1</td><td className="py-2 pr-4">-5%</td><td className="py-2">Relationship building</td></tr>
                  <tr><td className="py-2 pr-4">Clear</td><td className="py-2 pr-4">+1</td><td className="py-2 pr-4">+5%</td><td className="py-2">Technical explanations</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">American Accent Presets (8)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Preset</th>
                    <th className="text-left py-2 pr-4 font-medium">Pitch</th>
                    <th className="text-left py-2 pr-4 font-medium">Formant</th>
                    <th className="text-left py-2 font-medium">Characteristics</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Midwest US</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+3%</td><td className="py-2">Neutral American standard</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">California</td><td className="py-2 pr-4">+1</td><td className="py-2 pr-4">+6%</td><td className="py-2">Bright, relaxed, upbeat</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Pacific NW</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+4%</td><td className="py-2">Clean, neutral, professional</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Mid-Atlantic</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+5%</td><td className="py-2">Polished, refined speech</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Southern US</td><td className="py-2 pr-4">-2</td><td className="py-2 pr-4">-8%</td><td className="py-2">Warm, friendly drawl</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Texas</td><td className="py-2 pr-4">-2</td><td className="py-2 pr-4">-10%</td><td className="py-2">Bold, distinctive presence</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">New York</td><td className="py-2 pr-4">+1</td><td className="py-2 pr-4">+12%</td><td className="py-2">Direct, energetic</td></tr>
                  <tr><td className="py-2 pr-4">Boston</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+8%</td><td className="py-2">Classic, distinctive</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">International Presets (2)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Preset</th>
                    <th className="text-left py-2 pr-4 font-medium">Pitch</th>
                    <th className="text-left py-2 pr-4 font-medium">Formant</th>
                    <th className="text-left py-2 font-medium">Characteristics</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">British</td><td className="py-2 pr-4">+3</td><td className="py-2 pr-4">+22%</td><td className="py-2">Stronger crispness (tone shaping)</td></tr>
                  <tr><td className="py-2 pr-4">Australian</td><td className="py-2 pr-4">+3</td><td className="py-2 pr-4">+18%</td><td className="py-2">Stronger brightness (tone shaping)</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Voice Character Presets (6)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Preset</th>
                    <th className="text-left py-2 pr-4 font-medium">Pitch</th>
                    <th className="text-left py-2 pr-4 font-medium">Formant</th>
                    <th className="text-left py-2 font-medium">Best For</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-2 pr-4">Professional</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+3%</td><td className="py-2">Business calls, formal meetings</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Confident</td><td className="py-2 pr-4">0</td><td className="py-2 pr-4">+2%</td><td className="py-2">Sales pitches, negotiations</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Authoritative</td><td className="py-2 pr-4">-2</td><td className="py-2 pr-4">-12%</td><td className="py-2">Leadership, decision calls</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Friendly</td><td className="py-2 pr-4">+1</td><td className="py-2 pr-4">+5%</td><td className="py-2">Customer service, warm outreach</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">Calm</td><td className="py-2 pr-4">-1</td><td className="py-2 pr-4">-3%</td><td className="py-2">Difficult conversations</td></tr>
                  <tr><td className="py-2 pr-4">Energetic</td><td className="py-2 pr-4">+2</td><td className="py-2 pr-4">+10%</td><td className="py-2">Cold calls, high-energy pitches</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={Save} title="Custom Profiles" id="profiles" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Custom Profiles let you save your current audio settings under a memorable name and switch between them instantly for different call types.
            </p>
            <h4 className="font-medium">Creating a Profile</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-5">
              <li>Configure all your audio settings exactly how you want them</li>
              <li>Click the <strong>Save</strong> button (disk icon) in the Custom Profiles card</li>
              <li>Enter a descriptive name (e.g., "Enterprise Calls", "Cold Outreach")</li>
              <li>Optionally check "Share with team" to let colleagues use your profile</li>
              <li>Click <strong>Save Profile</strong></li>
            </ol>
            <h4 className="font-medium pt-2">Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Create separate profiles for different call types</li>
              <li>Name profiles descriptively ("Enterprise - Calm" vs "Startup - Energetic")</li>
              <li>Share profiles that work well so teammates can benefit</li>
              <li>Regularly update profiles as you refine your settings</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={Users} title="Admin Panel Guide" id="admin" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Access the Admin Panel by clicking <strong>"Team Monitor"</strong> in the sidebar.
            </p>
            <h4 className="font-medium">Team Monitor Tab</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>View all agents in a card-based layout showing name, status, processing status, active features, and current preset</li>
              <li>Search by name or email, filter by status (Online, Busy, Away, Offline)</li>
              <li>Real-time stats: total agents, online count, busy count, active processing count</li>
            </ul>
            <h4 className="font-medium pt-2">Analytics Tab</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Feature adoption rates (noise reduction, accent modifier, clarity boost, volume normalization)</li>
              <li>Voice preset popularity with progress bars</li>
              <li>Agent status distribution chart</li>
            </ul>
            <h4 className="font-medium pt-2">Team Presets Tab</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-5">
              <li>Click <strong>Create Preset</strong> and enter a name and description</li>
              <li>Configure all audio settings for the preset</li>
              <li>Toggle <strong>Active</strong> to make it visible to agents</li>
              <li>Edit or delete presets at any time</li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={Cable} title="Call App Setup (RingCentral / Zoom / Teams / Meet)" id="setup" />

        <Card>
          <CardHeader><CardTitle className="text-base">Step 0 (Recommended): Install VoxFilter Desktop App (.exe)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              For real calls, the desktop app is the most reliable way to route processed audio into a call app.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Download from GitHub Releases: <strong>VoxFilter-{"<version>"}-Windows.exe</strong></li>
              <li>Install and launch VoxFilter Desktop App</li>
              <li>Then follow the Windows/Mac setup steps below</li>
            </ul>
            <a
              href="https://github.com/herrychokshi-ops/VoxFilter-Downloads/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              data-testid="link-desktop-download"
            >
              Download VoxFilter Desktop App (.exe)
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Windows Setup (VB-Audio Virtual Cable)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">Step 1: Install VB-Audio Virtual Cable</h4>
                <p className="text-sm text-muted-foreground">Download from <a href="https://vb-audio.com/Cable/" target="_blank" rel="noopener noreferrer" className="text-primary underline">vb-audio.com/Cable</a> (free). Run as Administrator and restart your computer.</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 1.5: Set Windows default input/output (important)</h4>
                <p className="text-sm text-muted-foreground">
                  In Windows Settings → System → Sound, keep <strong>Output</strong> set to your real speakers/headset and <strong>Input</strong> set to your real microphone.
                  Do <strong>not</strong> set Windows defaults to <strong>CABLE Input</strong>/<strong>CABLE Output</strong>.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 2: Configure VoxFilter Output Routing (recommended)</h4>
                <p className="text-sm text-muted-foreground">In VoxFilter, start audio processing, then in <strong>Audio Output Routing</strong> select <strong>CABLE Input (VB-Audio Virtual Cable)</strong> and click <strong>Enable Audio Output</strong>. Optional: run <strong>Test Processed Audio (3s)</strong>.</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 3: Configure your call app</h4>
                <p className="text-sm text-muted-foreground">
                  In your call app's Audio settings, set <strong>Microphone</strong> to <strong>CABLE Output (VB-Audio Virtual Cable)</strong>. Keep <strong>Speaker</strong> as your headphones/speakers (not the cable).
                  In RingCentral, turn off <strong>Automatically adjust my mic level</strong> and <strong>Remove my background noise</strong> to avoid conflicting processing.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 4: Configure VoxFilter</h4>
                <p className="text-sm text-muted-foreground">Select your physical microphone, click <strong>Start Audio Processing</strong>, then ensure Output Routing shows <strong>Virtual: Active</strong> and <strong>Call app ready: YES</strong>.</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-md p-4 text-xs font-mono text-muted-foreground space-y-1">
              <p>Your Physical Mic</p>
              <p className="pl-4">{"-> VoxFilter (Chrome) - processes audio"}</p>
              <p className="pl-8">{"-> CABLE Input (VB-Audio) - virtual cable output"}</p>
              <p className="pl-12">{"-> CABLE Output (VB-Audio) - virtual mic"}</p>
              <p className="pl-16">{"-> Your call app (RingCentral/Zoom/Teams/etc)"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Mac Setup (BlackHole)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">Step 1: Install BlackHole</h4>
                <p className="text-sm text-muted-foreground">Download from <a href="https://existential.audio/blackhole/" target="_blank" rel="noopener noreferrer" className="text-primary underline">existential.audio/blackhole</a> (free). Allow the extension in System Preferences if prompted.</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 2: Configure VoxFilter Output Routing (recommended)</h4>
                <p className="text-sm text-muted-foreground">In VoxFilter, start audio processing, then in <strong>Audio Output Routing</strong> select <strong>BlackHole 2ch</strong> and click <strong>Enable Audio Output</strong>. Optional: run <strong>Test Processed Audio (3s)</strong>.</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 3: Configure your call app</h4>
                <p className="text-sm text-muted-foreground">In your call app's Audio settings, set <strong>Microphone</strong> to <strong>BlackHole 2ch</strong>. Keep <strong>Speaker</strong> as your headphones/speakers.</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Step 4: Configure VoxFilter</h4>
                <p className="text-sm text-muted-foreground">Select your physical microphone, start audio processing, then ensure Output Routing shows <strong>Virtual: Active</strong> and <strong>Call app ready: YES</strong>.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={AlertTriangle} title="Troubleshooting" id="troubleshooting" />
        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="mic-denied">
                <AccordionTrigger className="text-sm" data-testid="accordion-mic-denied">Microphone access denied</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Click the lock/info icon in your browser address bar, find "Microphone" permission, set to "Allow", and refresh the page.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="no-audio">
                <AccordionTrigger className="text-sm" data-testid="accordion-no-audio">No audio input detected</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Check your microphone is plugged in, verify it works in other apps, select the correct device in Audio Device settings, and check Input Gain is above 0%.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="distorted">
                <AccordionTrigger className="text-sm" data-testid="accordion-distorted">Audio sounds distorted</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Reduce Input Gain to 100% or below, lower Noise Reduction intensity, reduce Clarity Boost, and disable Volume Normalization temporarily.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="latency">
                <AccordionTrigger className="text-sm" data-testid="accordion-latency">High latency</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Close other browser tabs, disable browser extensions, use Chrome for best performance, and check for CPU-intensive applications running.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="rc-no-audio">
                <AccordionTrigger className="text-sm" data-testid="accordion-rc-no-audio">Call app shows no audio input</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Make sure you clicked <strong>Enable Audio Output</strong> in VoxFilter and selected a virtual cable device (VB-Audio / BlackHole). Verify Output Routing shows <strong>Virtual: Active</strong> and <strong>Call app ready: YES</strong>. Restart your call app after changing its microphone device.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="no-hear">
                <AccordionTrigger className="text-sm" data-testid="accordion-no-hear">Can't hear my own voice or callers</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Use headphones to avoid feedback loops. In your call app, keep <strong>Speaker</strong> set to your headphones/speakers (not the virtual cable). Only the <strong>Microphone</strong> should be set to the virtual cable.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="unnatural">
                <AccordionTrigger className="text-sm" data-testid="accordion-unnatural">Voice preset sounds unnatural</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Start with "Neutral" or "Professional". Make gradual adjustments to Pitch and Formant. Use presets as starting points, then fine-tune. Lower Formant Shift if voice sounds robotic.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <SectionHeading icon={HelpCircle} title="Frequently Asked Questions" id="faq" />
        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="recording">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-recording">Does VoxFilter record my calls?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Only when you explicitly click the Record button. Recordings download directly to your computer - they are not stored on any server.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="manager">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-manager">Can my manager hear my audio?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">No. Admins can see your settings and status but cannot listen to your audio.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="sound-different">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-sound">Will I sound like a different person?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">No. VoxFilter enhances your natural voice; it doesn't replace it. Think of it as professional audio polish.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="detect">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-detect">Can customers tell I'm using voice modification?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">When used moderately, modifications sound natural and professional. Stay within reasonable pitch and formant ranges.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="best-preset">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-best-preset">Which preset is best for sales calls?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">"Professional" or "Confident" for most B2B calls. "Friendly" or "Energetic" for B2C outreach.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="why-virtual-cable">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-virtual-cable">Why can't VoxFilter output directly to my call app?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Browser security prevents creating virtual audio devices. A virtual audio cable bridges the gap between the browser and desktop apps.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="data-privacy">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-privacy">Is my audio data sent to any servers?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">No. All audio processing happens locally in your browser. Only settings and status sync with the server.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="onboard">
                <AccordionTrigger className="text-sm" data-testid="accordion-faq-onboard">How do I onboard 50 agents quickly?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Create standard Team Presets, then share the link. Agents register themselves and apply team presets.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <Separator />
      <p className="text-xs text-muted-foreground text-center pb-8">
        VoxFilter {typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__ ? `v${__APP_VERSION__}` : "v1.0.4"} - Audio Processing for Sales Teams
      </p>
    </div>
  );
}
