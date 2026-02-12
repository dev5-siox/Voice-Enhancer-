import { useLocation, Link } from "wouter";
import { Mic, Users, Settings, Activity, BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "My Controls",
    url: "/",
    icon: Mic,
    description: "Audio processing settings",
  },
  {
    title: "Team Monitor",
    url: "/admin",
    icon: Users,
    description: "View all agents",
  },
  {
    title: "User Guide",
    url: "/guide",
    icon: BookOpen,
    description: "Help & documentation",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">VoicePro</h2>
            <p className="text-xs text-muted-foreground">Audio Processing</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    tooltip={item.description}
                  >
                    <Link href={item.url} data-testid={`link-${item.url === "/" ? "dashboard" : item.url.slice(1)}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          <p>RingCentral Companion</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
