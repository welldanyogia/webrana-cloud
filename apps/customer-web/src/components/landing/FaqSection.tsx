import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FaqSection() {
  const faqs = [
    {
      question: "Apakah server ini berlokasi di Indonesia?",
      answer: "Ya, seluruh armada server kami berlokasi di Jakarta (Tier 3 & 4 Data Center) untuk menjamin latensi terendah bagi pengguna lokal.",
    },
    {
      question: "Metode pembayaran apa saja yang diterima?",
      answer: "Kami menerima QRIS (GoPay, OVO, Dana), Virtual Account Bank (BCA, Mandiri, BNI, BRI), dan pembayaran via Minimarket. Tanpa kartu kredit.",
    },
    {
      question: "Apakah saya mendapatkan akses root?",
      answer: "Tentu saja. Anda mendapatkan akses root penuh (SSH) ke VPS Anda. Anda bebas menginstall software apapun, seperti Docker, Node.js, PHP, dll.",
    },
    {
      question: "Bagaimana dengan refund?",
      answer: "Kami menawarkan garansi uang kembali 7 hari jika layanan kami tidak sesuai dengan ekspektasi Anda. Syarat dan ketentuan berlaku.",
    },
    {
      question: "Apakah bisa upgrade paket?",
      answer: "Ya, Anda bisa melakukan upgrade resource (CPU, RAM, Storage) kapan saja melalui dashboard tanpa install ulang OS.",
    },
  ];

  return (
    <section className="py-24 bg-background border-t border-border" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Pertanyaan Umum
          </h2>
          <p className="text-muted-foreground">
            Jawaban untuk pertanyaan yang sering diajukan.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
