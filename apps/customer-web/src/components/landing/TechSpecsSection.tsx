import { Cpu, Network, ShieldCheck } from 'lucide-react';

export function TechSpecsSection() {
  const specs = [
    {
      icon: Cpu,
      title: 'Virtualisasi',
      description: 'KVM (Kernel-based Virtual Machine) - Resource terjamin.',
    },
    {
      icon: Network,
      title: 'Network',
      description: '1 Gbps Port Speed, Unmetered Incoming Traffic.',
    },
    {
      icon: ShieldCheck,
      title: 'Security',
      description: 'Basic DDoS Protection included.',
    },
  ];

  return (
    <section className="py-16 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">
            Spesifikasi Teknis Detail
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
          {specs.map((spec, index) => (
            <div key={index} className="px-4 pt-8 md:pt-0 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <spec.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {spec.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {spec.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
