#!/bin/bash

# Download new images for Landing Page V2

echo "Downloading V2 assets..."

# NVMe - Circuit Board / Chip
curl -L -o apps/customer-web/public/images/landing/feature-nvme.jpg "https://images.unsplash.com/photo-1558778909-2f636a6e3d7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

# Payment - QR / Terminal
curl -L -o apps/customer-web/public/images/landing/feature-payment.jpg "https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

echo "V2 Assets downloaded."
