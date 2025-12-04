import { Terminal, Sliders, Activity, Disc } from 'lucide-react';

import { TerminalDemo } from './TerminalDemo';

export function WhyUsSection() {
  const points = [
    {
      icon: Terminal,
      title: 'Akses Root Penuh',
      description: 'Kendali total via SSH. Install software apa saja tanpa batasan.',
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
      description: 'Ubuntu, Debian, CentOS, Rocky Linux.',
    },
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Dibuat oleh Developer, untuk Developer
            </h2>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
              Kami memahami kebutuhan Anda akan fleksibilitas dan kontrol penuh. 
              Platform kami dirancang untuk memaksimalkan produktivitas coding Anda.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              {points.map((point, index) => (
                <div key={index} className="space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center">
                    <point.icon className="h-6 w-6 text-brand" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className="order-1 lg:order-2 relative">
             <TerminalDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
