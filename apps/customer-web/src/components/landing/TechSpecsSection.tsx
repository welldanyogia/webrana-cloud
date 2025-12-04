import { Cpu, Network, ShieldCheck, HardDrive, Zap, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TechSpecsSection() {
  const specs = [
    {
      icon: Cpu,
      title: 'High Performance CPU',
      description: 'Powered by latest generation Intel Xeon & AMD EPYC processors.',
      detail: 'Up to 3.5GHz Turbo'
    },
    {
      icon: HardDrive,
      title: 'NVMe SSD Storage',
      description: 'Enterprise-grade NVMe storage for lightning fast I/O operations.',
      detail: '10x Faster than SATA'
    },
    {
      icon: Network,
      title: 'Global Network',
      description: 'Premium Tier-1 bandwidth with up to 10Gbps port speed.',
      detail: 'Low Latency'
    },
    {
      icon: ShieldCheck,
      title: 'DDoS Protection',
      description: 'Always-on mitigation against volumetric attacks layer 3 & 4.',
      detail: 'Included Free'
    },
    {
      icon: Zap,
      title: 'Instant Provisioning',
      description: 'Automated system deploys your instance in under 60 seconds.',
      detail: 'Ready in <1m'
    },
     {
      icon: Server,
      title: 'KVM Virtualization',
      description: 'Dedicated resources with Kernel-based Virtual Machine technology.',
      detail: 'Full Isolation'
    },
  ];

  return (
    <section className="py-24 bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Spesifikasi Teknis Kelas Enterprise
          </h2>
          <p className="text-muted-foreground">
            Hardware premium untuk menjamin performa aplikasi Anda.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((spec, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <spec.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">{spec.title}</CardTitle>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {spec.detail}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {spec.description}
                    </p>
                </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
