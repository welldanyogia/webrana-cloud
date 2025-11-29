const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

const MOCK_PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MOCK_IMAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-mock' });
});

// GET /api/v1/catalog/plans/:id
app.get('/api/v1/catalog/plans/:id', (req, res) => {
  const { id } = req.params;

  if (id === MOCK_PLAN_ID) {
    return res.json({
      data: {
        id,
        name: 'Basic VPS 1vCPU 1GB',
        isActive: true,
        durationOptions: ['MONTHLY', 'ANNUAL'],
        pricings: [
          { duration: 'MONTHLY', price: 100000, currency: 'IDR' },
          { duration: 'ANNUAL', price: 1000000, currency: 'IDR' },
        ],
        allowedImageIds: [MOCK_IMAGE_ID],
      },
    });
  }

  res.status(404).json({
    error: {
      code: 'PLAN_NOT_FOUND',
      message: 'Plan tidak ditemukan',
      details: { planId: id },
    },
  });
});

// GET /api/v1/catalog/images/:id
app.get('/api/v1/catalog/images/:id', (req, res) => {
  const { id } = req.params;

  if (id === MOCK_IMAGE_ID) {
    return res.json({
      data: {
        id,
        name: 'Ubuntu 22.04 LTS',
        isActive: true,
      },
    });
  }

  res.status(404).json({
    error: {
      code: 'IMAGE_NOT_FOUND',
      message: 'Image tidak ditemukan',
      details: { imageId: id },
    },
  });
});

// POST /api/v1/catalog/coupons/validate
app.post('/api/v1/catalog/coupons/validate', (req, res) => {
  const { code, planId, basePrice } = req.body;

  if (code === 'PROMO20') {
    const discountAmount = Math.floor(basePrice * 0.2);
    const finalPrice = basePrice - discountAmount;

    return res.json({
      data: {
        code: 'PROMO20',
        planId,
        discountAmount,
        finalPrice,
        currency: 'IDR',
      },
    });
  }

  res.status(400).json({
    error: {
      code: 'INVALID_COUPON',
      message: 'Coupon tidak valid atau sudah expired',
      details: { code },
    },
  });
});

app.listen(PORT, () => {
  console.log(`Mock catalog-service listening on port ${PORT}`);
});
