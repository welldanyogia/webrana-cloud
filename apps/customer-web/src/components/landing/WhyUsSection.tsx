import { Terminal, Sliders, Activity, Disc, Code } from 'lucide-react';
import { TerminalDemo } from './TerminalDemo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WhyUsSection() {
  const features = [
    {
      icon: Terminal,
      title: 'Akses Root Penuh',
      description: 'Kendali total via SSH. Install software apa saja tanpa batasan access level.',
      colSpan: "lg:col-span-2"
    },
    {
      icon: Sliders,
      title: 'Control Panel Modern',
      description: 'Manage server (Start, Stop, Restart, Reinstall) semudah klik tombol.',
    },
    {
      icon: Activity,
      title: 'Monitoring Real-time',
      description: 'Pantau penggunaan CPU, RAM, dan Disk langsung dari dashboard.',
    },
    {
      icon: Disc,
      title: 'Pilihan OS Lengkap',
      description: 'Ubuntu, Debian, CentOS, Rocky Linux, AlmaLinux.',
      colSpan: "lg:col-span-2"
    },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] -z-10" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-brand/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Code className="w-4 h-4" />
                <span>Developer First</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Dibuat oleh Developer, <br className="hidden md:block" />untuk Developer
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Kami memahami kebutuhan Anda akan fleksibilitas dan kontrol penuh. 
              Platform kami dirancang untuk memaksimalkan produktivitas coding Anda.
            </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Bento Grid Features */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={feature.colSpan || ""}
              >
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Right: Terminal Demo */}
          <div className="lg:col-span-5 sticky top-24">
             <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-brand rounded-xl blur opacity-20" />
                <TerminalDemo />
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
