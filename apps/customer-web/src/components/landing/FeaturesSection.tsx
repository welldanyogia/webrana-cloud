import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function FeaturesSection() {
  const features = [
    {
      title: 'Penyimpanan NVMe Enterprise',
      description: 'Rasakan performa I/O hingga 10x lebih cepat dibandingkan SSD biasa. Optimal untuk database, high-traffic website, dan aplikasi berat.',
      image: '/images/landing/feature-nvme.jpg',
      alt: 'Komponen NVMe SSD dengan lighting futuristik',
    },
    {
      title: 'Data Center Jakarta',
      description: 'Lokasi server di Indonesia memastikan latensi ultra-rendah dan akses super cepat untuk pengguna lokal Anda.',
      image: '/images/landing/feature-location.jpg',
      alt: 'Peta digital Indonesia dengan titik fokus di Jakarta',
    },
    {
      title: 'Instant Deploy',
      description: 'Tidak perlu menunggu manual approval. Server Anda aktif dan siap digunakan kurang dari 60 detik setelah pembayaran terverifikasi.',
      image: '/images/landing/feature-speed.jpg',
      alt: 'Ilustrasi roket 3D yang meluncur',
    },
    {
      title: 'Metode Pembayaran Lengkap',
      description: 'Mendukung pembayaran via QRIS, Virtual Account Bank, dan Minimarket. Tanpa kartu kredit.',
      image: '/images/landing/feature-payment.jpg',
      alt: 'Pembayaran QRIS dan E-wallet',
    },
  ];

  return (
    <section className="py-20 bg-muted/30" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Infrastruktur Premium, Harga Lokal
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Kami menggunakan teknologi terbaru untuk menjamin kecepatan dan stabilitas server Anda.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="overflow-hidden border-border bg-card h-full flex flex-col"
              hover={true}
              glow={true}
            >
              <div className="relative h-48 w-full bg-muted">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              </div>
              <CardHeader noBorder>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent noPadding className="px-6 pb-6 pt-0">
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
